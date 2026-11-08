/**
 * Markazlashgan ilova konfiguratsiyasi.
 *
 * §13: "7% komissiyani ko'p joylarda qattiq yozma" — bu yerda BITTAGA
 * konfiguratsiya qilinadi va har bir tranzaksiyada Order da snapshot
 * saqlanadi, shuning uchun keyinroq o'zgarish tarixiy hisobni buzmaydi.
 */

require("dotenv").config();

const NUM = (v, d) => (v === undefined || v === "" || Number.isNaN(Number(v)) ? d : Number(v));

const config = {
  env: process.env.NODE_ENV || "development",
  port: NUM(process.env.PORT, 5000),
  currency: "UZS",

  // --- Platforma komissiyasi -------------------------------------------
  // basis punktlarida: 700 = 7.00%, 725 = 7.25%
  commissionRateBps: NUM(process.env.COMMISSION_RATE_BPS, 700),

  // Xarid qanday asosda komissiya olinadi:
  //   "service" — faqat xizmat summasi (savdo + yetkazib berish emas)
  //   "total"   — jami summadan
  commissionBasis: process.env.COMMISSION_BASIS || "service",

  // Minimal komissiya (minor units). 0 = o'chirilgan.
  commissionMinMinor: NUM(process.env.COMMISSION_MIN_MINOR, 0),

  // --- Buyurtma ---------------------------------------------------------
  order: {
    // Bitta buyurtmada rasmlar soni
    maxPhotos: NUM(process.env.ORDER_MAX_PHOTOS, 5),
    // Bitta rasm hajmi (bayt)
    maxPhotoBytes: NUM(process.env.ORDER_MAX_PHOTO_BYTES, 8 * 1024 * 1024),
    allowedMime: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "video/mp4",
      "video/quicktime",
    ],
  },

  // --- AI ---------------------------------------------------------------
  ai: {
    enabled: !!process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    maxInputChars: NUM(process.env.AI_MAX_INPUT_CHARS, 4000),
    dailyPerUser: NUM(process.env.AI_DAILY_PER_USER, 30),
  },
};

// Ishlab chiqishdan tashqarida komissiya nolga tushmasligi kerak
if (config.commissionRateBps < 0 || config.commissionRateBps > 10_000) {
  // eslint-disable-next-line no-console
  console.warn(`[config] COMMISSION_RATE_BPS=${config.commissionRateBps} noto'g'ri, 700 ga qaytarildi`);
  config.commissionRateBps = 700;
}
if (!["service", "total"].includes(config.commissionBasis)) {
  config.commissionBasis = "service";
}

module.exports = config;
module.exports.commissionRateBps = config.commissionRateBps;
