const mongoose = require("mongoose");

const ORDER_STATUSES = ["placed", "accepted", "rejected", "in_progress", "ready", "completed"];
const DELIVERY_METHODS = ["master_pickup", "self_dropoff"];
const PAYMENT_METHODS = ["online", "cash_on_delivery", "payme", "click"];

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    master: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    device: { type: String, default: "" },
    deviceModel: { type: String, default: "" },
    issue: { type: String, default: "" },
    description: { type: String, default: "" },
    comment: { type: String, default: "" },
    price: { type: Number, default: 0, min: 0 },
    commission: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    deliveryMethod: {
      type: String,
      enum: DELIVERY_METHODS,
      default: "master_pickup",
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "cash_on_delivery",
    },
    location: { lat: Number, lng: Number },
    // Ustaning shaxsiy lokatsiyasi (qabul qilingach ko'rinadi)
    masterLocation: { lat: Number, lng: Number },
    photos: { type: [String], default: [] },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "placed",
      index: true,
    },
    rejectionReason: { type: String, default: "" },
    // Foydalanuvchi bergan reyting (0 = hali bermagan)
    rating: { type: Number, default: 0, min: 0, max: 5 },
    review: { type: String, default: "" },
    ratedAt: { type: Date, default: null },
    // Har bir tomon buyurtmani ko'rganmi (badge/notification uchun)
    userSeenAt: { type: Date, default: null },
    masterSeenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.DELIVERY_METHODS = DELIVERY_METHODS;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;