const mongoose = require("mongoose");
const { STATUSES } = require("../services/orderState");

// Eski modellarni import qilishda aylanish (circular) soddaligi uchun
const DELIVERY_METHODS = ["master_pickup", "self_dropoff"];
const PAYMENT_METHODS = ["online", "cash_on_delivery", "payme", "click", "card"];
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];
const SERVICE_CATEGORIES = [
  "smartphone_tablet",
  "laptop_computer",
  "tv_monitor",
  "refrigerator_washing",
  "air_conditioner",
  "appliances_other",
  "electrical",
  "plumbing",
  "furniture",
  "other",
];
const SERVICE_METHODS = ["onsite", "workshop"];
const DISPUTE_REASONS = [
  "incomplete_work",
  "poor_service",
  "incorrect_charge",
  "missed_appointment",
  "damage_caused",
  "other",
];

/** Bitta status o'zgarishining audit yozuvi */
const statusEventSchema = new mongoose.Schema(
  {
    from: { type: String, default: "" },
    to: { type: String, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    role: { type: String, default: "" },
    note: { type: String, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

/** Master'ning narx taklifi (quote) */
const quoteSchema = new mongoose.Schema(
  {
    // Minor units (tiyin)
    priceMinor: { type: Number, required: true, min: 0 },
    note: { type: String, default: "", maxlength: 1000 },
    scheduledAt: { type: Date, default: null },
    flexible: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/** Mijoz ushlagan narx taklifi */
const disputeSchema = new mongoose.Schema(
  {
    reason: { type: String, enum: DISPUTE_REASONS, required: true },
    description: { type: String, default: "", maxlength: 4000 },
    photos: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["open", "under_review", "resolved_customer", "resolved_master", "rejected"],
      default: "open",
    },
    resolution: { type: String, default: "" },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
    openedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true },

    // Ikkala tomon ham "required" emas: customer-only order (master_pickup
    // da master keyin biriktiriladi) mumkin bo'lishi kerak.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    master: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Master",
      default: null,
      index: true,
    },

    // --- Katalog (§6.2) — UI da qattiq kodlanmaydi ---
    category: { type: String, enum: SERVICE_CATEGORIES, default: "other", index: true },
    serviceType: { type: String, default: "", trim: true, maxlength: 120 },

    device: { type: String, default: "", trim: true, maxlength: 120 },
    deviceModel: { type: String, default: "", trim: true, maxlength: 120 },
    brand: { type: String, default: "", trim: true, maxlength: 80 },
    issue: { type: String, default: "", maxlength: 200 },
    description: { type: String, default: "", maxlength: 4000 },
    comment: { type: String, default: "", maxlength: 1000 },

    // --- PULLAR: hammasi minor units (tiyin). §13 ---
    // priceMinor     — xizmat summasi
    // feesMinor      — mijozga ko'rsatiladigan qo'shimcha to'lovlar
    //                 (yetkazib berish va h.k.) — komissiyaga KIRMAYDI
    // totalMinor     — mijoz to'laydigan jami
    // commissionMinor— platforma komissiyasi
    // masterNetMinor — ustaga qoladigan summa
    priceMinor: { type: Number, default: 0, min: 0, index: true },
    feesMinor: { type: Number, default: 0, min: 0 },
    totalMinor: { type: Number, default: 0, min: 0 },
    commissionMinor: { type: Number, default: 0, min: 0 },
    masterNetMinor: { type: Number, default: 0, min: 0 },

    // §13: "Har bir buyurtmada tranzaksiya paytidagi komissiya stavkasini
    // yozib qo'ying" — konfiguratsiya o'zgarsa tarixiy hisob buzilmaydi.
    commissionRateBpsSnapshot: { type: Number, default: 700, min: 0, max: 10000 },
    commissionBasisSnapshot: { type: String, enum: ["service", "total"], default: "service" },
    currency: { type: String, default: "UZS" },

    // Eski maydonlar (backward compatibility — yangi kod ishlatmaydi)
    price: { type: Number, default: 0, min: 0 },
    commission: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },

    // --- To'lov (§12) ---
    deliveryMethod: {
      type: String,
      enum: DELIVERY_METHODS,
      default: "master_pickup",
    },
    serviceMethod: { type: String, enum: SERVICE_METHODS, default: "onsite" },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "cash_on_delivery",
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "pending",
      index: true,
    },
    payment: {
      cardId: { type: mongoose.Schema.Types.ObjectId, default: null },
      cardLast4: { type: String, default: "" },
      gateway: { type: String, default: "" }, // card | payme | click
      txId: { type: String, default: "" },
      paidAt: { type: Date, default: null },
    },

    // §7.5: "To'lov yig'ilgan" va "payout qilingan" — boshqa narsa.
    // collectedMinor — haqiqiy to'lov webhook'i bilan tasdiqlangan
    // payoutStatus    — usta haqqiga berilganmi
    collectedMinor: { type: Number, default: 0, min: 0 },
    payoutStatus: {
      type: String,
      enum: ["not_applicable", "pending", "paid_out"],
      default: "pending",
    },
    payoutId: { type: mongoose.Schema.Types.ObjectId, ref: "Payout", default: null },

    // --- Reja ---
    preferredAt: { type: Date, default: null },
    flexibleTime: { type: Boolean, default: false },

    location: { lat: Number, lng: Number },
    addressText: { type: String, default: "", maxlength: 400 },
    masterLocation: { lat: Number, lng: Number },

    photos: { type: [String], default: [] },
    // §7.4 "before-and-after photos"
    workPhotos: { type: [String], default: [] },

    status: {
      type: String,
      enum: STATUSES,
      default: "draft",
      index: true,
    },

    quotes: { type: [quoteSchema], default: [] },
    activeQuoteIndex: { type: Number, default: -1 },

    rejectionReason: { type: String, default: "", maxlength: 1000 },
    cancellationReason: { type: String, default: "", maxlength: 1000 },

    dispute: { type: disputeSchema, default: null },

    // §8: "Order history and timeline" + "Audit history"
    history: { type: [statusEventSchema], default: [] },

    // Reyting
    rating: { type: Number, default: 0, min: 0, max: 5 },
    review: { type: String, default: "", maxlength: 2000 },
    ratedAt: { type: Date, default: null },

    userSeenAt: { type: Date, default: null },
    masterSeenAt: { type: Date, default: null },

    // Duplicate submission himoyasi (§6.3 / §8)
    idempotencyKey: { type: String, default: "", index: true, sparse: true },
    clientRequestId: { type: String, default: "", index: true, sparse: true },
  },
  { timestamps: true }
);

// --- Indekslar: tez-tez so'raladigan filtrlar ---
orderSchema.index({ user: 1, status: 1, createdAt: -1 });
orderSchema.index({ master: 1, status: 1, createdAt: -1 });
orderSchema.index({ master: 1, category: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderNumber: "text", description: "text", device: "text" });

// Mijoz bo'yicha idempotency kaliti — takroriy yuborishni oldi oladi
orderSchema.index(
  { user: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string", $gt: "" } } }
);

// Narx (major) hisoblash uchun virtual maydonlar (read-only)
orderSchema.virtual("priceMajor").get(function () {
  return (this.priceMinor || 0) / 100;
});
orderSchema.virtual("commissionMajor").get(function () {
  return (this.commissionMinor || 0) / 100;
});
orderSchema.virtual("totalMajor").get(function () {
  return (this.totalMinor || 0) / 100;
});
orderSchema.virtual("masterNetMajor").get(function () {
  return (this.masterNetMinor || 0) / 100;
});
orderSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Order", orderSchema);
module.exports.ORDER_STATUSES = STATUSES;
module.exports.SERVICE_CATEGORIES = SERVICE_CATEGORIES;
module.exports.SERVICE_METHODS = SERVICE_METHODS;
module.exports.DELIVERY_METHODS = DELIVERY_METHODS;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
module.exports.DISPUTE_REASONS = DISPUTE_REASONS;
