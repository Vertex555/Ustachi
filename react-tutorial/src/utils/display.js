export function isGuestPhone(phone) {
  return /^guest-/i.test(String(phone || "").trim());
}

export function displayPhone(phone, fallback) {
  const p = String(phone || "").trim();
  if (!p || isGuestPhone(p)) return fallback || "";
  return p;
}

export function displayName(name, phone) {
  const n = String(name || "").trim();
  if (n) return n;
  if (phone && !isGuestPhone(phone)) return String(phone);
  return "";
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function toHHMM(value) {
  const v = String(value || "").trim();
  if (!v) return "";
  const m = v.match(/(\d{1,2})[:.]?(\d{1,2})?/);
  if (!m) return v;
  const h = Math.min(23, parseInt(m[1], 10));
  const mm = m[2] ? Math.min(59, parseInt(m[2], 10)) : 0;
  return `${pad2(h)}:${pad2(mm)}`;
}

export function formatWorkingHours(hours) {
  if (!hours) return "";
  const str =
    typeof hours === "object"
      ? `${hours.open || ""} - ${hours.close || ""}`
      : String(hours);
  const parts = str
    .split("-")
    .map((p) => toHHMM(p))
    .filter(Boolean);
  return parts.join(" - ");
}

export function formatCardNumber(card) {
  return String(card || "")
    .replace(/\s+/g, "")
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

export const CURRENCY_SYMBOLS = {
  uzs: "so'm",
  rub: "RUB",
  usd: "$",
  eur: "EUR",
};

export function currencySymbol(currency) {
  return CURRENCY_SYMBOLS[String(currency || "uzs")] || "so'm";
}

export function formatPrice(value, currency) {
  const n = Number(value || 0);
  const str = Number.isFinite(n)
    ? n.toLocaleString("ru-RU")
    : String(value || 0);
  return `${str} ${currencySymbol(currency)}`;
}