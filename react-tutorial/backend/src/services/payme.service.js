// Payme to'lov provayderi bilan ishlash (JSON-RPC protokol).
// Hujjatlar: https://developer.help.paycom.uz/
const crypto = require("crypto");

const PAYME_MERCHANT_ID = process.env.PAYME_MERCHANT_ID || "";
const PAYME_KEY = process.env.PAYME_MERCHANT_KEY || "";

// Payme integratsiya protkol ish vaqti (ms)
const CREATE_TIMEOUT = 12 * 60 * 60 * 1000; // 12 soat

class PaymeError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function configured() {
  return Boolean(PAYME_MERCHANT_ID && PAYME_KEY);
}

// To'lov URL'i (Payme oynasi)
function paymentUrl(orderRef, amountTiyin) {
  const params = new URLSearchParams();
  params.set("m", PAYME_MERCHANT_ID);
  params.set("a", String(Math.round(Number(amountTiyin) || 0)));
  params.set("ac.order_id", String(orderRef));
  return `https://checkout.payme.uz/${PAYME_MERCHANT_ID}?${params.toString()}`;
}

function generateTransactionId() {
  // Payme int64 formatda transaction id kutadi
  return Number(Date.now() * 1000) + Math.floor(Math.random() * 1000);
}

function nowTiyinTimestamp() {
  // Payme UTC millisekund (ms) formatda vaqt qaytaradi
  return Date.now();
}

// CheckPerformTransaction — buyurtmani tekshirish
async function checkPerform({ order, amountTiyin }) {
  if (!order) throw new PaymeError(-31003, "Buyurtma topilmadi");
  const expected = Math.round(Number(order.total) * 100);
  if (Number(amountTiyin) !== expected) {
    throw new PaymeError(-31001, "Summa mos emas");
  }
  if (order.paymentStatus === "paid") {
    throw new PaymeError(-31008, "Buyurtma allaqachon to'langan");
  }
  return {
    allow: true,
    detail: {
      receipt_type: 0,
      items: [
        {
          title: order.device ? `${order.device}${order.issue ? " — " + order.issue : ""}` : "Ustachi xizmati",
          count: 1,
          unit: 1,
          price: expected,
          vat_percent: 0,
          code: String(order.orderNumber).slice(0, 32),
        },
      ],
    },
  };
}

// CreateTransaction — to'lov holatini boshlash (state=1)
async function createTransaction({ order, amountTiyin, method }) {
  if (!order) throw new PaymeError(-31003, "Buyurtma topilmadi");
  const expected = Math.round(Number(order.total) * 100);
  if (Number(amountTiyin) !== expected) {
    throw new PaymeError(-31001, "Summa mos emas");
  }
  if (order.paymentStatus === "paid") {
    throw new PaymeError(-31008, "Buyurtma allaqachon to'langan");
  }
  return {
    create_time: nowTiyinTimestamp(),
    transaction: generateTransactionId(),
    state: 1,
    receiver: PAYME_MERCHANT_ID,
    allow: true,
  };
}

// PerformTransaction — to'lovni yakunlash (state=2)
async function performTransaction({ record, amountTiyin, order }) {
  if (!record) throw new PaymeError(-31003, "Tranzaksiya topilmadi");
  if (record.status === "paid" || record.gatewayState >= 2) {
    throw new PaymeError(-31008, "Tranzaksiya allaqachon yakunlangan");
  }
  const expected = Math.round(Number(order.total) * 100);
  if (Number(amountTiyin) !== expected) {
    throw new PaymeError(-31001, "Summa mos emas");
  }
  // Muddati o'tgan tranzaksiyalarni bekor qilish
  const created = record.createdAt ? new Date(record.createdAt).getTime() : 0;
  if (created && Date.now() - created > CREATE_TIMEOUT) {
    record.gatewayState = -1;
    record.status = "failed";
    await record.save();
    throw new PaymeError(-31009, "Tranzaksiya muddati o'tdi");
  }
  record.gatewayState = 2;
  record.status = "paid";
  await record.save();
  return {
    perform_time: nowTiyinTimestamp(),
    transaction: record.gatewayTxId ? Number(record.gatewayTxId) || String(record.gatewayTxId) : record.gatewayTxId,
    state: 2,
  };
}

// CancelTransaction — bekor qilish
async function cancelTransaction({ record, reason }) {
  if (!record) throw new PaymeError(-31003, "Tranzaksiya topilmadi");
  if (record.status === "paid" && record.gatewayState >= 2) {
    // To'lov bo'lgandan keyin bekor qilish — qisman/instrument talab qiladi, soddalik uchun rad
    if (Number(reason) >= 2) {
      // reason>=2 — to'lovdan keyingi qaytarish
      record.gatewayState = -2;
      record.status = "refunded";
      await record.save();
      return { cancel_time: nowTiyinTimestamp(), transaction: record.gatewayTxId, state: -2 };
    }
    throw new PaymeError(-31007, "Bekor qilish imkonsiz");
  }
  record.gatewayState = -1;
  record.status = "failed";
  await record.save();
  return { cancel_time: nowTiyinTimestamp(), transaction: record.gatewayTxId, state: -1 };
}

// CheckTransaction — joriy holat
async function checkTransaction({ record }) {
  if (!record) throw new PaymeError(-31003, "Tranzaksiya topilmadi");
  return { create_time: nowTiyinTimestamp(), perform_time: 0, cancel_time: 0, transaction: record.gatewayTxId, state: record.gatewayState || 1 };
}

module.exports = {
  PaymeError,
  configured,
  paymentUrl,
  checkPerform,
  createTransaction,
  performTransaction,
  cancelTransaction,
  checkTransaction,
  PAYME_MERCHANT_ID,
  CREATE_TIMEOUT,
};