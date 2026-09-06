const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, trim: true, unique: true, sparse: true },
    name: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    photo: { type: String, default: null },
    savedMasters: [{ type: mongoose.Schema.Types.ObjectId, ref: "Master" }],
    role: {
      type: String,
      enum: ["user", "master", "guest"],
      default: null,
    },
    verificationCode: { type: String, select: false },
    codeExpiresAt: { type: Date, select: false },
    pendingPhone: { type: String, trim: true },
    telegramChatId: { type: String },
    telegramLinkedAt: { type: Date },
    telegramLinkToken: { type: String, select: false },
    telegramLinkTokenExpiresAt: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

module.exports = mongoose.model("User", userSchema);