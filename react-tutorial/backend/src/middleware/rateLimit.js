const rateLimit = require("express-rate-limit");

function makeLimiter({ windowMs, max, keyGenerator }) {
  const opts = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Juda ko'p so'rov yuborildi. Birozdan so'ng qayta urinib ko'ring.",
    },
  };
  if (keyGenerator) opts.keyGenerator = keyGenerator;
  return rateLimit(opts);
}

// Auth: 30 so'rov / 15 daqiqa
const authLimiter = makeLimiter({ windowMs: 15 * 60 * 1000, max: 30 });

// Buyurtmalar: 50 so'rov / soat
const orderLimiter = makeLimiter({ windowMs: 60 * 60 * 1000, max: 50 });

// Chat xabarlar: 60 so'rov / daqiqa
const chatLimiter = makeLimiter({ windowMs: 60 * 1000, max: 60 });

// Chat xabar yuborish: 30 so'rov / daqiqa (spam himoyasi)
const chatMessageLimiter = makeLimiter({ windowMs: 60 * 1000, max: 30 });

// Usta profil CRUD: 20 so'rov / daqiqa
const masterLimiter = makeLimiter({ windowMs: 60 * 1000, max: 20 });

// Foydalanuvchi profil: 30 so'rov / daqiqa
const userLimiter = makeLimiter({ windowMs: 60 * 1000, max: 30 });

// Saqlangan ustalar: 40 so'rov / daqiqa
const savedLimiter = makeLimiter({ windowMs: 60 * 1000, max: 40 });

module.exports = {
  authLimiter,
  orderLimiter,
  chatLimiter,
  chatMessageLimiter,
  masterLimiter,
  userLimiter,
  savedLimiter,
};
