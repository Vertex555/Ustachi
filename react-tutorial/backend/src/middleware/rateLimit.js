const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "ustachi-dev-secret-change-me";

// Aqlli kalit: avtorizatsiya qilgan foydalanuvchi o'z tartibiga ega.
// Token yo'q bo'lsa — telefon raqami (auth so'rovlari uchun), aks holda IP.
// Bu yondashuv orqali bitta internet (NAT / ofis / mobil tarmoq) orqali
// ko'p foydalanuvchi bir-birini bloklamaydi.
function userOrIpKey(req) {
  if (req.userId) return `user:${req.userId}`;
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET);
      if (payload && payload.id) return `user:${payload.id}`;
    } catch {}
  }
  return `ip:${req.ip}`;
}

function phoneOrIpKey(req) {
  const phone =
    (req.body && (req.body.phone || req.body.newPhone)) ||
    (req.query && (req.query.phone || req.query.newPhone)) ||
    "";
  if (typeof phone === "string" && /^\+?\d{9,15}$/.test(phone)) {
    return `phone:${phone.replace(/\D/g, "")}`;
  }
  return `ip:${req.ip}`;
}

function makeLimiter({ windowMs, max, keyGenerator }) {
  const opts = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    message: {
      success: false,
      message: "Juda ko'p so'rov yuborildi. Birozdan so'ng qayta urinib ko'ring.",
    },
  };
  return rateLimit(opts);
}

// Auth (login) — telefon raqami bo'yicha, har bir raqam o'z limiti bilan.
// Kod so'rov va tasdiqlash: telefon bo'yicha 20 ta / 30 daqiqa.
const sendCodeLimiter = makeLimiter({
  windowMs: 30 * 60 * 1000,
  max: 20,
  keyGenerator: phoneOrIpKey,
});

// Telegram bog'lanish holatini polling (LoginScreen har 2 soniyada so'raydi):
// alohida va saxovatli limit — boshqa auth endpointlarini noqulay qilmaslik uchun.
const telegramStatusLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 90,
  keyGenerator: phoneOrIpKey,
});

// Mehmon akkaunt yaratish: IP bo'yicha 30 ta / 15 daqiqa (deterministik kalit).
const guestLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => `ip:${req.ip}`,
});

// Buyurtma yaratish: foydalanuvchi bo'yicha 120 ta / soat (2/daqiqa — yetarli).
const orderLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 120,
  keyGenerator: userOrIpKey,
});

// Chat ro'yxati / xabarlar o'qish: foydalanuvchi bo'yicha 240 ta / daqiqa.
const chatLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 240,
  keyGenerator: userOrIpKey,
});

// Chat xabar yuborish (spam himoyasi): foydalanuvchi bo'yicha 60 ta / daqiqa.
const chatMessageLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: userOrIpKey,
});

// Usta profil + qidiruv: foydalanuvchi bo'yicha 180 ta / daqiqa.
const masterLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 180,
  keyGenerator: userOrIpKey,
});

// Foydalanuvchi profili: foydalanuvchi bo'yicha 120 ta / daqiqa.
const userLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: userOrIpKey,
});

// Saqlangan ustalar: foydalanuvchi bo'yicha 120 ta / daqiqa.
const savedLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: userOrIpKey,
});

module.exports = {
  sendCodeLimiter,
  telegramStatusLimiter,
  guestLimiter,
  orderLimiter,
  chatLimiter,
  chatMessageLimiter,
  masterLimiter,
  userLimiter,
  savedLimiter,
  userOrIpKey,
};