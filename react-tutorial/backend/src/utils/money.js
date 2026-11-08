/**
 * Decimal-safe pul hisobi.
 *
 * Barcha summalar butun son "minor units" (tiyin) sifatida saqlanadi.
 * 1 so'm = 100 tiyin. Shu sababli 0.1 + 0.2 muammosi paydo bo'lmaydi.
 *
 * ESLint/Node: Number.MAX_SAFE_INTEGER dan oshgan qiymatlarni qabul qilmaydi —
 * bu atayin, chunki minor units da chegarasiz o'sish xavfsiz.
 */

const MINOR_PER_MAJOR = 100;
const MAX_MINOR = Number.MAX_SAFE_INTEGER;

/** "1234.56" | 1234.56 | 1234 -> 123456 (minor units) */
function toMinor(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "object" && typeof value.toString === "function") {
    // BSON Decimal128 / mongoose Decimal
    return toMinor(value.toString());
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  // Math.round faqat .5 dan katta qiymatlarni xotira oshirmasligi uchun
  return Math.round(n * MINOR_PER_MAJOR);
}

/** 123456 -> 1234.56 (JS number, ko'rsatish uchun) */
function toMajor(minor) {
  return (Number(minor) || 0) / MINOR_PER_MAJOR;
}

/** 123456 -> "1234.56" (iqtisodiy hujjatlar uchun) */
function formatMajor(minor) {
  return (Math.round(Number(minor) || 0) / MINOR_PER_MAJOR).toFixed(2);
}

/**
 * Minimal birlikni qisqartirish — "so'm" va "tiyin" uchun.
 * 0 -> "0"
 * 500 -> "5 so'm"
 */
function formatMoney(minor, symbol = "so'm") {
  const abs = Math.abs(Math.round(Number(minor) || 0));
  if (abs % MINOR_PER_MAJOR === 0) {
    return `${(abs / MINOR_PER_MAJOR).toLocaleString("ru-RU")} ${symbol}`;
  }
  const maj = Math.trunc(abs / MINOR_PER_MAJOR);
  const min = abs % MINOR_PER_MAJOR;
  return `${maj.toLocaleString("ru-RU")},${String(min).padStart(2, "0")} ${symbol}`;
}

/**
 * Foizni minor units bo'yicha hisoblaydi, yaxlitlash YOKILISHI bo'lmaydi.
 *
 * Masalan: 7% va 12345 tiyin -> 864.15 tiyin -> yaxlitlanadi 864
 * 123456 * 700 / 10000 = 8641.92 -> 8642
 *
 * @param {number} minor       asosiy summa (minor units)
 * @param {number} rateBps      foiz basis punktlarida (700 = 7.00%)
 * @returns {number} minor units
 */
function applyRate(minor, rateBps) {
  const base = Math.round(Number(minor) || 0);
  const bps = Math.round(Number(rateBps) || 0);
  if (!base || !bps) return 0;
  if (bps < 0 || bps > 10_000) {
    throw new RangeError(`rateBps 0..10000 oralig'ida bo'lishi kerak, keldi: ${bps}`);
  }
  return Math.round((base * bps) / 10_000);
}

/**
 * Minor units orasidagi foizni butun minor units qaytaradi,
 * lekin "yaxlitlash qoidalari" aniq bo'ladi (banker's rounding emas).
 */
function splitByRate(minor, rateBps) {
  const total = Math.round(Number(minor) || 0);
  const part = applyRate(total, rateBps);
  return { part, rest: total - part };
}

/** Xavfsizlik: minor units chegarasini tekshiradi */
function assertSafe(minor, field = "summa") {
  const n = Number(minor);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new TypeError(`${field} butun son (tiyin) bo'lishi kerak, keldi: ${minor}`);
  }
  if (Math.abs(n) > MAX_MINOR) {
    throw new RangeError(`${field} chegaradan oshdi (${n})`);
  }
  return n;
}

/** Mijoz tilidan kelgan narxni minor units ga aylantiradi (manfiy qiymatga qarshi himoya) */
function priceToMinor(value, { field = "narx", allowZero = true } = {}) {
  const n = Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(n)) {
    throw new TypeError(`${field} raqam bo'lishi kerak`);
  }
  if (n < 0) throw new RangeError(`${field} manfiy bo'lmasligi kerak`);
  const minor = toMinor(n);
  if (!allowZero && minor <= 0) throw new RangeError(`${field} 0 dan katta bo'lishi kerak`);
  return assertSafe(minor, field);
}

module.exports = {
  MINOR_PER_MAJOR,
  MAX_MINOR,
  toMinor,
  toMajor,
  formatMajor,
  formatMoney,
  applyRate,
  splitByRate,
  assertSafe,
  priceToMinor,
};
