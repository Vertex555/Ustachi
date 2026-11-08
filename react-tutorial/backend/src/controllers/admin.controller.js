const User = require("../models/User");
const Master = require("../models/Master");
const Order = require("../models/Order");
const Chat = require("../models/Chat");
const Feedback = require("../models/Feedback");
const { parsePagination, paginationMeta } = require("../utils/helpers");
const { emitToUser } = require("../services/socket");
const { sendToUser } = require("../services/push.service");

// === "Ustachi" support (admin murojaat) tizimi ===
// Admin istalgan user yoki ustaga shaxsiy xabar yozadi. Xabarlar suhbatdoshga
// "Ustachi" dasturi nomidan keladi (maxsus support user + master identifikatorlari).
const SUPPORT_PHONE = "support-ustachi";
let _supportPromise = null;

async function ensureSupportIdentity() {
  if (_supportPromise) return _supportPromise;
  _supportPromise = (async () => {
    let supportUser = await User.findOne({ phone: SUPPORT_PHONE }).lean();
    if (!supportUser) {
      supportUser = await User.create({ phone: SUPPORT_PHONE, name: "Ustachi", role: "user" });
    }
    let supportMaster = await Master.findOne({ user: supportUser._id }).lean();
    if (!supportMaster) {
      const created = await Master.create({
        user: supportUser._id,
        name: "Ustachi",
        phone: SUPPORT_PHONE,
        experience: "App",
        devices: ["app"],
      });
      supportMaster = created.toObject ? created.toObject() : created;
    }
    return { supportUser, supportMaster };
  })().catch((err) => {
    _supportPromise = null;
    throw err;
  });
  return _supportPromise;
}

function supportPeer(t) {
  const n = String((t && t.name) || "").trim();
  return {
    id: String(t._id),
    name: n || "Foydalanuvchi",
    phone: String((t && t.phone) || "").startsWith("support") ? "Ustachi" : (t && t.phone) || "",
    photo: (t && t.photo) || null,
    avatarCh: n ? n.charAt(0).toUpperCase() : "U",
  };
}

async function appendSupportMessage(chat, supportUserId, text, seenKey) {
  const msg = { sender: supportUserId, text, image: null, system: false };
  chat.messages.push(msg);
  chat.lastMessage = text;
  chat.lastActivity = new Date();
  chat[seenKey] = new Date();
  const ChatModel = require("../models/Chat");
  const MAX = ChatModel.MAX_MESSAGES_PER_CHAT || 100;
  if (chat.messages.length > MAX) chat.messages.splice(0, chat.messages.length - MAX);
  await chat.save();
  return chat.messages[chat.messages.length - 1];
}

async function notifyPeer(peerUserId, chatId, message) {
  if (!peerUserId) return;
  emitToUser(peerUserId, "chat:new", {
    chatId: chatId.toString(),
    message: {
      id: message._id.toString(),
      text: message.text,
      image: null,
      system: false,
      senderId: message.sender.toString(),
      createdAt: message.createdAt,
    },
  });
  sendToUser(
    peerUserId,
    {
      title: "Ustachi",
      body: message.text,
      data: { type: "chat", chatId: chatId.toString() },
    },
    { category: "chat" }
  );
}

// Admin -> istalgan user yoki ustaga birinchi xabar (suhbatni ochadi)
exports.supportSend = async (req, res) => {
  const { peerType, peerId, text } = req.body || {};
  const body = String(text || "").trim();
  if (!["user", "master"].includes(peerType)) {
    return res.status(400).json({ success: false, message: "peerType user yoki master bo'lishi kerak" });
  }
  if (!body) return res.status(400).json({ success: false, message: "Xabar bo'sh bo'lishi mumkin emas" });
  if (body.length > 2000) return res.status(400).json({ success: false, message: "Xabar juda uzun (maks. 2000 belgi)" });

  const { supportUser, supportMaster } = await ensureSupportIdentity();
  let chat, seenKey;
  if (peerType === "user") {
    const target = await User.findById(peerId);
    if (!target) return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });
    chat = await Chat.findOneAndUpdate(
      { user: target._id, master: supportMaster._id },
      { $setOnInsert: { user: target._id, master: supportMaster._id, messages: [], lastActivity: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    seenKey = "masterSeenAt";
  } else {
    const target = await Master.findById(peerId);
    if (!target) return res.status(404).json({ success: false, message: "Usta topilmadi" });
    chat = await Chat.findOneAndUpdate(
      { user: supportUser._id, master: target._id },
      { $setOnInsert: { user: supportUser._id, master: target._id, messages: [], lastActivity: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    seenKey = "userSeenAt";
  }

  const saved = await appendSupportMessage(chat, supportUser._id, body, seenKey);

  let peerUserId;
  if (peerType === "user") {
    peerUserId = chat.user;
  } else {
    const peerMaster = await Master.findById(chat.master).lean();
    peerUserId = peerMaster ? peerMaster.user : null;
  }
  await notifyPeer(peerUserId, chat._id, saved);

  res.status(201).json({ success: true, data: { chatId: chat._id.toString() } });
};

// Barcha murojaat suhbatlari (admin inbox)
exports.supportInbox = async (req, res) => {
  const { supportUser, supportMaster } = await ensureSupportIdentity();
  const chats = await Chat.find({
    $or: [{ user: supportUser._id }, { master: supportMaster._id }],
  }).sort({ lastActivity: -1 }).limit(200).lean();

  const userIds = [];
  const masterIds = [];
  chats.forEach((c) => {
    if (String(c.user) === String(supportUser._id)) masterIds.push(String(c.master));
    else userIds.push(String(c.user));
  });

  const [users, masters] = await Promise.all([
    User.find({ _id: { $in: userIds } }).lean(),
    Master.find({ _id: { $in: masterIds } }).lean(),
  ]);
  const umap = {};
  users.forEach((u) => { umap[String(u._id)] = u; });
  const mmap = {};
  masters.forEach((m) => { mmap[String(m._id)] = m; });

  res.json({
    success: true,
    data: chats.map((c) => {
      const isSupportUserSide = String(c.user) === String(supportUser._id);
      const peer = isSupportUserSide ? mmap[String(c.master)] : umap[String(c.user)];
      const last = (c.messages && c.messages[c.messages.length - 1]) || {};
      return {
        id: c._id.toString(),
        peerType: isSupportUserSide ? "master" : "user",
        peer: peer ? supportPeer(peer) : { id: "", name: "Noma'lum", avatarCh: "?" },
        lastMessage: (last.text || (last.image ? "[image]" : "")) || c.lastMessage || "",
        lastActivity: last.createdAt || c.lastActivity || c.createdAt,
        orderId: c.order ? c.order.toString() : null,
      };
    }),
  });
};

// Bitta murojaat suhbati xabarlari (ochishda o'qilgan deb belgilanadi)
exports.supportMessages = async (req, res) => {
  const { supportUser, supportMaster } = await ensureSupportIdentity();
  const chat = await Chat.findById(req.params.id);
  if (!chat) return res.status(404).json({ success: false, message: "Suhbat topilmadi" });

  const isSupportUserSide = String(chat.user) === String(supportUser._id);
  const isSupportMasterSide = chat.master && String(chat.master) === String(supportMaster._id);
  if (!isSupportUserSide && !isSupportMasterSide) {
    return res.status(403).json({ success: false, message: "Ruxsat yo'q" });
  }

  if (isSupportUserSide) chat.userSeenAt = new Date();
  else chat.masterSeenAt = new Date();
  await chat.save();

  let peer = null;
  if (isSupportUserSide) {
    const p = await Master.findById(chat.master).lean();
    if (p) peer = { id: String(p._id), peerType: "master", ...supportPeer(p) };
  } else {
    const p = await User.findById(chat.user).lean();
    if (p) peer = { id: String(p._id), peerType: "user", ...supportPeer(p) };
  }

  const messages = (chat.messages || []).map((m) => ({
    id: m._id.toString(),
    text: m.text,
    image: m.image,
    system: !!m.system,
    senderId: m.sender ? m.sender.toString() : null,
    fromSupport: m.sender ? String(m.sender) === String(supportUser._id) : false,
    createdAt: m.createdAt,
  }));

  res.json({
    success: true,
    data: { id: chat._id.toString(), peer, messages, orderId: chat.order ? chat.order.toString() : null },
  });
};

// Mavjud murojaat suhbatiga javob yozish
exports.supportSendMessage = async (req, res) => {
  const { supportUser, supportMaster } = await ensureSupportIdentity();
  const chat = await Chat.findById(req.params.id);
  if (!chat) return res.status(404).json({ success: false, message: "Suhbat topilmadi" });

  const isSupportUserSide = String(chat.user) === String(supportUser._id);
  const isSupportMasterSide = chat.master && String(chat.master) === String(supportMaster._id);
  if (!isSupportUserSide && !isSupportMasterSide) {
    return res.status(403).json({ success: false, message: "Ruxsat yo'q" });
  }

  const body = String((req.body && req.body.text) || "").trim();
  if (!body) return res.status(400).json({ success: false, message: "Xabar bo'sh bo'lishi mumkin emas" });
  if (body.length > 2000) return res.status(400).json({ success: false, message: "Xabar juda uzun (maks. 2000 belgi)" });

  const saved = await appendSupportMessage(chat, supportUser._id, body, isSupportUserSide ? "userSeenAt" : "masterSeenAt");

  let peerUserId = chat.user;
  if (isSupportUserSide) {
    const peerMaster = await Master.findById(chat.master).lean();
    peerUserId = peerMaster ? peerMaster.user : null;
  }
  await notifyPeer(peerUserId, chat._id, saved);

  res.status(201).json({
    success: true,
    data: {
      id: saved._id.toString(),
      text: saved.text,
      image: null,
      system: false,
      fromSupport: true,
      createdAt: saved.createdAt,
    },
  });
};

exports.ensureSupportIdentity = ensureSupportIdentity;

// Range: daily -> oxirgi 14 kun; monthly -> oxirgi 12 oy; yearly -> oxirgi 6 yil
function buildRange(range) {
  const now = new Date();
  const buckets = [];
  if (range === "monthly") {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, start: d, end: new Date(d.getFullYear(), d.getMonth() + 1, 1), label: `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}` });
    }
  } else if (range === "yearly") {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear() - i, 0, 1);
      buckets.push({ key: `${d.getFullYear()}`, start: d, end: new Date(d.getFullYear() + 1, 0, 1), label: `${d.getFullYear()}` });
    }
  } else {
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      buckets.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, start: d, end: new Date(now.getFullYear(), now.getMonth(), d.getDate() + 1), label: `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}` });
    }
  }
  return buckets;
}

function countByBuckets(buckets, docs, field = "createdAt") {
  const map = {};
  buckets.forEach((b) => { map[b.key] = 0; });
  docs.forEach((doc) => {
    const t = new Date(doc[field]);
    if (isNaN(t.getTime())) return;
    const b = buckets.find((x) => t >= x.start && t < x.end);
    if (b) map[b.key]++;
  });
  return buckets.map((b) => ({ label: b.label, count: map[b.key] || 0 }));
}

// Umumiy statistikalar (karusel kartalari uchun)
exports.overview = async (req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [
    totalUsers, totalMasters, totalOrders, totalChats,
    newUsersToday, newUsersMonth, newUsersYear,
    newMastersToday, newMastersMonth, newMastersYear,
    newOrdersToday, newOrdersMonth, newOrdersYear,
    newFeedbacks, pendingFeedbacks, bannedUsers,
  ] = await Promise.all([
    User.countDocuments(), Master.countDocuments(), Order.countDocuments(), Chat.countDocuments(),
    User.countDocuments({ createdAt: { $gte: todayStart } }),
    User.countDocuments({ createdAt: { $gte: monthStart } }),
    User.countDocuments({ createdAt: { $gte: yearStart } }),
    Master.countDocuments({ createdAt: { $gte: todayStart } }),
    Master.countDocuments({ createdAt: { $gte: monthStart } }),
    Master.countDocuments({ createdAt: { $gte: yearStart } }),
    Order.countDocuments({ createdAt: { $gte: todayStart } }),
    Order.countDocuments({ createdAt: { $gte: monthStart } }),
    Order.countDocuments({ createdAt: { $gte: yearStart } }),
    Feedback.countDocuments({ createdAt: { $gte: todayStart } }),
    Feedback.countDocuments({ status: "new" }),
    User.countDocuments({ banned: true }),
  ]);

  res.json({
    success: true,
    data: {
      totalUsers, totalMasters, totalOrders, totalChats, bannedUsers,
      users: { today: newUsersToday, month: newUsersMonth, year: newUsersYear },
      masters: { today: newMastersToday, month: newMastersMonth, year: newMastersYear },
      orders: { today: newOrdersToday, month: newOrdersMonth, year: newOrdersYear },
      feedback: { today: newFeedbacks, pending: pendingFeedbacks },
    },
  });
};

// Diagrammalar uchun vaqt ketma-ketligi
exports.series = async (req, res) => {
  const range = ["daily", "monthly", "yearly"].includes(String(req.query.range))
    ? String(req.query.range)
    : "daily";
  const buckets = buildRange(range);

  const start = buckets[0].start;
  const end = buckets[buckets.length - 1].end;

  const [users, masters, orders, chats] = await Promise.all([
    User.find({ createdAt: { $gte: start, $lt: end } }, { createdAt: 1 }).lean(),
    Master.find({ createdAt: { $gte: start, $lt: end } }, { createdAt: 1 }).lean(),
    Order.find({ createdAt: { $gte: start, $lt: end } }, { createdAt: 1, status: 1 }).lean(),
    Chat.find({ createdAt: { $gte: start, $lt: end } }, { createdAt: 1 }).lean(),
  ]);

  res.json({
    success: true,
    data: {
      range,
      users: countByBuckets(buckets, users),
      masters: countByBuckets(buckets, masters),
      orders: countByBuckets(buckets, orders),
      chats: countByBuckets(buckets, chats),
    },
  });
};

// Barcha foydalanuvchilar (admin ro'yxati)
exports.users = async (req, res) => {
  const pag = parsePagination(req.query);
  const q = String(req.query.q || "").trim();
  const search = q
    ? { $or: [{ name: { $regex: q, $options: "i" } }, { phone: { $regex: q, $options: "i" } }] }
    : {};
  const findLimit = pag.enabled ? pag.limit : 500;
  const total = pag.enabled ? await User.countDocuments(search) : 0;
  let list = await User.find(search)
    .sort({ createdAt: -1 })
    .skip(pag.skip)
    .limit(findLimit)
    .lean();

  const ids = list.map((u) => u._id);
  const masterDocs = await Master.find({ user: { $in: ids } }).lean();
  const masterMap = {};
  masterDocs.forEach((m) => { masterMap[String(m.user)] = m; });

  const orderCounts = await Order.aggregate([
    { $match: { user: { $in: ids } } },
    { $group: { _id: "$user", count: { $sum: 1 } } },
  ]);
  const countMap = {};
  orderCounts.forEach((o) => { countMap[String(o._id)] = o.count; });

  res.json({
    success: true,
    data: list.map((u) => ({
      id: u._id.toString(),
      name: u.name || "",
      phone: u.phone || "",
      role: u.role || "guest",
      photo: u.photo || null,
      banned: !!u.banned,
      bannedReason: u.bannedReason || "",
      orders: countMap[u._id.toString()] || 0,
      createdAt: u.createdAt,
      master: masterMap[String(u._id)] ? {
        id: masterMap[String(u._id)]._id.toString(),
        name: masterMap[String(u._id)].name || "",
        price: masterMap[String(u._id)].price || 0,
        rating: masterMap[String(u._id)].rating || 0,
      } : null,
    })),
    ...(pag.enabled ? { pagination: paginationMeta(pag, total) } : {}),
  });
};

// Barcha ustalar (admin ro'yxati)
exports.masters = async (req, res) => {
  const pag = parsePagination(req.query);
  const q = String(req.query.q || "").trim();
  const search = q
    ? { $or: [{ name: { $regex: q, $options: "i" } }, { phone: { $regex: q, $options: "i" } }] }
    : {};
  const findLimit = pag.enabled ? pag.limit : 500;
  const total = pag.enabled ? await Master.countDocuments(search) : 0;
  let list = await Master.find(search)
    .sort({ createdAt: -1 })
    .skip(pag.skip)
    .limit(findLimit)
    .lean();

  const userIds = list.map((m) => m.user).filter(Boolean);
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = {};
  users.forEach((u) => { userMap[u._id.toString()] = u; });

  const masterIds = list.map((m) => m._id);
  const orderCounts = await Order.aggregate([
    { $match: { master: { $in: masterIds } } },
    { $group: { _id: "$master", count: { $sum: 1 } } },
  ]);
  const countMap = {};
  orderCounts.forEach((o) => { countMap[String(o._id)] = o.count; });

  res.json({
    success: true,
    data: list.map((m) => {
      const owner = m.user ? userMap[String(m.user)] : null;
      return {
        id: m._id.toString(),
        name: m.name || "",
        phone: m.phone || "",
        price: m.price || 0,
        currency: m.currency || "uzs",
        rating: m.rating || 0,
        reviewsCount: m.reviewsCount || 0,
        devices: m.devices || [],
        experience: m.experience || "",
        workingHours: m.workingHours || "",
        location: m.location || {},
        photo: m.photo || null,
        orders: countMap[m._id.toString()] || 0,
        createdAt: m.createdAt,
        owner: owner
          ? { id: owner._id.toString(), name: owner.name || "", phone: owner.phone || "", banned: !!owner.banned }
          : null,
      };
    }),
    ...(pag.enabled ? { pagination: paginationMeta(pag, total) } : {}),
  });
};

// Foydalanuvchini bloklash / chiqarish
exports.setUserBan = async (req, res) => {
  const { banned, reason } = req.body || {};
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });
  if (user.role === "admin") return res.status(400).json({ success: false, message: "Adminni bloklab bo'lmaydi" });

  user.banned = !!banned;
  user.bannedReason = banned ? String(reason || "Admin tomonidan bloklangan").slice(0, 200) : "";
  user.bannedAt = banned ? new Date() : null;
  await user.save();

  // Usta bo'lsa, uning barcha faol buyurtmalarini ham rad etish mumkin (ixtiyoriy)
  res.json({ success: true, data: { id: user._id.toString(), banned: user.banned, bannedReason: user.bannedReason } });
};

// Usta egasini bloklash (master o'zi emas — ustaning user hisobini)
exports.setMasterBan = async (req, res) => {
  const { banned, reason } = req.body || {};
  const master = await Master.findById(req.params.id);
  if (!master) return res.status(404).json({ success: false, message: "Usta topilmadi" });

  const user = master.user ? await User.findById(master.user) : null;
  if (!user) return res.status(400).json({ success: false, message: "Usta user hisobiga bog'lanmagan" });
  if (user.role === "admin") return res.status(400).json({ success: false, message: "Adminni bloklab bo'lmaydi" });

  user.banned = !!banned;
  user.bannedReason = banned ? String(reason || "Admin tomonidan bloklangan (usta)").slice(0, 200) : "";
  user.bannedAt = banned ? new Date() : null;
  await user.save();

  res.json({ success: true, data: { id: master._id.toString(), banned: user.banned, bannedReason: user.bannedReason } });
};

// Usta verifikatsiya holatini o'zgartirish (none | pending | approved | rejected)
exports.setMasterVerification = async (req, res) => {
  const masterController = require("./master.controller");
  return masterController.setVerification(req, res);
};

module.exports = exports;