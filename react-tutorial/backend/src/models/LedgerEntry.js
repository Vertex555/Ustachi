/**
 * Moliyaviy ledger — §13 "Transaction ledger / Commission history".
 *
 * Bu ledger "qaysi summa qayerdan keldi" izini saqlaydi. Order o'zi
 * o'chirilsa ham ledger qoladi (audit uchun).
 *
 * Barcha summalar minor units (tiyin).
 */

const mongoose = require("mongoose");

const ledgerSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    orderNumber: { type: String, required: true, index: true },

    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    master: { type: mongoose.Schema.Types.ObjectId, ref: "Master", default: null, index: true },

    type: {
      type: String,
      enum: ["commission", "payout", "refund", "adjustment"],
      required: true,
      index: true,
    },

    // Stavka snapshot — §13
    rateBps: { type: Number, default: 700, min: 0, max: 10000 },
    basis: { type: String, enum: ["service", "total"], default: "service" },

    // Baza summalar
    serviceMinor: { type: Number, default: 0 },
    feesMinor: { type: Number, default: 0 },
    grossMinor: { type: Number, default: 0 },

    // commission/payout uchun ijobiy, refund uchun manfiy
    amountMinor: { type: Number, required: true },
    // Ustaga tegadigan summa
    netMinor: { type: Number, default: 0 },

    currency: { type: String, default: "UZS" },

    // Provider izi (maxfiy kalitlar QAYD ETILMAYDI)
    txId: { type: String, default: "", index: true },
    gateway: { type: String, default: "" },

    // Kim o'zgartirdi (admin uchun)
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    note: { type: String, default: "", maxlength: 500 },

    // Idempotency: bir xil order+type+txId ikki marta yozilmasin
    dedupeKey: { type: String, default: "", index: true, sparse: true },
  },
  { timestamps: true }
);

ledgerSchema.index({ master: 1, type: 1, createdAt: -1 });
ledgerSchema.index({ createdAt: -1 });
ledgerSchema.index({ orderNumber: 1, type: 1 });

// Bir xil tranzaksiya ikki marta ledger'ga tushmasin
ledgerSchema.pre("save", async function (next) {
  if (!this.dedupeKey && this.txId && this.type === "commission") {
    this.dedupeKey = `${this.order}:${this.type}:${this.txId}`;
  }
  if (this.dedupeKey) {
    const existing = await this.constructor
      .findOne({ dedupeKey: this.dedupeKey, _id: { $ne: this._id } })
      .select("_id");
    if (existing) {
      // Takroriy yozuv — xatosiz o'tkazib yuboramiz
      return next(Object.assign(new Error("duplicate_ledger_entry"), { duplicate: true }));
    }
  }
  next();
});

module.exports = mongoose.model("LedgerEntry", ledgerSchema);
