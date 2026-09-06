const Order = require("../models/Order");
const Master = require("../models/Master");
const Chat = require("../models/Chat");
const { emitToUser } = require("../services/socket");
const {
  serializeOrder,
  isValidOrderStatus,
  isValidDeliveryMethod,
  isValidPaymentMethod,
} = require("../utils/helpers");

const DELIVERY_FEE = 20000; // ustani uyga kelishi uchun qo'shimcha haq

function makeOrderNumber() {
  return (
    "UST-" +
    Date.now().toString(36).toUpperCase() +
    "-" +
    Math.floor(1000 + Math.random() * 9000)
  );
}

function computeTotals(master, deliveryMethod) {
  const price = Math.round(Number(master.price) || 0);
  const commission = Math.round(price * 0.07);
  const deliveryFee = deliveryMethod === "master_pickup" ? DELIVERY_FEE : 0;
  const total = price + commission + deliveryFee;
  return { price, commission, deliveryFee, total };
}

// Buyurtmalar ro'yxati
exports.list = async (req, res) => {
  if (req.query.view === "master") {
    const master = await Master.findOne({ user: req.user._id }).lean();
    if (!master) return res.json({ success: true, data: [] });
    let orders = await Order.find({ master: master._id })
      .sort({ createdAt: -1 })
      .populate("user", "phone name photo")
      .lean();
    orders = orders.map((o) => { o.master = master; return o; });
    const result = orders.map((o) => {
      const s = serializeOrder(o);
      s.seen = !!o.masterSeenAt && new Date(o.masterSeenAt).getTime() >= new Date(o.updatedAt).getTime();
      return s;
    });
    return res.json({ success: true, data: result });
  }

  let orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate("user", "phone name photo")
    .lean();
  // master id'larni katalogdan biriktiramiz
  const ids = orders.map((o) => o.master).filter(Boolean);
  if (ids.length) {
    const masters = await Master.find({ _id: { $in: ids } }).lean();
    const map = {};
    masters.forEach((m) => { map[m._id.toString()] = m; });
    orders.forEach((o) => {
      const key = String(o.master);
      if (map[key]) o.master = map[key];
    });
  }
  const result = orders.map((o) => {
    const s = serializeOrder(o);
    s.seen = !!o.userSeenAt && new Date(o.userSeenAt).getTime() >= new Date(o.updatedAt).getTime();
    return s;
  });
  res.json({ success: true, data: result });
};

// Joriy tomon barcha faol buyurtmalarni ko'rdi (badge o'chadi)
const ACTIVE_SEEN_STATUSES = ["placed", "accepted", "in_progress", "ready"];
exports.markSeen = async (req, res) => {
  const myMaster = await Master.findOne({ user: req.user._id }).lean();
  const isMaster = !!myMaster;
  const query = isMaster
    ? { master: myMaster._id, status: { $in: ACTIVE_SEEN_STATUSES } }
    : { user: req.user._id, status: { $in: ACTIVE_SEEN_STATUSES } };
  const seenKey = isMaster ? "masterSeenAt" : "userSeenAt";

  await Order.updateMany(query, { $set: { [seenKey]: new Date() } }, { timestamps: false });

  res.json({ success: true });
};

// Yangi buyurtma yaratish
exports.create = async (req, res) => {
  const masterId = String(req.body?.masterId || "");
  if (!masterId) {
    return res.status(400).json({ success: false, message: "Usta tanlanmagan (masterId kerak)" });
  }
  if (masterId.length > 50 || !/^[a-fA-F0-9]+$/.test(masterId)) {
    return res.status(400).json({ success: false, message: "Noto'g'ri usta ID" });
  }

  const master = await Master.findById(masterId);
  if (!master) {
    return res.status(404).json({ success: false, message: "Bunday usta topilmadi" });
  }

  const deliveryMethod = isValidDeliveryMethod(req.body?.deliveryMethod)
    ? req.body.deliveryMethod
    : "master_pickup";
  const paymentMethod = isValidPaymentMethod(req.body?.paymentMethod)
    ? req.body.paymentMethod
    : "cash_on_delivery";

  let location = null;
  if (req.body.userLocation) {
    try {
      const parsed = JSON.parse(req.body.userLocation);
      if (parsed && parsed.lat != null && parsed.lng != null) {
        location = { lat: Number(parsed.lat), lng: Number(parsed.lng) };
      }
    } catch { location = null; }
  }

  const { price, commission, deliveryFee, total } = computeTotals(master, deliveryMethod);

  const order = await Order.create({
    orderNumber: makeOrderNumber(),
    user: req.user._id,
    master: master._id,
    device: String(req.body.device || "").trim().slice(0, 100),
    deviceModel: String(req.body.deviceModel || "").trim().slice(0, 100),
    issue: String(req.body.issue || "").trim().slice(0, 200),
    description: String(req.body.description || "").trim().slice(0, 1000),
    comment: String(req.body.comment || "").trim().slice(0, 500),
    price,
    commission,
    deliveryFee,
    total,
    deliveryMethod,
    paymentMethod,
    location,
    userSeenAt: new Date(),
    photos: (req.files || []).map((f) => "/uploads/" + f.filename),
  });

  await order.populate({ path: "user", select: "phone" });
  order.master = master;

  // Ustaga real-time bildirishnoma
  emitToUser(master.user, "order:new", {
    order: serializeOrder(order),
    message: "Yangi buyurtma keldi",
  });

  // Yaratilgan buyurtmani foydalanuvchi "ko'rgan" deb belgilaymiz (badge o'chib turadi)
  await Order.updateOne({ _id: order._id }, { $set: { userSeenAt: new Date() } }, { timestamps: false });

  // Avtomatik salom va rasmlarni (user, master) chat'iga yozamiz (bitta chat / bitta usta)
  try {
    const chat = await Chat.findOneAndUpdate(
      { user: req.user._id, master: master._id },
      { $setOnInsert: { user: req.user._id, master: master._id, messages: [], lastActivity: new Date() }, $set: { order: order._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    // Agar shu chatda hali salom bo'lmasa, qo'shamiz
    const alreadyHasGreeting = chat.messages.some((m) => m.text === "Assalomu alaykum");
    if (!alreadyHasGreeting) {
      chat.messages.push({ sender: req.user._id, text: "Assalomu alaykum", system: false });
    }
    for (const f of req.files || []) {
      chat.messages.push({ sender: req.user._id, text: "", image: "/uploads/" + f.filename, system: false });
    }
    const last = chat.messages[chat.messages.length - 1];
    chat.lastMessage = last.text || (last.image ? "[image]" : "");
    chat.lastActivity = new Date();
    await chat.save();
  } catch { /* chat xatosini bloklamaymiz */ }

  res.status(201).json({ success: true, data: serializeOrder(order) });
};

// Bitta buyurtma (ochilganda ko'rilgan deb belgilaymiz)
exports.getOne = async (req, res) => {
  let order = await Order.findById(req.params.id).populate("user", "phone name photo").lean();
  if (!order) {
    return res.status(404).json({ success: false, message: "Buyurtma topilmadi" });
  }

  const myMaster = await Master.findOne({ user: req.user._id }).lean();
  const isOwner = order.user && order.user._id.toString() === req.user._id.toString();
  const isAssignedMaster = myMaster && String(order.master) === String(myMaster._id);

  if (!isOwner && !isAssignedMaster) {
    return res.status(403).json({ success: false, message: "Ruxsat yo'q" });
  }

  // Ko'rilgan deb belgilash (badge o'chadi)
  const seenKey = isAssignedMaster ? "masterSeenAt" : "userSeenAt";
  await Order.updateOne({ _id: order._id }, { $set: { [seenKey]: new Date() } }, { timestamps: false });
  order[seenKey] = new Date();

  const m = await Master.findById(order.master).lean();
  if (m) order.master = m;

  const serialized = serializeOrder(order);
  serialized.seen = true;
  res.json({ success: true, data: serialized });
};

// Status yangilash (usta)
exports.updateStatus = async (req, res) => {
  const { status, rejectionReason } = req.body || {};
  if (!isValidOrderStatus(status)) {
    return res.status(400).json({ success: false, message: "Noto'g'ri status" });
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: "Buyurtma topilmadi" });
  }

  const myMaster = await Master.findOne({ user: req.user._id });
  if (!myMaster || myMaster._id.toString() !== order.master.toString()) {
    return res.status(403).json({ success: false, message: "Faqat usta statusni o'zgartira oladi" });
  }

  const currentIdx = Order.ORDER_STATUSES.indexOf(order.status);
  const nextIdx = Order.ORDER_STATUSES.indexOf(status);
  if (nextIdx < currentIdx) {
    return res.status(400).json({ success: false, message: "Statusni orqaga qaytarib bo'lmaydi" });
  }

  if (status === "rejected") {
    const reason = String(rejectionReason || "").trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: "Rad etish sababini kiriting" });
    }
    order.rejectionReason = reason;
  }

  if (status === "accepted" && myMaster.location && myMaster.location.lat != null) {
    order.masterLocation = { lat: myMaster.location.lat, lng: myMaster.location.lng };
  }

  order.status = status;
  const now = new Date();
  const setFields = {
    status,
    masterLocation: order.masterLocation || undefined,
    rejectionReason: order.rejectionReason || "",
    // Harakat qilgan tomon ko'rdi, qarama-qarshi tomon yangi bildirishnoma oladi
    masterSeenAt: now,
    userSeenAt: null,
    // updatedAt ni ham xuddi shu vaqtga qo'yamiz: usta o'z harakati uchun badge ko'rmaydi,
    // mijoz esa yangi statusni "ko'rilmagan" deb biladi
    updatedAt: now,
  };
  await Order.updateOne({ _id: order._id }, { $set: setFields }, { timestamps: false });

  const updated = await Order.findById(order._id).populate({ path: "user", select: "phone name photo" }).lean();
  const m = await Master.findById(order.master).lean();
  if (m) updated.master = m;

  const serialized = serializeOrder(updated);
  serialized.seen = true;
  emitToUser(updated.user._id, "order:update", { order: serialized });

  res.json({ success: true, data: serialized });
};

// Foydalanuvchi reyting beradi
exports.rate = async (req, res) => {
  const { rating, review } = req.body || {};
  const r = Math.round(Number(rating));
  if (!r || r < 1 || r > 5) {
    return res.status(400).json({ success: false, message: "Reyting 1..5 orasida" });
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: "Buyurtma topilmadi" });
  }
  if (order.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Ruxsat yo'q" });
  }
  if (order.status !== "completed") {
    return res.status(400).json({ success: false, message: "Faqat yakunlangan buyurtmaga reyting beriladi" });
  }
  if (order.rating > 0) {
    return res.status(400).json({ success: false, message: "Siz allaqachon reyting bergansiz" });
  }

  const master = await Master.findById(order.master);
  if (!master) {
    return res.status(404).json({ success: false, message: "Usta topilmadi" });
  }

  order.rating = r;
  order.review = String(review || "").trim();
  order.ratedAt = new Date();
  await order.save();

  const totalReviews = (master.reviewsCount || 0) + 1;
  const totalSum = (master.rating || 0) * (master.reviewsCount || 0) + r;
  master.rating = Math.round((totalSum / totalReviews) * 10) / 10;
  master.reviewsCount = totalReviews;
  await master.save();

  const serialized = serializeOrder(order);
  emitToUser(master.user, "master:rated", { order: serialized, rating: r });
  emitToUser(order.user._id, "order:update", { order: serialized });

  res.json({ success: true, data: serialized });
};

// Jonli lokatsiya yangilash
exports.updateLocation = async (req, res) => {
  const { lat, lng } = req.body || {};
  if (lat == null || lng == null || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
    return res.status(400).json({ success: false, message: "Noto'g'ri koordinatalar" });
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: "Buyurtma topilmadi" });
  }

  const myMaster = await Master.findOne({ user: req.user._id }).lean();
  const isMaster = myMaster && String(order.master) === String(myMaster._id);
  const isOwner = order.user.toString() === req.user._id.toString();
  if (!isMaster && !isOwner) {
    return res.status(403).json({ success: false, message: "Ruxsat yo'q" });
  }

  if (isMaster) {
    order.masterLocation = { lat: Number(lat), lng: Number(lng) };
  } else {
    order.location = { lat: Number(lat), lng: Number(lng) };
  }
  await order.save();

  // Harakat qilgan tomon o'z yozuvini ko'rgan deb belgilanadi (badge ko'rinmaydi),
  // qarama-qarshi tomon esa yangilanishni "ko'rilmagan" deb oladi
  await Order.updateOne(
    { _id: order._id },
    { $set: { [isMaster ? "masterSeenAt" : "userSeenAt"]: new Date() } },
    { timestamps: false }
  );

  // Qarama-qarshi tomonga jonli lokatsiya yuboramiz
  let target;
  if (isMaster) {
    target = order.user;
  } else {
    const peerMaster = await Master.findById(order.master).lean();
    target = peerMaster && peerMaster.user ? peerMaster.user : null;
  }
  emitToUser(target, "live:location", {
    orderId: order._id.toString(),
    lat: Number(lat),
    lng: Number(lng),
    by: isMaster ? "master" : "user",
  });

  order.master = await Master.findById(order.master).lean();
  await order.populate({ path: "user", select: "phone name photo" });
  res.json({ success: true, data: serializeOrder(order) });
};

// Foydalanuvchi buyurtmani bekor qilishi (faqat yakunlanmagan buyurtmalar)
exports.cancel = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: "Buyurtma topilmadi" });
  }

  // Faqat buyurtma egasi bekor qila oladi
  if (order.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Ruxsat yo'q" });
  }

  // Yakunlangan yoki rad etilgan buyurtmani bekor qilib bo'lmaydi
  if (order.status === "completed" || order.status === "rejected") {
    return res.status(400).json({ success: false, message: "Bu buyurtmani bekor qilib bo'lmaydi" });
  }

  order.status = "rejected";
  order.rejectionReason = req.body?.reason || "Foydalanuvchi tomonidan bekor qilindi";
  order.userSeenAt = new Date();
  order.masterSeenAt = null;
  await order.save();

  const myMaster = await Master.findOne({ _id: order.master }).lean();
  order.master = myMaster;
  await order.populate({ path: "user", select: "phone name photo" });

  const serialized = serializeOrder(order);
  if (myMaster && myMaster.user) {
    emitToUser(myMaster.user, "order:update", { order: serialized });
  }

  res.json({ success: true, data: serialized });
};
