const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const { JWT_SECRET } = require("../middleware/auth");
const Master = require("../models/Master");
const Session = require("../models/Session");
const {
  defaultPreferences,
  defaultNotifications,
} = require("./validation");
const {
  ORDER_STATUSES,
  DELIVERY_METHODS,
  PAYMENT_METHODS,
} = require("../models/Order");

const JWT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;
const JWT_EXPIRES_IN = "7d";

function signToken(user, { jti, device, platform, ip, userAgent } = {}) {
  const sessionId = jti || crypto.randomUUID();
  const token = jwt.sign(
    {
      id: user._id.toString(),
      jti: sessionId,
      sv: user.sessionVersion || 0,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  return { token, jti: sessionId, expiresIn: JWT_EXPIRES_IN_SECONDS };
}

/**
 * Kirishda chaqiriladi: token beradi va Session yozuvini yaratadi
 * ("Faol qurilmalar" ro'yxati uchun).
 */
async function createSessionToken(user, meta = {}) {
  const signed = signToken(user);
  try {
    await Session.create({
      user: user._id,
      jti: signed.jti,
      sessionVersion: user.sessionVersion || 0,
      device: (meta.device || "").slice(0, 120),
      platform: (meta.platform || "").slice(0, 40),
      ip: (meta.ip || "").slice(0, 64),
      userAgent: (meta.userAgent || "").slice(0, 300),
      expiresAt: new Date(Date.now() + signed.expiresIn * 1000),
    });
  } catch (err) {
    // Sessiya yozilmasa ham kirish ishlashi kerak (DB indeks xatosi va h.k.)
    console.error("[auth] Session yaratilmadi:", err.message);
  }
  return signed.token;
}

// So'rovdan qurilma meta ma'lumotlarini olish
function requestMeta(req) {
  return {
    device: String(req.headers["x-device-name"] || ""),
    platform: String(req.headers["x-device-platform"] || ""),
    ip: String(req.headers["x-forwarded-for"] || req.ip || "")
      .split(",")[0]
      .trim(),
    userAgent: String(req.headers["user-agent"] || ""),
  };
}

function serializeUser(user) {
  const saved = (user.savedMasters || []).map((s) =>
    s && s._id ? s._id.toString() : String(s)
  );
  return {
    id: user._id.toString(),
    phone: user.phone,
    name: user.name || "",
    email: user.email || "",
    photo: user.photo || null,
    banner: user.banner || null,
    savedMasters: saved,
    role: user.role,
    banned: !!user.banned,
    preferences: defaultPreferences(user.preferences),
    notifications: defaultNotifications(user.notifications),
  };
}

// serializeUser + "bu foydalanuvchi usta anketasiga egami?" ma'lumoti
async function serializeUserWithMaster(user) {
  const isMaster = !!(await Master.exists({ user: user._id }));
  return { ...serializeUser(user), isMaster };
}

// `private: true` — faqat egasi (yoki admin) ko'radi (verifikatsiya holati).
function serializeMaster(m, { private: isPrivate = false } = {}) {
  const base = {
    id: m._id.toString(),
    name: m.name,
    phone: m.phone,
    experience: m.experience,
    devices: m.devices || [],
    specialties: m.specialties || [],
    serviceArea: m.serviceArea || [],
    coverageRadiusKm: m.coverageRadiusKm ?? 15,
    availability: m.availability || "available",
    location: m.location || null,
    rating: m.rating ?? 0,
    reviewsCount: m.reviewsCount || 0,
    price: m.price ?? 0,
    currency: m.currency || "uzs",
    workingHours: m.workingHours || "",
    photo: m.photo,
    banner: m.banner || null,
    isPublished: m.isPublished !== false,
  };
  if (!isPrivate) return base;
  return {
    ...base,
    verification: {
      status: (m.verification && m.verification.status) || "none",
      note: (m.verification && m.verification.note) || "",
      updatedAt: (m.verification && m.verification.updatedAt) || null,
    },
  };
}

// Karta raqamini validatsiya qilish (Luhn algoritmi)
function luhnCheck(num) {
  const digits = String(num).replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

function detectCardBrand(cardNumber) {
  const n = String(cardNumber).replace(/\D/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return "Mastercard";
  if (/^(5061|5062|6214)/.test(n)) return "Humo";
  if (/^(8600|5614|8601)/.test(n)) return "Uzcard";
  return "Karta";
}

// To'lov tarmog'i (to'liq raqamni saqlamasdan brenddan aniqlanadi)
function detectCardNetwork(cardNumber) {
  const brand = detectCardBrand(cardNumber);
  if (brand === "Humo") return "humo";
  if (brand === "Uzcard") return "uzcard";
  if (brand === "Visa" || brand === "Mastercard") return "international";
  return "";
}

function serializeOrder(o) {
  const master =
    o.master && typeof o.master === "object" && o.master.name
      ? o.master
      : null;
  const user =
    o.user && typeof o.user === "object" && o.user.phone ? o.user : null;

  // §13: har ikkala taqdimot ham — minor (aniq) va major (UI uchun qulay)
  const minor = {
    price: o.priceMinor ?? 0,
    fees: o.feesMinor ?? 0,
    total: o.totalMinor ?? 0,
    commission: o.commissionMinor ?? 0,
    masterNet: o.masterNetMinor ?? 0,
    collected: o.collectedMinor ?? 0,
  };
  const major = {
    price: (o.priceMinor ?? 0) / 100,
    fees: (o.feesMinor ?? 0) / 100,
    total: (o.totalMinor ?? 0) / 100,
    commission: (o.commissionMinor ?? 0) / 100,
    masterNet: (o.masterNetMinor ?? 0) / 100,
    collected: (o.collectedMinor ?? 0) / 100,
  };

  return {
    id: o._id.toString(),
    orderNumber: o.orderNumber,
    category: o.category || "other",
    serviceType: o.serviceType || "",
    device: o.device,
    deviceModel: o.deviceModel,
    brand: o.brand || "",
    issue: o.issue,
    description: o.description,
    comment: o.comment,
    // Eski maydonlar saqlanadi (mobile hozir ulardan foydalanadi)
    price: major.price,
    commission: major.commission,
    total: major.total,
    deliveryFee: major.fees,
    // Aniq (integer) ko'rinish — moliyaviy hisob uchun
    amounts: minor,
    amountsMajor: major,
    currency: o.currency || "UZS",
    commissionRateBps: o.commissionRateBpsSnapshot ?? null,
    commissionBasis: o.commissionBasisSnapshot || "service",
    payoutStatus: o.payoutStatus || "not_applicable",
    deliveryMethod: o.deliveryMethod || "master_pickup",
    serviceMethod: o.serviceMethod || "onsite",
    paymentMethod: o.paymentMethod || "cash_on_delivery",
    paymentStatus: o.paymentStatus || "pending",
    payment: o.payment || null,
    location: o.location || null,
    masterLocation: o.masterLocation || null,
    addressText: o.addressText || "",
    preferredAt: o.preferredAt || null,
    flexibleTime: !!o.flexibleTime,
    photos: o.photos || [],
    workPhotos: o.workPhotos || [],
    status: o.status,
    quotes: o.quotes || [],
    activeQuoteIndex: o.activeQuoteIndex ?? -1,
    rejectionReason: o.rejectionReason || "",
    cancellationReason: o.cancellationReason || "",
    dispute: o.dispute ? { ...o.dispute } : null,
    // §8: timeline
    history: (o.history || []).map((h) => ({
      from: h.from || "",
      to: h.to,
      role: h.role || "",
      note: h.note || "",
      at: h.at,
    })),
    rating: o.rating || 0,
    review: o.review || "",
    ratedAt: o.ratedAt || null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    contactPhone: master ? master.phone : undefined,
    master: master
      ? {
          id: master._id ? master._id.toString() : o.master.toString(),
          name: master.name,
          phone: master.phone,
          rating: master.rating ?? 0,
          reviewsCount: master.reviewsCount ?? 0,
          price: master.price ?? 0,
          location: master.location || null,
          lat: master.location?.lat ?? null,
          lng: master.location?.lng ?? null,
          photo: master.photo || null,
          avatarCh: (master.name || "M").charAt(0),
        }
      : undefined,
    user: user
      ? {
          id: user._id.toString(),
          phone: user.phone,
          name: user.name || "",
          photo: user.photo || null,
          avatarCh: (user.name || user.phone || "?").charAt(0),
        }
      : undefined,
  };
}

function isValidOrderStatus(s) {
  return ORDER_STATUSES.includes(s);
}

function isValidDeliveryMethod(m) {
  return DELIVERY_METHODS.includes(m);
}

function isValidPaymentMethod(m) {
  return PAYMENT_METHODS.includes(m);
}

const MAX_PAGE_SIZE = 100;

// Ro'yxat endpoint'lari uchun umumiy pagination.
// Agar ?page / ?limit so'rov parametrlari kelmasa — eski xatti-harakat saqlanadi
// (to'liq ro'yxat qaytadi), shuning uchun eski client'lar buzilmaydi.
function parsePagination(query) {
  const hasPagination =
    query && (query.page !== undefined || query.limit !== undefined);
  const rawPage = query && query.page !== undefined ? parseInt(query.page, 10) : 1;
  const rawLimit = query && query.limit !== undefined ? parseInt(query.limit, 10) : 0;
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = hasPagination
    ? Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_PAGE_SIZE)
      : 20
    : 0;
  return {
    enabled: hasPagination,
    page,
    limit,
    skip: limit ? (page - 1) * limit : 0,
  };
}

// Navbatdagi page mavjudligini tekshirish uchun qisqa yordamchi
function paginationMeta(pag, total) {
  return {
    page: pag.page,
    limit: pag.limit,
    total,
    pages: pag.limit ? Math.max(1, Math.ceil(total / pag.limit)) : 1,
  };
}

// Foydalanuvchi kiritgan matnni RegExp ga xavfsiz aylantirish (ReDoS va sintaktika xatosining oldini oladi)
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  escapeRegex,
  signToken,
  createSessionToken,
  requestMeta,
  serializeUser,
  serializeUserWithMaster,
  serializeMaster,
  serializeOrder,
  isValidOrderStatus,
  isValidDeliveryMethod,
  isValidPaymentMethod,
  luhnCheck,
  detectCardBrand,
  detectCardNetwork,
  parsePagination,
  paginationMeta,
  ORDER_STATUSES,
  DELIVERY_METHODS,
  PAYMENT_METHODS,
};