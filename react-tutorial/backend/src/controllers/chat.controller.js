const Chat = require("../models/Chat");
const Master = require("../models/Master");
const User = require("../models/User");
const { emitToUser } = require("../services/socket");

function serializeChat(chat, peerRole) {
  const messages = (chat.messages || []).map((m) => ({
    id: m._id.toString(),
    text: m.text,
    image: m.image,
    system: !!m.system,
    senderId: m.sender ? m.sender.toString() : null,
    createdAt: m.createdAt,
  }));

  return {
    id: chat._id.toString(),
    peerId: (peerRole === "master" ? chat.user : chat.master).toString(),
    peerRole,
    lastMessage: chat.lastMessage || "",
    lastActivity: chat.lastActivity || chat.createdAt,
    orderId: chat.order ? chat.order.toString() : null,
    messages,
  };
}

function getPeerId(chat, peerRole) {
  return (peerRole === "master" ? chat.user : chat.master).toString();
}

// Joriy foydalanuvchining chat ro'yxati
exports.myChats = async (req, res) => {
  const myMaster = await Master.findOne({ user: req.user._id }).lean();
  const isMaster = !!myMaster;

  // Usta uchun: master._id ga mos chatlar; user uchun: user ga mos chatlar
  const query = isMaster ? { master: myMaster._id } : { user: req.user._id };

  let chats = await Chat.find(query).sort({ lastActivity: -1 }).lean();

  // Peer ma'lumotlarini yuklash
  const peerIds = chats.map((c) => (isMaster ? c.user : c.master));
  let peers = [];
  if (isMaster) {
    peers = await User.find({ _id: { $in: peerIds } }).lean();
  } else {
    peers = await Master.find({ _id: { $in: peerIds } }).lean();
  }
  const peerMap = {};
  peers.forEach((p) => { peerMap[p._id.toString()] = p; });

  const result = chats.map((c) => {
    const pid = getPeerId(c, isMaster ? "master" : "user");
    const peer = peerMap[pid] || {};
    const last = (c.messages && c.messages[c.messages.length - 1]) || {};
    const mySeenAt = isMaster ? c.masterSeenAt : c.userSeenAt;
    const unread = !!last.sender &&
      last.sender.toString() !== req.user._id.toString() &&
      (!mySeenAt || new Date(last.createdAt) > new Date(mySeenAt));
    return {
      id: c._id.toString(),
      peerRole: isMaster ? "master" : "user",
      peer: {
        id: pid,
        name: peer.name || peer.phone || "?",
        phone: peer.phone || "",
        rating: isMaster ? undefined : (peer.rating ?? 0),
        photo: peer.photo || null,
        avatarCh: (peer.name || peer.phone || "?").charAt(0),
      },
      lastMessage: (last.text || (last.image ? "[image]" : "")) || c.lastMessage || "",
      lastActivity: last.createdAt || c.lastActivity || c.createdAt,
      lastSenderId: last.sender ? last.sender.toString() : null,
      unread,
      orderId: c.order ? c.order.toString() : null,
    };
  });

  res.json({ success: true, data: result });
};

// Bitta thread ma'lumotlari (peer bilan yozish uchun) — master id bo'yicha topish/yangi yaratish
exports.openWithPeer = async (req, res) => {
  const { peerType, peerId } = req.params; // peerType: "master" | "user"

  const myMaster = await Master.findOne({ user: req.user._id }).lean();
  const isMaster = !!myMaster;

  // Yo'nalishga qarab, mavjud chatni topish yoki yaratish
  let user, master;
  if (peerType === "master") {
    master = await Master.findById(peerId).lean();
    if (!master) return res.status(404).json({ success: false, message: "Usta topilmadi" });
    user = req.user._id;
  } else {
    // Usta user bilan gaplashadi
    if (!isMaster) return res.status(403).json({ success: false, message: "Ruxsat yo'q" });
    user = peerId;
    master = myMaster._id;
  }

  let chat = await Chat.findOneAndUpdate(
    { user, master },
    { $setOnInsert: { user, master, messages: [], lastActivity: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  const peerRole = peerType === "master" ? "user" : "master";
  res.json({ success: true, data: serializeChat(chat, peerRole), peerType: peerType });
};

// ChatWindow'da ochilganda — ko'rilgan deb belgilaymiz va peer ma'lumotini qaytaramiz
exports.messages = async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) return res.status(404).json({ success: false, message: "Chat topilmadi" });

  const myMaster = await Master.findOne({ user: req.user._id }).lean();
  const isMaster = !!myMaster;
  const isParticipant = (chat.user && chat.user.toString() === req.user._id.toString()) ||
    (isMaster && chat.master && chat.master.toString() === String(myMaster._id));
  if (!isParticipant) return res.status(403).json({ success: false, message: "Ruxsat yo'q" });

  // O'qilgan deb belgilash
  if (isMaster) chat.masterSeenAt = new Date();
  else chat.userSeenAt = new Date();
  await chat.save();

  const data = serializeChat(chat, isMaster ? "master" : "user");

  // Peer (suhbatdosh) ma'lumoti — avatar uchun
  let peerContact = null;
  try {
    if (isMaster) {
      const p = await User.findById(chat.user).lean();
      if (p) peerContact = { id: p._id.toString(), name: p.name || p.phone || "?", phone: p.phone, photo: p.photo || null, avatarCh: (p.name || p.phone || "?").charAt(0), isGuest: !p.name };
    } else {
      const p = await Master.findById(chat.master).lean();
      if (p) peerContact = { id: p._id.toString(), name: p.name, phone: p.phone, photo: p.photo || null, avatarCh: (p.name || "M").charAt(0) };
    }
  } catch {}

  res.json({ success: true, data: { ...data, peer: peerContact } });
};

// Xabar yuborish
exports.sendMessage = async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) return res.status(404).json({ success: false, message: "Chat topilmadi" });

  const myMaster = await Master.findOne({ user: req.user._id }).lean();
  const isMaster = !!myMaster;
  const isParticipant = (chat.user && chat.user.toString() === req.user._id.toString()) ||
    (isMaster && chat.master && chat.master.toString() === String(myMaster._id));
  if (!isParticipant) return res.status(403).json({ success: false, message: "Ruxsat yo'q" });

  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ success: false, message: "Xabar bo'sh bo'lishi mumkin emas" });
  if (text.length > 2000) return res.status(400).json({ success: false, message: "Xabar juda uzun (maks. 2000 belgi)" });

  const msg = {
    sender: req.user._id,
    text,
    image: null,
    system: false,
  };
  chat.messages.push(msg);
  chat.lastMessage = text;
  chat.lastActivity = new Date();
  // Yuboruvchi o'z xabarini ko'rdi deb hisoblanadi
  if (isMaster) chat.masterSeenAt = new Date();
  else chat.userSeenAt = new Date();
  await chat.save();

  const saved = chat.messages[chat.messages.length - 1];
  // Peer = xabarni qabul qiluvchi tomonning User _id
  let peerUserId;
  if (isMaster) {
    peerUserId = chat.user;
  } else {
    // User xabar yuborganda — ustaning egasi (Master.user) xabar oladi
    const peerMaster = await Master.findById(chat.master).lean();
    peerUserId = peerMaster ? peerMaster.user : null;
  }

  const payload = {
    chatId: chat._id.toString(),
    message: {
      id: saved._id.toString(),
      text: saved.text,
      image: null,
      system: false,
      senderId: req.user._id.toString(),
      createdAt: saved.createdAt,
    },
  };
  if (peerUserId) emitToUser(peerUserId, "chat:new", payload);

  res.status(201).json({ success: true, data: payload.message });
};

// ChatsView ochilganda barcha chatlarni o'qilgan deb belgilash
exports.readAll = async (req, res) => {
  const myMaster = await Master.findOne({ user: req.user._id }).lean();
  const isMaster = !!myMaster;
  const query = isMaster ? { master: myMaster._id } : { user: req.user._id };
  const seenKey = isMaster ? "masterSeenAt" : "userSeenAt";

  await Chat.updateMany(query, { $set: { [seenKey]: new Date() } });

  res.json({ success: true });
};
