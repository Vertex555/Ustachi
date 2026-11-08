/**
 * Usta to'lovlari (payouts) — §7.5, §13.
 *
 * "Do not describe funds as paid out until a confirmed payout record exists."
 * Payout faqat admin tomonidan TASDIQLANGANDA "paid" bo'ladi.
 */

const mongoose = require("mongoose");

const payoutSchema = new mongoose.Schema(
  {
    master: { type: mongoose.Schema.Types.ObjectId, ref: "Master", required: true, index: true },

    periodFrom: { type: Date, required: true },
    periodTo: { type: Date, required: true },

    // Hisob-kitob
    orderCount: { type: Number, default: 0, min: 0 },
    grossMinor: { type: Number, default: 0, min: 0 }, // yig'ilgan
    commissionMinor: { type: Number, default: 0, min: 0 }, // platforma ulushi
    refundMinor: { type: Number, default: 0, min: 0 },
    netMinor: { type: Number, default: 0, min: 0 }, // usta haqqiga

    currency: { type: String, default: "UZS" },

    status: {
      type: String,
      enum: ["pending", "approved", "processing", "paid", "cancelled"],
      default: "pending",
      index: true,
    },

    // Qanday to'lov kanali (naqd, o'tkazma)
    method: { type: String, enum: ["cash", "transfer"], default: "transfer" },
    reference: { type: String, default: "" }, // tranzaksiya/CHEK raqami

    // Kim tasdiqladi
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    paidAt: { type: Date, default: null },

    // Nima uchun to'lov qilindi (majburiy — §16.5)
    reason: { type: String, default: "", maxlength: 500 },
    notes: { type: String, default: "", maxlength: 1000 },

    // Qaysi orderlar kiritilgan
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
  },
  { timestamps: true }
);

payoutSchema.index({ master: 1, createdAt: -1 });
payoutSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Payout", payoutSchema);
