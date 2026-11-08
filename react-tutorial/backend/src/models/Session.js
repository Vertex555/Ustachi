const mongoose = require("mongoose");

// Faol sessiyalar. JWT ichiga `jti` yoziladi; shu yerga Session yozib qo'yiladi.
// Shu bilan:
//   - "Faol qurilmalar" ro'yxatini ko'rsatish mumkin;
//   - bitta qurilmani yoki barchasini bekor qilish mumkin;
//   - eski (jti'siz) tokenlar buzilmaydi — ular sessiya tekshiruvidan o'tadi.
const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    jti: { type: String, required: true, unique: true, index: true },
    sessionVersion: { type: Number, default: 0 },
    // Qurilma haqida ma'lumot (iPhone, Android, web ...)
    device: { type: String, trim: true, maxlength: 120, default: "" },
    platform: { type: String, trim: true, maxlength: 40, default: "" },
    ip: { type: String, trim: true, maxlength: 64, default: "" },
    userAgent: { type: String, trim: true, maxlength: 300, default: "" },
    createdAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

sessionSchema.index({ user: 1, revokedAt: 1, lastUsedAt: -1 });
// Muddati o'tgan sessiyalar avtomatik tozalanadi
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Token ichidagi jti bo'yicha tez izohlash
sessionSchema.statics.findActiveByJti = function findActiveByJti(jti) {
  return this.findOne({ jti, revokedAt: null });
};

module.exports = mongoose.model("Session", sessionSchema);
