const mongoose = require("mongoose");

// To'lov yozuvlari — har bir online to'lov uchun bitta qayd
const paymentRecordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    amount: { type: Number, default: 0 },
    method: {
      type: String,
      enum: ["card", "payme", "click", "cash_on_delivery"],
      default: "card",
    },
    cardLast4: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    gatewayTxId: { type: String, default: "" },
    // Passport/real gateway qo'shilganda shu yerga havola saqlanadi
    gatewayRef: { type: String, default: "" },
    // Payme/Click holat mashinasi uchun (1=created, 2=performed, -1/-2=cancelled, 50=awaiting)
    gatewayState: { type: Number, default: null },
    gatewayMeta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

paymentRecordSchema.index({ createdAt: -1 });
paymentRecordSchema.index({ method: 1, gatewayTxId: 1 });

module.exports = mongoose.model("PaymentRecord", paymentRecordSchema);