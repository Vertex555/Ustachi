const User = require("../models/User");
const Master = require("../models/Master");
const Order = require("../models/Order");
const Chat = require("../models/Chat");
const Session = require("../models/Session");
const CardAccount = require("../models/CardAccount");
const PaymentRecord = require("../models/PaymentRecord");
const Feedback = require("../models/Feedback");
const { sendVerificationCode } = require("../services/telegram");
const {
  defaultPreferences,
  defaultNotifications,
  validatePreferencesPatch,
  validateNotificationsPatch,
  validateAddressInput,
  MAX_ADDRESSES,
  supportedNotificationCategories,
} = require("../utils/validation");
const { createSessionToken, requestMeta } = require("../utils/helpers");

function bad(res, message, code) {
  return res.status(400).json({
    success: false,
    message,
    ...(code ? { code } : {}),
    ...(Array.isArray(message) ? { errors: message } : {}),
  });
}

function isValidObjectId(value) {
  return /^[a-fA-F0-9]{24}$/.test(String(value || ""));
}

function preferencesPayload(user) {
  return {
    success: true,
    data: {
      preferences: defaultPreferences(user.preferences),
      notifications: defaultNotifications(user.notifications),
      supported: {
        themes: ["system", "light", "dark"],
        languages: ["uz", "ru", "en"],
        notificationCategories: supportedNotificationCategories(),
        channels: ["push"],
      },
    },
  };
}

// ------------------------------------------------ Sozlamalar (ko'rinish / til)

exports.getPreferences = async (req, res) => {
  res.json(preferencesPayload(req.user));
};

exports.updatePreferences = async (req, res) => {
  const result = validatePreferencesPatch(req.body, {
    preferences: req.user.preferences,
    notifications: req.user.notifications,
  });
  if (!result.ok) return bad(res, result.errors.join("; "), "validation_error");

  const { theme, language, fontScale, reduceMotion, notifications } = result.patch;

  if (theme !== undefined) req.user.preferences.theme = theme;
  if (language !== undefined) req.user.preferences.language = language;
  if (fontScale !== undefined) req.user.preferences.fontScale = fontScale;
  if (reduceMotion !== undefined) req.user.preferences.reduceMotion = reduceMotion;

  if (notifications) {
    // Faqat yuborilgan maydonlarni yangilaymiz — qolganlari saqlanadi
    if (notifications.channels && typeof notifications.channels.push === "boolean") {
      req.user.set("notifications.channels.push", notifications.channels.push);
    }
    Object.keys(notifications).forEach((k) => {
      if (k === "channels") return;
      req.user.set(`notifications.${k}`, notifications[k]);
    });
  }

  await req.user.save();
  res.json(preferencesPayload(req.user));
};

exports.updateNotifications = async (req, res) => {
  const result = validateNotificationsPatch(req.body, req.user.notifications);
  if (!result.ok) return bad(res, result.errors.join("; "), "validation_error");

  const value = result.value;
  if (value.channels && typeof value.channels.push === "boolean") {
    req.user.set("notifications.channels.push", value.channels.push);
  }
  Object.keys(value).forEach((k) => {
    if (k === "channels") return;
    req.user.set(`notifications.${k}`, value[k]);
  });

  await req.user.save();
  res.json({
    success: true,
    data: { notifications: defaultNotifications(req.user.notifications) },
  });
};

// ------------------------------------------------ Saqlangan manzillar

function serializeAddress(a) {
  return {
    id: a._id.toString(),
    label: a.label || "",
    line: a.line,
    city: a.city || "",
    note: a.note || "",
    lat: a.lat == null ? null : a.lat,
    lng: a.lng == null ? null : a.lng,
    isDefault: !!a.isDefault,
    createdAt: a.createdAt,
  };
}

exports.listAddresses = async (req, res) => {
  const list = await User.findById(req.user._id).select("addresses").lean();
  const addresses = (list && list.addresses ? list.addresses : [])
    .slice()
    .sort((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault));
  res.json({ success: true, data: addresses.map(serializeAddress) });
};

exports.createAddress = async (req, res) => {
  const user = req.user;
  if ((user.addresses || []).length >= MAX_ADDRESSES) {
    return res.status(409).json({
      success: false,
      message: `Kamida ${MAX_ADDRESSES} ta manzil saqlash mumkin`,
      code: "address_limit",
    });
  }

  const result = validateAddressInput(req.body);
  if (!result.ok) return bad(res, result.errors.join("; "), "validation_error");

  const value = result.value;
  const isFirst = (user.addresses || []).length === 0;
  if (value.isDefault || isFirst) {
    (user.addresses || []).forEach((a) => { a.isDefault = false; });
  }
  user.addresses.push({ ...value, isDefault: value.isDefault || isFirst });
  await user.save();

  const created = user.addresses[user.addresses.length - 1];
  res.status(201).json({ success: true, data: serializeAddress(created) });
};

exports.updateAddress = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(404).json({ success: false, message: "Manzil topilmadi" });
  }
  const result = validateAddressInput(req.body, { partial: true });
  if (!result.ok) return bad(res, result.errors.join("; "), "validation_error");

  const address = (req.user.addresses || []).id(req.params.id);
  if (!address) {
    return res.status(404).json({ success: false, message: "Manzil topilmadi" });
  }

  if (result.value.isDefault) {
    (req.user.addresses || []).forEach((a) => { a.isDefault = false; });
  }
  Object.keys(result.value).forEach((k) => {
    address.set(k, result.value[k]);
  });
  await req.user.save();
  res.json({ success: true, data: serializeAddress(address) });
};

exports.deleteAddress = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(404).json({ success: false, message: "Manzil topilmadi" });
  }
  const address = (req.user.addresses || []).id(req.params.id);
  if (!address) {
    return res.status(404).json({ success: false, message: "Manzil topilmadi" });
  }
  const wasDefault = address.isDefault;
  address.deleteOne();
  await req.user.save();

  // Default o'chirilgan bo'lsa — qolgan birini default qilamiz
  if (wasDefault && req.user.addresses.length) {
    req.user.addresses[0].isDefault = true;
    await req.user.save();
  }
  res.json({ success: true });
};

exports.setDefaultAddress = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(404).json({ success: false, message: "Manzil topilmadi" });
  }
  const address = (req.user.addresses || []).id(req.params.id);
  if (!address) {
    return res.status(404).json({ success: false, message: "Manzil topilmadi" });
  }
  (req.user.addresses || []).forEach((a) => { a.isDefault = false; });
  address.isDefault = true;
  await req.user.save();
  res.json({ success: true, data: serializeAddress(address) });
};

// ------------------------------------------------ Faol sessiyalar

function serializeSession(s, currentJti) {
  const expired = s.expiresAt && new Date(s.expiresAt).getTime() < Date.now();
  return {
    id: s.jti,
    device: s.device || s.platform || "Noma'lum qurilma",
    platform: s.platform || "",
    ip: s.ip || "",
    createdAt: s.createdAt,
    lastUsedAt: s.lastUsedAt,
    expiresAt: s.expiresAt,
    isCurrent: s.jti === currentJti,
    status: s.revokedAt ? "revoked" : expired ? "expired" : "active",
  };
}

exports.listSessions = async (req, res) => {
  const list = await Session.find({ user: req.user._id })
    .sort({ lastUsedAt: -1 })
    .limit(50)
    .lean();
  res.json({
    success: true,
    data: list.map((s) => serializeSession(s, req.sessionJti || null)),
  });
};

exports.revokeSession = async (req, res) => {
  const jti = String(req.params.id || "");
  if (!jti) return res.status(404).json({ success: false, message: "Sessiya topilmadi" });

  if (jti === req.sessionJti) {
    return res.status(400).json({
      success: false,
      message: "Joriy qurilmani bekor qilish uchun chiqish tugmasidan foydalaning",
      code: "current_session",
    });
  }

  const res1 = await Session.updateOne(
    { user: req.user._id, jti, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
  if (!res1.modifiedCount) {
    return res.status(404).json({ success: false, message: "Sessiya topilmadi" });
  }
  res.json({ success: true });
};

exports.logoutAll = async (req, res) => {
  const now = new Date();

  // 1) Joriy qurilmadan tashqari BARCHA ochiq sessiyalarni yopamiz
  await Session.updateMany(
    { user: req.user._id, revokedAt: null, jti: { $ne: req.sessionJti || "__none__" } },
    { $set: { revokedAt: now } }
  );

  // 2) Joriy token'ni ham bekor qilamiz va sessiya versiyasini oshiramiz
  //    (eski jti'siz tokenlar ham shu orqali o'chadi)
  if (req.sessionJti) {
    await Session.updateOne(
      { user: req.user._id, jti: req.sessionJti },
      { $set: { revokedAt: now } }
    );
  }
  req.user.sessionVersion = (req.user.sessionVersion || 0) + 1;
  await req.user.save();

  // 3) Foydalanuvchi chiqmasligi uchun YANGI token beramiz — boshqa
  //    qurilmalar esa o'z tokenlari bilan endi 401 oladi.
  const token = await createSessionToken(req.user, requestMeta(req));

  res.json({
    success: true,
    message: "Boshqa barcha qurilmalardan chiqildi",
    token,
    data: { sessionVersion: req.user.sessionVersion },
  });
};

// ------------------------------------------------ Hisobni o'chirish
// Autentifikatsiya parolsiz (telefon + Telegram/OTP), shuning uchun
// xavfsizlikni ta'minlash uchun o'chirishdan oldin kod bilan qayta tasdiqlanadi.

function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

async function purgeUserData(userId) {
  const master = await Master.findOne({ user: userId }).select("_id").lean();
  const masterId = master ? master._id : null;

  // To'lov va buyurtma tarixi platform hisoboti uchun SAQLANADI, lekin
  // bog'lanish uziladi (shaxsiy ma'lumot yo'qoladi). Kartalar, sessiyalar,
  // chatlar va usta profili to'liq o'chiriladi.
  await PaymentRecord.updateMany({ user: userId }, { $set: { user: null } }).catch(() => {});
  await Order.updateMany({ user: userId }, { $set: { user: null } }).catch(() => {});
  await Feedback.updateMany({ user: userId }, { $set: { user: null } }).catch(() => {});

  const chatFilter = masterId
    ? { $or: [{ user: userId }, { master: masterId }] }
    : { user: userId };
  await Chat.deleteMany(chatFilter).catch(() => {});
  if (masterId) await Master.deleteOne({ _id: masterId }).catch(() => {});

  await CardAccount.deleteMany({ user: userId }).catch(() => {});
  await Session.deleteMany({ user: userId }).catch(() => {});
  await User.deleteOne({ _id: userId }).catch(() => {});
}

exports.requestAccountDeletion = async (req, res) => {
  if (!req.user.telegramChatId && process.env.NODE_ENV === "production") {
    return res.status(400).json({
      success: false,
      message: "Telegram bog'lanmagan. Hisobni o'chirish uchun Telegram orqali tasdiqlang.",
      code: "telegram_required",
    });
  }

  const code = generateCode();
  req.user.deleteCode = code;
  req.user.deleteCodeExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
  req.user.deleteRequestedAt = new Date();
  await req.user.save();

  const payload = {
    success: true,
    message: "Tasdiqlash kodi yuborildi (5 daqiqa ichida)",
  };
  try {
    if (req.user.telegramChatId) {
      await sendVerificationCode(req.user.phone, code, req.user.telegramChatId);
    } else if (process.env.NODE_ENV !== "production") {
      payload.devCode = code;
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") payload.devCode = code;
  }
  res.json(payload);
};

exports.confirmAccountDeletion = async (req, res) => {
  const code = String(req.body?.code || "").trim();

  // `deleteCode` va `deleteCodeExpiresAt` modelda `select: false` — ular
  // authRequired orqali yuklangan user'da YO'Q. Shuning uchun alohida
  // qayta o'qib olamiz (aks holda kod hech qachon to'g'ri kelmasligi mumkin).
  const user = await User.findById(req.user._id).select("+deleteCode +deleteCodeExpiresAt");
  if (!user) {
    return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });
  }

  if (!user.deleteCode || !user.deleteCodeExpiresAt) {
    return res.status(400).json({
      success: false,
      message: "Avval tasdiqlash kodi so'rang",
    });
  }
  if (user.deleteCodeExpiresAt.getTime() < Date.now()) {
    return res.status(400).json({
      success: false,
      message: "Kod muddati o'tgan. Yangi kod so'rang.",
    });
  }
  if (String(user.deleteCode) !== code) {
    return res.status(400).json({ success: false, message: "Kod noto'g'ri!" });
  }

  await purgeUserData(user._id);

  res.json({
    success: true,
    message: "Hisobingiz va barcha ma'lumotlari o'chirildi",
  });
};

// Butun hisobni o'chirishdan oldin (UI uchun) nima o'chishini ko'rsatish
exports.deletionPreview = async (req, res) => {
  const userId = req.user._id;
  const [orders, chats, cards, sessions, master] = await Promise.all([
    Order.countDocuments({ user: userId }),
    Chat.countDocuments({ user: userId }),
    CardAccount.countDocuments({ user: userId }),
    Session.countDocuments({ user: userId, revokedAt: null }),
    Master.findOne({ user: userId }).select("isPublished").lean(),
  ]);
  res.json({
    success: true,
    data: {
      orders,
      chats,
      cards,
      sessions,
      masterProfile: !!master,
      isPublished: master ? master.isPublished !== false : false,
      codeRequested: !!req.user.deleteRequestedAt,
    },
  });
};
