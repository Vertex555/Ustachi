/**
 * Komissiya va moliyaviy hisob-kitob xizmati (§13).
 *
 * MUHIM QOIDALAR:
 *  1) Barcha summalar minor units (tiyin) — float arifmetikasi yo'q.
 *  2) 7% — bitta manbadan (config), ko'p joyda qattiq yozilmaydi.
 *  3) Har bir order da stavka SNAPSHOT qilinadi, shuning uchun keyinroq
 *     konfiguratsiya o'zgarsa tarixiy hisob o'zgarmaydi.
 *  4) "To'ldi" degani — faqat tasdiqlangan tranzaksiya. Pending/failed
 *     hech qachon daromad hisoblanmaydi.
 */

const config = require("../config/app");
const money = require("../utils/money");
const LedgerEntry = require("../models/LedgerEntry");

/**
 * Narxlar + komissiyani hisoblaydi.
 *
 * @param {object} input
 * @param {number} input.priceMajor  xizmat narxi (so'm, major)
 * @param {number} [input.feesMajor] mijozga qo'shimcha to'lovlar (yetkazib berish)
 * @param {number} [input.rateBps]   stavka (default — config)
 * @param {string} [input.basis]     "service" | "total"
 * @returns {{priceMinor, feesMinor, totalMinor, commissionMinor, masterNetMinor,
 *            rateBps, basis, price, commission, total, deliveryFee, masterNet}}
 */
function computeTotals(input = {}) {
  const rateBps = Number.isInteger(input.rateBps)
    ? input.rateBps
    : config.commissionRateBps;
  const basis = input.basis || config.commissionBasis;

  const priceMinor = money.priceToMinor(input.priceMajor ?? input.price, {
    field: "xizmat narxi",
    allowZero: true,
  });
  const feesMinor = money.priceToMinor(input.feesMajor ?? input.deliveryFee ?? 0, {
    field: "qo'shimcha to'lov",
    allowZero: true,
  });

  const totalMinor = priceMinor + feesMinor;

  // §13: "komissiya faqat xizmat summasidan (qo'shimcha to'lovlaridan emas)"
  const basisMinor = basis === "total" ? totalMinor : priceMinor;

  let commissionMinor = money.applyRate(basisMinor, rateBps);
  if (commissionMinor > 0 && commissionMinor < config.commissionMinMinor) {
    commissionMinor = config.commissionMinMinor;
  }
  // Komissiya hech qachon butun summadan oshmasin
  if (commissionMinor > totalMinor) commissionMinor = totalMinor;

  const masterNetMinor = totalMinor - commissionMinor;

  return {
    priceMinor,
    feesMinor,
    totalMinor,
    commissionMinor,
    masterNetMinor,
    rateBps,
    basis,
    currency: config.currency,
    // Eski (major) maydonlar — back-compat uchun
    price: money.toMajor(priceMinor),
    commission: money.toMajor(commissionMinor),
    total: money.toMajor(totalMinor),
    deliveryFee: money.toMajor(feesMinor),
    masterNet: money.toMajor(masterNetMinor),
  };
}

/**
 * To'lov tasdiqlanganda ledger yozuvini yaratadi (idempotent).
 * Faqat tasdiqlangan (verified) tranzaksiya uchun.
 */
async function recordCommission({ order, txId = "", gateway = "", verified = false }) {
  if (!verified) {
    // Tasdiqlanmagan to'lov hech qachon ledger'ga yozilmaydi.
    return null;
  }
  if (order.commissionRecordedAt) {
    // Allaqachon yozilgan — webhook qayta kelmasligi uchun qaytariladi
    return null;
  }

  const doc = await LedgerEntry.create({
    order: order._id,
    user: order.user,
    master: order.master || null,
    orderNumber: order.orderNumber,
    type: "commission",
    // Stavaning o'zi snapshot bo'lgan holda yoziladi
    rateBps: order.commissionRateBpsSnapshot,
    basis: order.commissionBasisSnapshot,
    serviceMinor: order.priceMinor,
    feesMinor: order.feesMinor,
    grossMinor: order.totalMinor,
    amountMinor: order.commissionMinor,
    netMinor: order.masterNetMinor,
    currency: order.currency,
    txId: String(txId || order.payment?.txId || ""),
    gateway: gateway || order.payment?.gateway || "",
    note: "Tasdiqlangan to'lovdan komissiya",
  });

  order.commissionRecordedAt = doc.createdAt || new Date();
  await order.save();
  return doc;
}

/**
 * Qaytarish (refund) summasini ledger'ga qaytarish yozuvi sifatida kiritadi.
 * Komissiya ham refund bo'lishi kerak — §13 "Refund adjustments".
 */
async function recordRefund({ order, amountMinor, reason = "", actor = null, txId = "" }) {
  const amount = money.assertSafe(amountMinor, "refund");
  if (amount <= 0) return null;

  const doc = await LedgerEntry.create({
    order: order._id,
    user: order.user,
    master: order.master || null,
    orderNumber: order.orderNumber,
    type: "refund",
    rateBps: order.commissionRateBpsSnapshot,
    basis: order.commissionBasisSnapshot,
    serviceMinor: order.priceMinor,
    feesMinor: order.feesMinor,
    grossMinor: order.totalMinor,
    amountMinor: -amount,
    // Refund komissiyani ham qaytaradi: usta pulni olmagan
    netMinor: amount - Math.min(amount, order.commissionMinor),
    currency: order.currency,
    txId: String(txId || ""),
    gateway: order.payment?.gateway || "",
    note: reason || "To'lov qaytarildi",
    actor,
  });
  return doc;
}

/** Buyurtma bo'yicha ledger tarixi */
async function orderLedger(orderId) {
  const entries = await LedgerEntry.find({ order: orderId }).sort({ createdAt: 1 }).lean();
  const totals = entries.reduce(
    (acc, e) => {
      acc.commission += e.amountMinor;
      acc.refund += e.type === "refund" ? Math.abs(e.amountMinor) : 0;
      return acc;
    },
    { commission: 0, refund: 0 }
  );
  return { entries, totals };
}

/** Platforma daromadi — faqat tasdiqlangan, komissiya qo'shimchasi bilan */
async function platformRevenue(filters = {}) {
  const rows = await LedgerEntry.aggregate([
    { $match: { type: "commission", ...filters } },
    { $group: { _id: null, commission: { $sum: "$amountMinor" }, count: { $sum: 1 } } },
  ]);
  const r = rows[0] || { commission: 0, count: 0 };
  return { commissionMinor: r.commission, orderCount: r.count };
}

/** Ustani har bir order uchun komissiya stavkasini qayta tiklaydi */
function rateSnapshotForOrder(order) {
  return {
    commissionRateBpsSnapshot: order.commissionRateBpsSnapshot ?? config.commissionRateBps,
    commissionBasisSnapshot: order.commissionBasisSnapshot ?? config.commissionBasis,
  };
}

module.exports = {
  computeTotals,
  recordCommission,
  recordRefund,
  orderLedger,
  platformRevenue,
  rateSnapshotForOrder,
  get rateBps() {
    return config.commissionRateBps;
  },
  get basis() {
    return config.commissionBasis;
  },
};
