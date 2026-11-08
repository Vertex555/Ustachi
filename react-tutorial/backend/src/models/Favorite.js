/**
 * Yoqimli ustalar (favorites) — §6.6, §19.
 */

const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    master: { type: mongoose.Schema.Types.ObjectId, ref: "Master", required: true, index: true },
  },
  { timestamps: true }
);

// Bitta usta faqat bir marta
favoriteSchema.index({ user: 1, master: 1 }, { unique: true });
favoriteSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Favorite", favoriteSchema);
