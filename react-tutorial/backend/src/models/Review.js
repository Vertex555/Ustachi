/**
 * Review (reyting) — §14.
 *
 * MUHIM: "Only eligible customers who completed the relevant order should be
 * allowed to submit an order review." va "Prevent duplicate reviews".
 *
 * Reyting ikki joyda saqlanadi:
 *   - bu yerda (izoh + hollik)
 *   - Master.aggregateRating (tezkor o'qish uchun)
 */

const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    orderNumber: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    master: { type: mongoose.Schema.Types.ObjectId, ref: "Master", required: true, index: true },

    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, default: "", maxlength: 2000 },

    // Ustaning javobi
    masterResponse: { type: String, default: "", maxlength: 2000 },
    masterRespondedAt: { type: Date, default: null },

    // Moderatsiya
    status: {
      type: String,
      enum: ["published", "pending", "hidden", "removed"],
      default: "published",
      index: true,
    },
    reportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    reportedCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// §14: bir order uchun bitta reyting
reviewSchema.index({ order: 1 }, { unique: true });
// Reyting hisoblari — master + holati
reviewSchema.index({ master: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
