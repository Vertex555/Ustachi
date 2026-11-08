const mongoose = require("mongoose");

// Foydalanuvchi / usta tomonidan yuborilgan taklif, shikoyat va yordam so'rovi.
// Bular admin panelga tushadi.
const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    name: { type: String, trim: true, maxlength: 120, default: "" },
    mime: { type: String, trim: true, maxlength: 60, default: "" },
    size: { type: Number, min: 0, max: 5 * 1024 * 1024, default: 0 },
  },
  { _id: false }
);

const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: { type: String, enum: ["user", "master", "guest", "admin"], default: "user" },
    type: {
      type: String,
      enum: ["suggestion", "complaint", "question", "praise", "support"],
      default: "suggestion",
    },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    contact: { type: String, default: "" },
    // Rasm ilovalari (multer orqali yuklangan, 5 MB gacha, 5 ta gacha)
    attachments: { type: [attachmentSchema], default: [] },
    // Ixtiyoriy bog'liq buyurtma (kontekst uchun)
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    status: {
      type: String,
      enum: ["new", "viewed", "answered"],
      default: "new",
    },
    adminNote: { type: String, default: "" },
  },
  { timestamps: true }
);

feedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Feedback", feedbackSchema);
