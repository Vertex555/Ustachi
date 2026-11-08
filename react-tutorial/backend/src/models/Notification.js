/**
 * Ilova ichidagi bildirishnoma markazi — §11.
 *
 * Idempotency: `eventKey` orqali bir xil hodisa ikki marta yuborilmasin.
 * Masalan: "order:paid:<orderId>".
 */

const mongoose = require("mongoose");

const NOTIFICATION_TYPES = [
  "order_created",
  "order_accepted",
  "order_declined",
  "quote_received",
  "payment_confirmed",
  "payment_failed",
  "order_status",
  "new_message",
  "appointment_reminder",
  "verification_result",
  "refund_update",
  "dispute_update",
  "payout_update",
  "system",
];

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true, index: true },

    title: { type: String, default: "", maxlength: 200 },
    body: { type: String, default: "", maxlength: 1000 },

    // Havolalar
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", default: null },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    readAt: { type: Date, default: null },

    // Metadata (mahsulot ma'lumotlari EMAS — faqat kerakli kontekst)
    data: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Idempotency kaliti
    eventKey: { type: String, default: "", index: true, sparse: true },

    // Yetkazilganmi (push/socket) — §11 "Do not claim delivered unless confirmed"
    delivered: {
      channel: { type: String, enum: ["inapp", "push", "email", "sms"], default: "inapp" },
      at: { type: Date, default: null },
      providerMessageId: { type: String, default: "" },
      failed: { type: Boolean, default: false },
      error: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });

// Bir xil hodisa ikki marta yozilmasin
notificationSchema.index({ user: 1, eventKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Notification", notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
