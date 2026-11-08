/**
 * Akkountni yo'q qilish (shaxsiy ma'lumotlar) — §5, §22.
 *
 * "Follow applicable data-protection requirements and minimize the personal
 * data collected." — mijoz so'rasa ma'lumotlari o'chiriladi.
 */

const mongoose = require("mongoose");

const deletionRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    reason: { type: String, default: "", maxlength: 1000 },
    reasonCode: {
      type: String,
      enum: [
        "not_using",
        "privacy",
        "found_better",
        "data_issue",
        "temporary_account",
        "other",
      ],
      default: "not_using",
    },

    // 6-soniclik tasdiqlash kodi (faqat hash saqlanadi)
    codeHash: { type: String, required: true },
    codeExpiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0, min: 0 },
    consumedAt: { type: Date, default: null },

    // Nimani o'chiramiz (preview uchun)
    snapshot: {
      orders: { type: Number, default: 0 },
      chats: { type: Number, default: 0 },
      masters: { type: Number, default: 0 },
      sessions: { type: Number, default: 0 },
      payments: { type: Number, default: 0 },
    },

    completedAt: { type: Date, default: null },
    ip: { type: String, default: "" },
  },
  { timestamps: true }
);

deletionRequestSchema.index({ user: 1, createdAt: -1 });
deletionRequestSchema.index({ codeExpiresAt: 1 }, { expireAfterSeconds: 0 });

deletionRequestSchema.statics.reasons = [
  "not_using",
  "privacy",
  "found_better",
  "data_issue",
  "temporary_account",
  "other",
];

module.exports = mongoose.model("DeletionRequest", deletionRequestSchema);
