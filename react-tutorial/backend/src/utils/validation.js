// Sozlamalar (settings) uchun sof (pure) validatsiya yordamchilari.
// Bu modul DB/Ga'lovarsiz ishlaydi — shuning uchun `node --test` bilan
// to'g'ridan-to'g'ri test qilinadi (backend/test/settings.validation.test.js).

const THEME_MODES = ["system", "light", "dark"];
const LANGUAGES = ["uz", "ru", "en"];

const FONT_SCALE_MIN = 0.8;
const FONT_SCALE_MAX = 1.35;
const FONT_SCALE_STEP = 0.05;

// Bildirishnoma kategoriyalari. Faqat haqiqatda yetkazib beriladigan
// kanallar ko'rsatiladi (barchasi push orqali yuboriladi).
const NOTIFICATION_CHANNELS = ["push"];

const NOTIFICATION_CATEGORIES = [
  { key: "orders", field: "orders", defaultOn: true },
  { key: "chat", field: "chat", defaultOn: true },
  { key: "masters", field: "masters", defaultOn: true },
  { key: "payments", field: "payments", defaultOn: true },
  { key: "promo", field: "promo", defaultOn: false },
];

const NOTIFICATION_FIELDS = NOTIFICATION_CATEGORIES.map((c) => c.field);
const CATEGORY_FIELDS = new Set(NOTIFICATION_FIELDS);

// Push xabar turlari -> yoqumlash mumkin bo'lgan kategoriya maydoni
const PUSH_CATEGORY_TO_FIELD = {
  order: "orders",
  chat: "chat",
  master: "masters",
  payment: "payments",
  promo: "promo",
};

const MAX_ADDRESSES = 10;
const ADDRESS_MAX = {
  label: 40,
  line: 240,
  city: 80,
  note: 240,
};

const MASTER_AVAILABILITY = ["available", "busy", "off"];
const MAX_SPECIALTIES = 12;
const MAX_SERVICE_AREAS = 20;
const COVERAGE_MIN = 1;
const COVERAGE_MAX = 200;

function str(value) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function trimmed(value, max) {
  return str(value).trim().slice(0, max);
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Mavzu rejimini tekshiradi. Noma'lum qiymat -> "system" (mos emas).
 */
function normalizeTheme(value, fallback = "system") {
  const v = str(value).trim().toLowerCase();
  if (THEME_MODES.includes(v)) return v;
  return THEME_MODES.includes(fallback) ? fallback : "system";
}

/**
 * Til kodini tekshiradi (uz|ru|en). Noma'lum qiymat -> fallback.
 */
function normalizeLanguage(value, fallback = "uz") {
  const v = str(value).trim().toLowerCase();
  if (LANGUAGES.includes(v)) return v;
  return LANGUAGES.includes(fallback) ? fallback : "uz";
}

/**
 * Shrift o'lchamini 0.8..1.35 oralig'ida 0.05 qadamlarga yaxlitlaydi.
 */
function clampFontScale(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 1;
  const clamped = Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, n));
  // 0.05 qadamga yaxlitlaymiz; toFixed float nuqsonini (1.2000000000000002) yo'q qiladi
  return Number((Math.round(clamped / FONT_SCALE_STEP) * FONT_SCALE_STEP).toFixed(2));
}

/**
 * Sozlamalar bo'limi (PATCH /me/preferences) validatsiyasi.
 * @returns {{ok: boolean, errors: string[], patch: object}}
 */
function validatePreferencesPatch(body, current = {}) {
  const errors = [];
  const patch = {};
  const input = isPlainObject(body) ? body : {};

  if (input.theme !== undefined) {
    const v = str(input.theme).trim().toLowerCase();
    if (!THEME_MODES.includes(v)) {
      errors.push("Mavzu noto'g'ri (system | light | dark)");
    } else {
      patch.theme = v;
    }
  }

  if (input.language !== undefined) {
    const v = str(input.language).trim().toLowerCase();
    if (!LANGUAGES.includes(v)) {
      errors.push("Til noto'g'ri (uz | ru | en)");
    } else {
      patch.language = v;
    }
  }

  if (input.fontScale !== undefined) {
    const n = Number(input.fontScale);
    if (!Number.isFinite(n) || n <= 0) {
      errors.push("Shrift o'lchami noto'g'ri");
    } else {
      patch.fontScale = clampFontScale(n);
    }
  }

  if (input.reduceMotion !== undefined) {
    if (typeof input.reduceMotion !== "boolean") {
      errors.push("Harakatni kamaytirish faqat true/false bo'lishi mumkin");
    } else {
      patch.reduceMotion = input.reduceMotion;
    }
  }

  if (input.notifications !== undefined) {
    const result = validateNotificationsPatch(input.notifications, current.notifications);
    errors.push(...result.errors);
    if (result.ok) patch.notifications = result.value;
  }

  return { ok: errors.length === 0, errors, patch };
}

/**
 * Bildirishnoma sozlamalari (PATCH /me/preferences/notifications).
 * Noma'lum kalitlar rad etiladi — "hamma narsani o'chirib yubormaslik" uchun.
 */
function validateNotificationsPatch(body, current = {}) {
  const errors = [];
  const input = isPlainObject(body) ? body : {};
  const value = {};

  if (input.channels !== undefined) {
    if (!isPlainObject(input.channels)) {
      errors.push("Bildirishnoma kanallari noto'g'ri");
    } else {
      const channels = {};
      NOTIFICATION_CHANNELS.forEach((ch) => {
        const raw = input.channels[ch];
        if (raw === undefined) return;
        if (typeof raw !== "boolean") {
          errors.push(`Kanal «${ch}» faqat true/false bo'lishi mumkin`);
          return;
        }
        channels[ch] = raw;
      });
      Object.keys(input.channels).forEach((k) => {
        if (!NOTIFICATION_CHANNELS.includes(k)) {
          errors.push(`Noma'lum bildirishnoma kanali: ${k}`);
        }
      });
      if (Object.keys(channels).length) value.channels = channels;
    }
  }

  NOTIFICATION_FIELDS.forEach((field) => {
    if (input[field] === undefined) return;
    if (typeof input[field] !== "boolean") {
      errors.push(`«${field}» faqat true/false bo'lishi mumkin`);
      return;
    }
    value[field] = input[field];
  });

  Object.keys(input).forEach((k) => {
    if (k === "channels") return;
    if (!NOTIFICATION_FIELDS.includes(k)) errors.push(`Noma'lum bildirishnoma kaliti: ${k}`);
  });

  // Hech narsa o'zgarmasa — bu ham xato (typo bo'lishi mumkin)
  if (!Object.keys(value).length && !errors.length) {
    errors.push("Hech qanday o'zgarish topilmadi");
  }

  return { ok: errors.length === 0, errors, value };
}

/**
 * Bildirishnoma pref'larini birlashtiradi (defaults to'ldirilgan holda).
 */
function defaultNotifications(overrides = {}) {
  const out = { channels: {} };
  NOTIFICATION_CHANNELS.forEach((ch) => { out.channels[ch] = true; });
  NOTIFICATION_CATEGORIES.forEach((c) => { out[c.field] = c.defaultOn; });
  return mergeNotifications(out, overrides);
}

function mergeNotifications(base, overrides) {
  const out = { channels: { ...(base.channels || {}) } };
  NOTIFICATION_CHANNELS.forEach((ch) => {
    if (base.channels && typeof base.channels[ch] === "boolean") out.channels[ch] = base.channels[ch];
  });
  NOTIFICATION_FIELDS.forEach((f) => {
    if (typeof base[f] === "boolean") out[f] = base[f];
  });

  const ov = isPlainObject(overrides) ? overrides : {};
  NOTIFICATION_CHANNELS.forEach((ch) => {
    if (ov.channels && typeof ov.channels[ch] === "boolean") out.channels[ch] = ov.channels[ch];
  });
  NOTIFICATION_FIELDS.forEach((f) => {
    if (typeof ov[f] === "boolean") out[f] = ov[f];
  });
  return out;
}

function defaultPreferences(overrides = {}) {
  const ov = isPlainObject(overrides) ? overrides : {};
  return {
    theme: normalizeTheme(ov.theme, "system"),
    language: normalizeLanguage(ov.language, "uz"),
    fontScale: clampFontScale(ov.fontScale == null ? 1 : ov.fontScale),
    reduceMotion: ov.reduceMotion === true,
  };
}

/**
 * Bildirishnoma yuborilishi kerakmi?
 * @param {object} userNotifications saqlangan bildirishnoma pref'lari
 * @param {string} category push turi: order|chat|master|payment|promo
 */
function shouldNotify(userNotifications, category) {
  const prefs = defaultNotifications(userNotifications);
  const field = PUSH_CATEGORY_TO_FIELD[category];
  if (!field) return true; // kategoriya noma'lum bo'lsa — bloklamaymiz
  if (prefs.channels && prefs.channels.push === false) return false;
  return prefs[field] !== false;
}

function isValidLat(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= -90 && n <= 90;
}

function isValidLng(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= -180 && n <= 180;
}

/**
 * Manzil validatsiyasi. Kiritilgan qiymatlarni tozalaydi va xatolarni qaytaradi.
 * @returns {{ok: boolean, errors: string[], value: object|null}}
 */
function validateAddressInput(body, { partial = false } = {}) {
  const errors = [];
  const input = isPlainObject(body) ? body : {};

  const hasAny = ["label", "line", "city", "note", "lat", "lng"].some(
    (k) => input[k] !== undefined
  );
  if (partial && !hasAny) {
    return { ok: false, errors: ["Hech qanday maydon yuborilmadi"], value: null };
  }

  const value = {};

  if (input.label !== undefined) value.label = trimmed(input.label, ADDRESS_MAX.label);
  if (input.city !== undefined) value.city = trimmed(input.city, ADDRESS_MAX.city);
  if (input.note !== undefined) value.note = trimmed(input.note, ADDRESS_MAX.note);

  if (input.line !== undefined) {
    // Uzunlik tekshiruvi KESILGAN matn ustida emas — aks holda juda uzun
    // manzil "juda uzun" xatosi olmasdan jim qisqarib qolardi.
    const raw = str(input.line).trim();
    if (!partial && raw.length < 4) errors.push("Manzil matni juda qisqa");
    if (raw.length > ADDRESS_MAX.line) errors.push("Manzil matni juda uzun");
    value.line = raw.slice(0, ADDRESS_MAX.line);
  } else if (!partial) {
    errors.push("Manzil kiritilishi shart");
  }

  if (input.lat !== undefined && input.lat !== null && input.lat !== "") {
    if (!isValidLat(input.lat)) errors.push("Kenglik (lat) -90..90 oralig'ida bo'lishi shart");
    else value.lat = Number(input.lat);
  }
  if (input.lng !== undefined && input.lng !== null && input.lng !== "") {
    if (!isValidLng(input.lng)) errors.push("Uzunlik (lng) -180..180 oralig'ida bo'lishi shart");
    else value.lng = Number(input.lng);
  }
  if (value.lat === undefined && input.lat !== undefined) value.lat = null;
  if (value.lng === undefined && input.lng !== undefined) value.lng = null;

  if (input.isDefault !== undefined) {
    if (typeof input.isDefault !== "boolean") errors.push("isDefault faqat true/false bo'lishi mumkin");
    else value.isDefault = input.isDefault;
  }

  return { ok: errors.length === 0, errors, value: errors.length ? null : value };
}

/**
 * Usta sozlamalari validatsiyasi (PATCH /api/masters/me).
 */
function validateMasterSettingsPatch(body) {
  const errors = [];
  const patch = {};
  const input = isPlainObject(body) ? body : {};

  if (input.specialties !== undefined) {
    if (!Array.isArray(input.specialties)) {
      errors.push("Yo'nalishlar ro'yxati bo'lishi shart");
    } else if (input.specialties.length > MAX_SPECIALTIES) {
      errors.push(`Yo'nalishlar soni ${MAX_SPECIALTIES} tadan oshmasligi kerak`);
    } else {
      const list = input.specialties.map((s) => trimmed(s, 40)).filter(Boolean);
      patch.specialties = [...new Set(list)];
    }
  }

  if (input.serviceArea !== undefined) {
    if (!Array.isArray(input.serviceArea)) {
      errors.push("Xizmat hududi ro'yxati bo'lishi shart");
    } else if (input.serviceArea.length > MAX_SERVICE_AREAS) {
      errors.push(`Xizmat hududi ${MAX_SERVICE_AREAS} tadan oshmasligi kerak`);
    } else {
      patch.serviceArea = [...new Set(input.serviceArea.map((s) => trimmed(s, 60)).filter(Boolean))];
    }
  }

  if (input.coverageRadiusKm !== undefined) {
    const n = Number(input.coverageRadiusKm);
    if (!Number.isFinite(n) || n < COVERAGE_MIN || n > COVERAGE_MAX) {
      errors.push(`Xizmat radiusi ${COVERAGE_MIN}..${COVERAGE_MAX} km oralig'ida bo'lishi shart`);
    } else {
      patch.coverageRadiusKm = Math.round(n);
    }
  }

  if (input.availability !== undefined) {
    const v = str(input.availability).trim().toLowerCase();
    if (!MASTER_AVAILABILITY.includes(v)) {
      errors.push(`Holat noto'g'ri (${MASTER_AVAILABILITY.join(" | ")})`);
    } else {
      patch.availability = v;
    }
  }

  if (input.workingHours !== undefined) {
    const v = trimmed(input.workingHours, 200);
    patch.workingHours = v;
  }

  if (input.price !== undefined) {
    const n = Number(input.price);
    if (!Number.isFinite(n) || n < 0 || n > 999999999) errors.push("Narx 0..999999999 oralig'ida bo'lishi shart");
    else patch.price = Math.round(n);
  }

  if (input.currency !== undefined) {
    const v = str(input.currency).trim().toLowerCase();
    if (!["uzs", "rub", "usd", "eur"].includes(v)) errors.push("Valyuta noto'g'ri (uzs | rub | usd | eur)");
    else patch.currency = v;
  }

  if (input.location !== undefined) {
    if (!isPlainObject(input.location)) {
      errors.push("Manzil noto'g'ri");
    } else {
      const loc = {};
      if (input.location.address !== undefined) loc.address = trimmed(input.location.address, 160);
      if (input.location.lat !== undefined) {
        if (!isValidLat(input.location.lat)) errors.push("Manzil lat noto'g'ri");
        else loc.lat = Number(input.location.lat);
      }
      if (input.location.lng !== undefined) {
        if (!isValidLng(input.location.lng)) errors.push("Manzil lng noto'g'ri");
        else loc.lng = Number(input.location.lng);
      }
      if (Object.keys(loc).length) patch.location = loc;
    }
  }

  if (input.verification !== undefined) {
    errors.push("Verifikatsiya holatini faqat administrator o'zgartiradi");
  }

  return { ok: errors.length === 0, errors, patch };
}

function isValidVerificationStatus(value) {
  return ["none", "pending", "approved", "rejected"].includes(str(value).trim().toLowerCase());
}

/**
 * Qo'llab-quvvatlanadigan bildirishnoma kategoriyalari (UI uchun).
 */
function supportedNotificationCategories() {
  return NOTIFICATION_CATEGORIES.map((c) => ({ key: c.key, field: c.field, defaultOn: c.defaultOn }));
}

module.exports = {
  THEME_MODES,
  LANGUAGES,
  FONT_SCALE_MIN,
  FONT_SCALE_MAX,
  FONT_SCALE_STEP,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_FIELDS,
  PUSH_CATEGORY_TO_FIELD,
  MAX_ADDRESSES,
  ADDRESS_MAX,
  MASTER_AVAILABILITY,
  MAX_SPECIALTIES,
  MAX_SERVICE_AREAS,
  COVERAGE_MIN,
  COVERAGE_MAX,
  normalizeTheme,
  normalizeLanguage,
  clampFontScale,
  defaultPreferences,
  defaultNotifications,
  mergeNotifications,
  validatePreferencesPatch,
  validateNotificationsPatch,
  shouldNotify,
  validateAddressInput,
  validateMasterSettingsPatch,
  isValidVerificationStatus,
  isValidLat,
  isValidLng,
  supportedNotificationCategories,
  isPlainObject,
  trimmed,
};
