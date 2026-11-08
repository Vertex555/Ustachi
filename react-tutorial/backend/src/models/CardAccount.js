const mongoose = require("mongoose");

// Foydalanuvchining kartalari (hamyon).
//
// XAVFSIZLIK: to'liq karta raqami, CVV, PIN va boshqa maxfiy ma'lumotlar
// HECH QACHON saqlanmaydi. Faqat raqamning oxirgi 4 ta belgisi, brend va
// to'lov tarmog'i saqlanadi (ular to'lovni amalga oshirmasligi uchun yetarli).
//
// `numberEnc` / `cvvEnc` maydonlari eski versiyalardan qolgan bo'lishi mumkin
// (sharhga qarang). Ular bo'sh qoldiriladi va `$unset` bilan tozalanadi.
const cardAccountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Raqamning oxirgi 4 xonasi (ko'rsatish uchun)
    last4: { type: String, required: true },
    brand: { type: String, default: "Karta" }, // Visa | Mastercard | Humo | Uzcard
    network: { type: String, default: "" },    // humo | uzcard | international
    cardName: { type: String, default: "" },   // foydalanuvchi bergan nom
    holderName: { type: String, default: "" }, // kartada yozilgan ism
    expMonth: { type: Number, required: true, min: 1, max: 12 },
    expYear: { type: Number, required: true },
    // ESKI maydonlar (deprecated) — bo'sh qoldiriladi, yangi yozuvlar yozmaydi.
    // To'liq raqam va CVV saqlanmasligi uchun `scripts/purge-card-secrets.js`
    // skripti orqali birdaniga tozalanadi.
    numberEnc: { type: String, default: "", select: false },
    cvvEnc: { type: String, default: "", select: false },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

cardAccountSchema.index({ user: 1, last4: 1 }, { unique: true });

module.exports = mongoose.model("CardAccount", cardAccountSchema);
