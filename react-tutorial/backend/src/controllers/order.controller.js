const Order = require("../models/Order");
const Master = require("../models/Master");
const Chat = require("../models/Chat");
const Review = require("../models/Review");
const Category = require("../models/Category");
const { emitToUser } = require("../services/socket");
const { sendToUser } = require("../services/push.service");
const orderState = require("../services/orderState");
const commission = require("../services/commission.service");
const notify = require("../services/notification.service");
const money = require("../utils/money");
const config = require("../config/app");
const {
  serializeOrder,
  isValidDeliveryMethod,
  isValidPaymentMethod,
  parsePagination,
  paginationMeta,
} = require("../utils/helpers");

// Yetkazib berish to'lovi — minor units (20000 = 200 so'm)
const DELIVERY_FEE_MINOR = 20000;

function makeOrderNumber() {
  return (
    "UST-" +
    Date.now().toString(36).toUpperCase() +
    "-" +
    Math.floor(1000 + Math.random() * 9000)
  );
}

/**
 * Narxlarni HISOBLAYDI (mijoz yuborgan narxni hech qachon ishlatmaydi).
 * §21: "Never trust client-supplied ... prices, commissions".
 */
function computeTotals(master, deliveryMethod) {
  // Master'ning narxi so'm (major) sifatida saqlanadi
  const priceMajor = (Number(master.price) || 0);
  const feesMajor =
    deliveryMethod === "master_pickup" ? DELIVERY_FEE_MINOR / 100 : 0;
  return commission.computeTotals({ priceMajor, feesMajor });
}

/** Statusni xavfsiz o'zgartiradi + tarixga yozadi */
async function transition(order, to, { actor = null, role = "system", note = "" } = {}) {
  const from = order.status;
  const check = orderState.canTransition(from, to);
  if (!check.ok) {
    const err = new Error(check.message);
    err.code = check.code;
    err.status = 400;
    throw err;
  }
  order.status = to;
  order.history.push({
    from,
    to,
    by: actor || undefined,
    role,
    note: String(note || "").slice(0, 500),
    at: new Date(),
  });
  return order;
}

// Buyurtmalar ro'yxati
exports.list = async (req, res) => {
  const pag = parsePagination(req.query);

  if (req.query.view === "master") {
    const master = await Master.findOne({ user: req.user._id }).lean();
    if (!master) return res.json({ success: true, data: [] });
    const orderQuery = { master: master._id };
    const total = pag.enabled
      ? await Order.countDocuments(orderQuery)
      : 0;
    let orders = await Order.find(orderQuery)
      .sort({ createdAt: -1 })
      .skip(pag.skip)
      .limit(pag.limit || 0)
      .populate("user", "phone name photo")
      .lean();
    orders = orders.map((o) => { o.master = master; return o; });
    const result = orders.map((o) => {
      const s = serializeOrder(o);
      s.seen = !!o.masterSeenAt && new Date(o.masterSeenAt).getTime() >= new Date(o.updatedAt).getTime();
      return s;
    });
    return res.json({
      success: true,
      data: result,
      ...(pag.enabled ? { pagination: paginationMeta(pag, total) } : {}),
    });
  }

  const orderQuery = { user: req.user._id };
  const total = pag.enabled ? await Order.countDocuments(orderQuery) : 0;
  let orders = await Order.find(orderQuery)
    .sort({ createdAt: -1 })
    .skip(pag.skip)
    .limit(pag.limit || 0)
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
  res.json({
    success: true,
    data: result,
    ...(pag.enabled ? { pagination: paginationMeta(pag, total) } : {}),
  });
};

// Joriy tomon barcha faol buyurtmalarni ko'rdi (badge o'chadi)
const ACTIVE_SEEN_STATUSES = [
  "submitted",
  "awaiting_master",
  "quoted",
  "accepted",
  "awaiting_payment",
  "paid",
  "in_progress",
];
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

  // §6.3 / §8: "Protection against duplicate order creation"
  const idempotencyKey = String(req.body?.idempotencyKey || "").trim().slice(0, 100);
  const clientRequestId = String(req.body?.clientRequestId || req.headers["x-request-id"] || "").trim().slice(0, 100);
  const dedupeKey = idempotencyKey || clientRequestId;
  if (dedupeKey) {
    const existing = await Order.findOne({ user: req.user._id, idempotencyKey: dedupeKey }).lean();
    if (existing) {
      // Takroriy yuborish — bir xil javobni qaytaramiz (201 emas, 200)
      return res.status(200).json({
        success: true,
        duplicate: true,
        data: serializeOrder(existing),
      });
    }
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

  // §6.2: katalog DB dan keladi, UI da hardcode emas
  const category = String(req.body?.category || "other").trim();
  let serviceType = String(req.body?.serviceType || "").trim().slice(0, 120);
  if (category) {
    const cat = await Category.findOne({ key: category, active: true }).select("services").lean();
    if (cat) {
      // "Do not require a device model for services where it is irrelevant."
      const svc = cat.services.find((s) => s.key === serviceType && s.active !== false);
      if (serviceType && !svc) {
        return res.status(400).json({
          success: false,
          message: `«${category}» kategoriyasida «${serviceType}» xizmati yo'q`,
        });
      }
    } else {
      return res.status(400).json({ success: false, message: "Noma'lom kategoriya" });
    }
  } else {
    serviceType = "";
  }

  let location = null;
  if (req.body.userLocation) {
    try {
      const parsed = JSON.parse(req.body.userLocation);
      if (parsed && parsed.lat != null && parsed.lng != null) {
        const lat = Number(parsed.lat);
        const lng = Number(parsed.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          location = { lat, lng };
        }
      }
    } catch { location = null; }
  }

  // Narx serverda HISOBLANADI — mijoz yuborgan narx butunlay e'tiborsiz qoldiriladi
  const t = computeTotals(master, deliveryMethod);

  const order = await Order.create({
    orderNumber: makeOrderNumber(),
    user: req.user._id,
    master: master._id,
    category: Order.SERVICE_CATEGORIES.includes(category) ? category : "other",
    serviceType,
    device: String(req.body.device || "").trim().slice(0, 100),
    deviceModel: String(req.body.deviceModel || "").trim().slice(0, 100),
    brand: String(req.body.brand || "").trim().slice(0, 80),
    issue: String(req.body.issue || "").trim().slice(0, 200),
    description: String(req.body.description || "").trim().slice(0, 4000),
    comment: String(req.body.comment || "").trim().slice(0, 500),
    addressText: String(req.body.addressText || "").trim().slice(0, 400),
    // Minor units
    priceMinor: t.priceMinor,
    feesMinor: t.feesMinor,
    totalMinor: t.totalMinor,
    commissionMinor: t.commissionMinor,
    masterNetMinor: t.masterNetMinor,
    // Snapshot
    commissionRateBpsSnapshot: t.rateBps,
    commissionBasisSnapshot: t.basis,
    currency: t.currency,
    // Eski maydonlar (back-compat)
    price: t.price,
    commission: t.commission,
    total: t.total,
    deliveryFee: t.deliveryFee,
    deliveryMethod,
    serviceMethod: Order.SERVICE_METHODS.includes(req.body?.serviceMethod) ? req.body.serviceMethod : "onsite",
    paymentMethod,
    preferredAt: req.body?.preferredAt ? new Date(req.body.preferredAt) : null,
    flexibleTime: !!req.body?.flexibleTime,
    location,
    // Yangi buyurtma darhol "submitted" — mijoz to'g'ridan-to'g'ri yuboradi
    status: "submitted",
    history: [
      {
        from: "",
        to: "submitted",
        by: req.user._id,
        role: "customer",
        note: "Buyurtma yaratildi",
        at: new Date(),
      },
    ],
    idempotencyKey: dedupeKey,
    clientRequestId,
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

  // Ilva ichidagi bildirishnoma + Expo push (bir xil idempotency kaliti bilan)
  notify.notifyUser({
    userId: master.user,
    type: "order_created",
    title: "Yangi buyurtma",
    body: `${order.orderNumber} — ${master.title || master.name || "Usta"}`,
    order: order._id,
    actor: req.user._id,
    eventKey: `order_created:${order._id}:${master.user}`,
  }).catch(() => {});

  // Ekspoz push — category "order" orqali sozlamaga qarab
  sendToUser(
    master.user,
    {
      title: "Yangi buyurtma",
      body: `${order.orderNumber} — ${master.title || "Usta"}`,
      data: { type: "order", orderId: order._id.toString() },
    },
    { category: "order" }
  ).catch(() => {});

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
    const MAX = require("../models/Chat").MAX_MESSAGES_PER_CHAT || 100;
    if (chat.messages.length > MAX) chat.messages.splice(0, chat.messages.length - MAX);
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

// Status yangilash — §8: faqat backend ruxsat etgan o'tishlar
exports.updateStatus = async (req, res) => {
  const { status, note } = req.body || {};

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: "Buyurtma topilmadi" });
  }

  const myMaster = await Master.findOne({ user: req.user._id });
  if (!myMaster || String(order.master) !== String(myMaster._id)) {
    return res.status(403).json({ success: false, message: "Faqat usta statusni o'zgartira oladi" });
  }

  // Harakatni rol+status bo'yicha aniqlaymiz
  const ACTION_BY_TARGET = {
    quoted: "quote",
    accepted: "accept",
    in_progress: "start",
    completed: "complete",
    cancelled: "cancel",
    disputed: "dispute",
  };
  const action = ACTION_BY_TARGET[status];
  if (!action) {
    return res.status(400).json({
      success: false,
      message: `Usta «${status}» holatiga o'ta olmaydi`,
    });
  }

  // Ustada cancel/dispute uchun alohida ruxsat yo'q —
  // bekor qilish faqat mijozda va admin'da (§15 da ko'rib chiqiladi)
  if (action === "cancel" || action === "dispute") {
    if (status === "cancelled") {
      return res.status(403).json({
        success: false,
        message: "Bekor qilishni faqat mijoz yoki admin amalga oshiradi",
      });
    }
  }

  const perm = orderState.canAct("master", action, order.status);
  if (!perm.ok) {
    return res.status(perm.code === "forbidden_action" ? 403 : 400).json({
      success: false,
      code: perm.code,
      message: perm.message,
    });
  }

  if (status === "quoted" && req.body?.quote) {
    try {
      const priceMinor = money.priceToMinor(req.body.quote.priceMajor ?? req.body.quote.price, {
        field: "taklif narxi",
        allowZero: false,
      });
      const feeMinor = order.feesMinor || 0;
      const q = commission.computeTotals({ priceMajor: money.toMajor(priceMinor), feesMajor: money.toMajor(feeMinor) });
      order.quotes.push({
        priceMinor: q.priceMinor,
        note: String(req.body.quote.note || "").slice(0, 1000),
        scheduledAt: req.body.quote.scheduledAt ? new Date(req.body.quote.scheduledAt) : null,
        flexible: !!req.body.quote.flexible,
      });
      order.activeQuoteIndex = order.quotes.length - 1;
      // Taklif berilganda narxlar yangilanadi (komissiya qayta hisoblanadi)
      order.priceMinor = q.priceMinor;
      order.totalMinor = q.totalMinor;
      order.commissionMinor = q.commissionMinor;
      order.masterNetMinor = q.masterNetMinor;
      order.commissionRateBpsSnapshot = q.rateBps;
      order.commissionBasisSnapshot = q.basis;
      order.price = q.price;
      order.commission = q.commission;
      order.total = q.total;
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }
  }

  if (myMaster.location && myMaster.location.lat != null && ["accepted", "in_progress"].includes(status)) {
    order.masterLocation = { lat: myMaster.location.lat, lng: myMaster.location.lng };
  }

  try {
    await transition(order, status, {
      actor: req.user._id,
      role: "master",
      note: String(note || "").slice(0, 500),
    });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, code: e.code, message: e.message });
  }

  const now = new Date();
  await Order.updateOne(
    { _id: order._id },
    {
      $set: {
        masterSeenAt: now,
        userSeenAt: null, // mijoz yangi statusni ko'rmagan
        updatedAt: now,
      },
    },
    { timestamps: false }
  );

  const updated = await Order.findById(order._id).populate({ path: "user", select: "phone name photo" }).lean();
  const m = await Master.findById(order.master).lean();
  if (m) updated.master = m;

  const serialized = serializeOrder(updated);
  serialized.seen = true;
  emitToUser(updated.user._id, "order:update", { order: serialized });

  const NOTIF = {
    quoted: { type: "quote_received", title: "Yangi narx taklifi", body: "Usta narx taklif qoldirdi" },
    accepted: { type: "order_accepted", title: "Buyurtma qabul qilindi", body: "Usta buyurtmani qabul qildi" },
    in_progress: { type: "order_status", title: "Ish boshlandi", body: "Usta ishlarni boshladi" },
    completed: { type: "order_status", title: "Buyurtma yakunlandi", body: "Ish tugallandi" },
  }[status];
  if (NOTIF) {
    notify
      .notifyUser({
        userId: updated.user._id,
        type: NOTIF.type,
        title: NOTIF.title,
        body: `${updated.orderNumber} — ${NOTIF.body}`,
        order: updated._id,
        eventKey: `order_${status}:${updated._id}`,
      })
      .catch(() => {});
  }

  res.json({ success: true, data: serialized });
};

// Mijoz taklifni qabul qilishi
exports.confirmQuote = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: "Buyurtma topilmadi" });
  if (String(order.user) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: "Ruxsat yo'q" });
  }
  const perm = orderState.canAct("customer", "confirm", order.status);
  if (!perm.ok) {
    return res.status(400).json({ success: false, code: perm.code, message: perm.message });
  }
  const idx = Number.isInteger(req.body?.quoteIndex) ? req.body.quoteIndex : order.activeQuoteIndex;
  if (idx < 0 || idx >= order.quotes.length) {
    return res.status(400).json({ success: false, message: "Taklif topilmadi" });
  }
  order.activeQuoteIndex = idx;
  try {
    await transition(order, "accepted", { actor: req.user._id, role: "customer", note: "Taklif qabul qilindi" });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
  await order.save();

  const m = await Master.findById(order.master).lean();
  notify.notifyUser({
    userId: m?.user,
    type: "order_accepted",
    title: "Taklif qabul qilindi",
    body: `${order.orderNumber} — mijoz narxni qabul qildi`,
    order: order._id,
    eventKey: `quote_confirmed:${order._id}`,
  }).catch(() => {});

  res.json({ success: true, data: serializeOrder(order) });
};

// Foydalanuvchi reyting beradi — §14
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
  if (String(order.user) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: "Ruxsat yo'q" });
  }
  // §14: "Only eligible customers who completed the relevant order"
  if (order.status !== "completed") {
    return res.status(400).json({ success: false, message: "Faqat yakunlangan buyurtmaga reyting beriladi" });
  }

  const master = await Master.findById(order.master);
  if (!master) {
    return res.status(404).json({ success: false, message: "Usta topilmadi" });
  }

  // §14: bitta orderga bitta reyting (unique index ham himoya qiladi)
  const already = await Review.findOne({ order: order._id }).select("_id");
  if (already || order.rating > 0) {
    return res.status(400).json({ success: false, message: "Siz allaqachon reyting bergansiz" });
  }

  order.rating = r;
  order.review = String(review || "").trim().slice(0, 2000);
  order.ratedAt = new Date();
  await order.save();

  try {
    await Review.create({
      order: order._id,
      orderNumber: order.orderNumber,
      user: order.user,
      master: order.master,
      rating: r,
      text: order.review,
    });
  } catch (e) {
    if (e.code !== 11000) throw e;
  }

  // O'rtacha reytingni FAQAT haqiqiy review'lardan qayta hisoblaymiz (§14)
  const agg = await Review.aggregate([
    { $match: { master: master._id, status: "published" } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const s = agg[0] || { avg: 0, count: 0 };
  master.rating = Math.round((s.avg || 0) * 10) / 10;
  master.reviewsCount = s.count || 0;
  await master.save();

  const serialized = serializeOrder(order);
  emitToUser(master.user, "master:rated", { order: serialized, rating: r });
  emitToUser(order.user, "order:update", { order: serialized });

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

// Foydalanuvchi buyurtmani bekor qilishi — §8 / §15
exports.cancel = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: "Buyurtma topilmadi" });
  }

  // Faqat buyurtma egasi bekor qila oladi
  if (String(order.user) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: "Ruxsat yo'q" });
  }

  const perm = orderState.canAct("customer", "cancel", order.status);
  if (!perm.ok) {
    return res.status(400).json({
      success: false,
      code: perm.code,
      message: perm.message === "«same»" ? "Bu buyurtmani bekor qilib bo'lmaydi" : perm.message,
    });
  }

  const reason = String(req.body?.reason || "").trim().slice(0, 1000);
  if (!reason) {
    return res.status(400).json({ success: false, message: "Bekor qilish sababini kiriting" });
  }

  // To'lov qabul qilingan bo'lsa — avval refund masalasi (avtomatik EMAS)
  const needsRefund = order.paymentStatus === "paid" && order.collectedMinor > 0;
  if (needsRefund) {
    return res.status(409).json({
      success: false,
      code: "refund_required",
      message:
        "To'lov qabul qilingan buyurtma. Qaytarish uchun «muammo yuborish» orqali murojaat qiling — qaytarish faqat tasdiqlangan tranzaksiya bo'yicha amalga oshiriladi.",
    });
  }

  try {
    await transition(order, "cancelled", {
      actor: req.user._id,
      role: "customer",
      note: reason,
    });
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, code: e.code, message: e.message });
  }
  order.cancellationReason = reason;
  order.rejectionReason = reason;
  order.userSeenAt = new Date();
  order.masterSeenAt = null;
  await order.save();

  const myMaster = await Master.findById(order.master).lean();
  order.master = myMaster;

  const serialized = serializeOrder(order);
  if (myMaster && myMaster.user) {
    emitToUser(myMaster.user, "order:update", { order: serialized });
    notify.notifyUser({
      userId: myMaster.user,
      type: "order_declined",
      title: "Buyurtma bekor qilindi",
      body: `${order.orderNumber} — ${reason.slice(0, 120)}`,
      order: order._id,
      eventKey: `order_cancelled:${order._id}`,
    }).catch(() => {});
  }

  res.json({ success: true, data: serialized });
};

