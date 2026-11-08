const Chat = require("../models/Chat");
const MAX_MESSAGES_PER_CHAT = Chat.MAX_MESSAGES_PER_CHAT || 100;
const Master = require("../models/Master");
const User = require("../models/User");
const { emitToUser } = require("../services/socket");
const { sendToUser } = require("../services/push.service");
const { parsePagination, paginationMeta } = require("../utils/helpers");

function isGuestPhone(phone) {
  return /^guest-/i.test(String(phone || "").trim());
}

// Suhbatdosh ismini aniqlash:
// 1) ism bo'lsa o'shani, 2) telefon bo'lsa oxirgi 4 xona bilan "Foydalanuvchi +998 ..." ko'rinishida,
// 3) bo'lmasa qat'iy yorliq
function maskPhone(phone) {
  const p = String(phone || "").trim();
  const digits = p.replace(/\D/g, "");
  if (digits.length >= 4) return `${digits.slice(0, 4)} **** ${digits.slice(-4)}`;
  if (digits.length) return `**** ${digits.slice(-4)}`;
  return "";
}

function peerNameOf(name, phone, fallback = "Foydalanuvchi") {
  const n = String(name || "").trim();
  if (n) return n;
  if (phone && !isGuestPhone(phone)) {
    return `${fallback} ${maskPhone(phone)}`;
  }
  return fallback;
}

function peerAvatarOf(name, phone) {
  const pn = String(name || "").trim();
  if (pn) return pn.charAt(0).toUpperCase();
  const p = String(phone || "");
  const digits = p.replace(/\D/g, "");
  if (digits.length) return digits.slice(-4).charAt(0) || "?";
  return "U";
}

// Joriy foydalanuvchi ma'lum bir chatda qaysi TOMONDA ekanini aniqlaymiz.
// MUHIM: bu "rol egasimi" emas, shu chatning o'z maydonlariga qarab
// (chat.user — mijoz tomoni, chat.master — usta tomoni) hisoblanadi.
// Aks holda ham Master hujjatiga ega bo'lgan mijoz o'zini suhbatdosh deb ko'radi.
function detectSide(chat, userId, myMaster) {
  if (!chat || !userId) return null;
  if (chat.user && chat.user.toString() === String(userId)) return "user";
  if (myMaster && chat.master && chat.master.toString() === String(myMaster._id)) return "master";
  return null;
}

function serializeChat(chat, callerSide, masterUserId) {
  // callerSide: joriy foydalanuvchi chatning qaysi tomonida ("master" | "user")
  const peerRole = callerSide === "master" ? "user" : "master";
  const messages = (chat.messages || []).map((m) => ({
    id: m._id.toString(),
    text: m.text,
    image: m.image,
    system: !!m.system,
    senderId: m.sender ? m.sender.toString() : null,
    senderRole:
      m.sender && masterUserId && String(m.sender) === String(masterUserId)
        ? "master"
        : "user",
    createdAt: m.createdAt,
  }));

  return {
    id: chat._id.toString(),
    peerId: (peerRole === "master" ? chat.user : chat.master).toString(),
    peerRole,
    masterUserId: masterUserId ? masterUserId.toString() : null,
    lastMessage: chat.lastMessage || "",
    lastActivity: chat.lastActivity || chat.createdAt,
    orderId: chat.order ? chat.order.toString() : null,
    messages,
  };
}

// Suhbatdosh (peer) ma'lumotini chatning qarama-qarshi tomonidan qurish
async function buildPeer(chat, callerSide) {
  try {
    if (callerSide === "master") {
      // Joriy foydalanuvchi usta tomonida -> peer = mijoz (User)
      const p = await User.findById(chat.user).lean();
      if (p) {
        return {
          id: p._id.toString(),
          name: peerNameOf(p.name, p.phone, "Foydalanuvchi"),
          phone: p.phone || "",
          role: "user",
          photo: p.photo || null,
          avatarCh: peerAvatarOf(p.name, p.phone),
          isGuest: isGuestPhone(p.phone),
        };
      }
    } else {
      // Joriy foydalanuvchi mijoz tomonida -> peer = usta (Master)
      const p = await Master.findById(chat.master).lean();
      if (p) {
        return {
          id: p._id.toString(),
          name: p.name || "Usta",
          phone: p.phone || "",
          role: "master",
          photo: p.photo || null,
          avatarCh: (p.name || "M").charAt(0).toUpperCase(),
        };
      }
    }
  } catch {}
  return null;
}

// Joriy foydalanuvchining chat ro'yxati
exports.myChats = async (req, res) => {
  const pag = parsePagination(req.query);
  const myMaster = await Master.findOne({ user: req.user._id }).lean();

  // Ham Master hujjatiga ega bo'lgan hisob ham: O'Z mijoz tomoni chatlari
  // ($or) va o'zi ustalik qilgan chatlar bitta ro'yxatda chiqadi.
  const query = myMaster
    ? { $or: [{ user: req.user._id }, { master: myMaster._id }] }
    : { user: req.user._id };
  const total = pag.enabled ? await Chat.countDocuments(query) : 0;

  let chats = await Chat.find(query)
    .sort({ lastActivity: -1 })
    .skip(pag.skip)
    .limit(pag.limit || 0)
    .lean();

  // Har bir chatda joriy foydalanuvchi qaysi tomonda — peer ana shunga qarab topiladi
  const userPeerIds = chats
    .filter((c) => detectSide(c, req.user._id, myMaster) === "master")
    .map((c) => c.user);
  const masterPeerIds = chats
    .filter((c) => detectSide(c, req.user._id, myMaster) === "user")
    .map((c) => c.master);

  const userPeers = await User.find({ _id: { $in: userPeerIds } }).lean();
  const masterPeers = await Master.find({ _id: { $in: masterPeerIds } }).lean();
  const userPeerMap = {};
  userPeers.forEach((p) => { userPeerMap[p._id.toString()] = p; });
  const masterPeerMap = {};
  masterPeers.forEach((p) => { masterPeerMap[p._id.toString()] = p; });

  const result = chats.map((c) => {
    const side = detectSide(c, req.user._id, myMaster);
    const last = (c.messages && c.messages[c.messages.length - 1]) || {};
    let out = { id: c._id.toString() };
    if (side === "master") {
      // Joriy foydalanuvchi usta tomonida -> peer bu mijoz (User)
      const pid = c.user ? c.user.toString() : null;
      const peer = pid ? userPeerMap[pid] || {} : {};
      const mySeenAt = c.masterSeenAt;
      const unread = !!last.sender &&
        last.sender.toString() !== req.user._id.toString() &&
        (!mySeenAt || new Date(last.createdAt) > new Date(mySeenAt));
      Object.assign(out, {
        peerRole: "user",
        masterUserId: req.user._id.toString(),
        peer: {
          id: pid,
          name: peerNameOf(peer.name, peer.phone, "Foydalanuvchi"),
          phone: peer.phone || "",
          role: "user",
          photo: peer.photo || null,
          avatarCh: peerAvatarOf(peer.name, peer.phone),
        },
        unread,
      });
    } else {
      // Joriy foydalanuvchi mijoz tomonida -> peer bu usta (Master)
      const pid = c.master ? c.master.toString() : null;
      const peer = pid ? masterPeerMap[pid] || {} : {};
      const mySeenAt = c.userSeenAt;
      const unread = !!last.sender &&
        last.sender.toString() !== req.user._id.toString() &&
        (!mySeenAt || new Date(last.createdAt) > new Date(mySeenAt));
      Object.assign(out, {
        peerRole: "master",
        masterUserId: peer.user ? peer.user.toString() : null,
        peer: {
          id: pid,
          name: peerNameOf(peer.name, peer.phone, "Usta"),
          phone: peer.phone || "",
          role: "master",
          rating: peer.rating ?? 0,
          photo: peer.photo || null,
          avatarCh: peerAvatarOf(peer.name, peer.phone),
        },
        unread,
      });
    }
    Object.assign(out, {
      lastMessage: (last.text || (last.image ? "[image]" : "")) || c.lastMessage || "",
      lastActivity: last.createdAt || c.lastActivity || c.createdAt,
      lastSenderId: last.sender ? last.sender.toString() : null,
      orderId: c.order ? c.order.toString() : null,
    });
    return out;
  });

  res.json({
    success: true,
    data: result,
    ...(pag.enabled ? { pagination: paginationMeta(pag, total) } : {}),
  });
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

  // Joriy foydalanuvchi qaysi tomon: peerType="master" degani u mijoz (user side)
  const callerSide = peerType === "master" ? "user" : "master";
  // Ustaning egasi = "master" rolidagi xabarlar egasi
  const masterOwnerId = peerType === "master" ? (master && master.user ? master.user : null) : req.user._id;
  res.json({ success: true, data: serializeChat(chat, callerSide, masterOwnerId), peerType: peerType });
};

// ChatWindow'da ochilganda — ko'rilgan deb belgilaymiz va peer ma'lumotini qaytaramiz
exports.messages = async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) return res.status(404).json({ success: false, message: "Chat topilmadi" });

  const myMaster = await Master.findOne({ user: req.user._id }).lean();
  // Joriy foydalanuvchi shu chatning aynan qaysi tomonida
  const side = detectSide(chat, req.user._id, myMaster);
  if (!side) return res.status(403).json({ success: false, message: "Ruxsat yo'q" });

  // O'qilgan deb belgilash — o'z tomonimizning seen maydoni
  if (side === "master") chat.masterSeenAt = new Date();
  else chat.userSeenAt = new Date();
  await chat.save();

  // "master" rolidagi xabarlarning egasi = ustalik qilinadigan Master hujjatining User _id
  const masterOwnerId = side === "master"
    ? req.user._id
    : chat.master ? ((await Master.findById(chat.master).lean())?.user || null) : null;

  const data = serializeChat(chat, side, masterOwnerId);

  // Peer (suhbatdosh) ma'lumoti — har doim qarama-qarshi tomon
  const peerContact = await buildPeer(chat, side);

  res.json({ success: true, data: { ...data, peer: peerContact } });
};

// Xabar yuborish
exports.sendMessage = async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) return res.status(404).json({ success: false, message: "Chat topilmadi" });

  const myMaster = await Master.findOne({ user: req.user._id }).lean();
  // Joriy foydalanuvchi shu chatning qaysi tomonida
  const side = detectSide(chat, req.user._id, myMaster);
  if (!side) return res.status(403).json({ success: false, message: "Ruxsat yo'q" });

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
  // Yuboruvchi o'z xabarini o'zi ko'rdi deb hisoblanadi
  if (side === "master") chat.masterSeenAt = new Date();
  else chat.userSeenAt = new Date();
  // Zaxira nusxa chegarasi: faqat oxirgi 100 xabar saqlanadi
  if (chat.messages.length > MAX_MESSAGES_PER_CHAT) {
    chat.messages.splice(0, chat.messages.length - MAX_MESSAGES_PER_CHAT);
  }
  await chat.save();

  const saved = chat.messages[chat.messages.length - 1];
  // Peer = xabarni qabul qiluvchi tomonning User _id (ustaning egasi = Master.user)
  let peerUserId;
  if (side === "master") {
    peerUserId = chat.user;
  } else {
    // Mijoz xabar yuborganda — ustaning egasi (Master.user) xabar oladi
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
      senderRole: side === "master" ? "master" : "user",
      createdAt: saved.createdAt,
    },
  };
  if (peerUserId) emitToUser(peerUserId, "chat:new", payload);

  // Expo push bildirishnoma (app ochiq bo'lmasa ham)
  sendToUser(
    peerUserId,
    {
      title: "Yangi xabar",
      body: text,
      data: { type: "chat", chatId: chat._id.toString() },
    },
    { category: "chat" }
  );

  res.status(201).json({ success: true, data: payload.message });
};

// ChatsView ochilganda barcha chatlarni o'qilgan deb belgilash
exports.readAll = async (req, res) => {
  const myMaster = await Master.findOne({ user: req.user._id }).lean();
  const query = myMaster
    ? { $or: [{ user: req.user._id }, { master: myMaster._id }] }
    : { user: req.user._id };

  const chats = await Chat.find(query);
  for (const chat of chats) {
    if (detectSide(chat, req.user._id, myMaster) === "master") chat.masterSeenAt = new Date();
    else chat.userSeenAt = new Date();
  }
  if (chats.length) await Promise.all(chats.map((c) => c.save()));

  res.json({ success: true });
};
