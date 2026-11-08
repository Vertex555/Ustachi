// Sozlamalar ekrani uchun SOF (pure) mantiq.
//
// Bu modul hech qanday React Native importi qilmaydi — shuning uchun
// `node --test` bilan to'g'ridan-to'g'ri test qilinadi
// (mobile/test/settings.logic.test.mjs).
//
// Backend bilan bir xil qoidalar: src/utils/validation.js (server).

export const THEME_MODES = ["system", "light", "dark"];
export const LANGUAGES = ["uz", "ru", "en"];

export const FONT_SCALE_MIN = 0.8;
export const FONT_SCALE_MAX = 1.35;
export const FONT_SCALE_STEP = 0.05;

// UI da ko'rsatiladigan shrift o'lchamlari (palette.js bilan bir xil)
export const FONT_SCALE_STEPS = [0.8, 0.9, 1, 1.1, 1.2, 1.3];

// Bildirishnoma kategoriyalari. `key` — server maydoni bilan bir xil.
export const NOTIFICATION_CATEGORIES = [
  { key: "orders", icon: "package", defaultOn: true },
  { key: "chat", icon: "message-circle", defaultOn: true },
  { key: "masters", icon: "wrench", defaultOn: true },
  { key: "payments", icon: "banknote", defaultOn: true },
  { key: "promo", icon: "gift", defaultOn: false },
];

export const NOTIFICATION_CHANNELS = ["push"];

export const MASTER_AVAILABILITY = ["available", "busy", "off"];

export const MAX_ADDRESSES = 10;
export const ADDRESS_MAX = { label: 40, line: 240, city: 80, note: 240 };

export const MAX_SPECIALTIES = 12;
export const COVERAGE_MIN = 1;
export const COVERAGE_MAX = 200;
export const COVERAGE_STEPS = [5, 10, 15, 25, 40, 60, 100];

export const VERIFICATION_STATUSES = ["none", "pending", "approved", "rejected"];

function str(value) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

export function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function normalizeTheme(value, fallback = "system") {
  const v = str(value).trim().toLowerCase();
  if (THEME_MODES.includes(v)) return v;
  return THEME_MODES.includes(fallback) ? fallback : "system";
}

export function normalizeLanguage(value, fallback = "uz") {
  const v = str(value).trim().toLowerCase();
  if (LANGUAGES.includes(v)) return v;
  return LANGUAGES.includes(fallback) ? fallback : "uz";
}

export function clampFontScale(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 1;
  const clamped = Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, n));
  return Number((Math.round(clamped / FONT_SCALE_STEP) * FONT_SCALE_STEP).toFixed(2));
}

/**
 * Tanlangan rejim bo'yicha haqiqiy ko'rinishni aniqlaydi.
 * "system" rejimda qurilma sozlamasiga qaradi.
 * @param {"system"|"light"|"dark"} mode
 * @param {"light"|"dark"|null|undefined} systemScheme
 * @returns {"light"|"dark"}
 */
export function resolveTheme(mode, systemScheme) {
  const m = normalizeTheme(mode, "system");
  if (m === "light" || m === "dark") return m;
  return systemScheme === "dark" ? "dark" : "light";
}

export function defaultPreferences(overrides = {}) {
  const ov = isPlainObject(overrides) ? overrides : {};
  return {
    theme: normalizeTheme(ov.theme, "system"),
    language: normalizeLanguage(ov.language, "uz"),
    fontScale: clampFontScale(ov.fontScale == null ? 1 : ov.fontScale),
    reduceMotion: ov.reduceMotion === true,
  };
}

export function defaultNotifications(overrides = {}) {
  const ov = isPlainObject(overrides) ? overrides : {};
  const out = { channels: {} };
  NOTIFICATION_CHANNELS.forEach((c) => {
    out.channels[c] = typeof ov.channels?.[c] === "boolean" ? ov.channels[c] : true;
  });
  NOTIFICATION_CATEGORIES.forEach((c) => {
    out[c.key] = typeof ov[c.key] === "boolean" ? ov[c.key] : c.defaultOn;
  });
  return out;
}

/** Faqat o'zgartirilgan maydonlarni serverga yuborish uchun patch yasaydi. */
export function preferencesPatch(current, changes) {
  const base = defaultPreferences(current);
  const next = defaultPreferences({ ...base, ...(isPlainObject(changes) ? changes : {}) });
  const patch = {};
  Object.keys(next).forEach((k) => {
    if (next[k] !== base[k]) patch[k] = next[k];
  });
  return patch;
}

export function notificationPatch(current, changes) {
  const base = defaultNotifications(current);
  const patch = {};
  if (isPlainObject(changes)) {
    Object.keys(changes).forEach((k) => {
      if (typeof changes[k] === "boolean") patch[k] = changes[k];
    });
  }
  return patch;
}

/** Kategoriya bo'yicha o'chirilganlik holati. */
export function isCategoryEnabled(notifications, key) {
  const n = defaultNotifications(notifications);
  if (n.channels && n.channels.push === false) return false;
  return n[key] === true;
}

// ---------------------------------------------------------------- manzillar

export function isValidLat(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= -90 && n <= 90;
}

export function isValidLng(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= -180 && n <= 180;
}

/**
 * Manzil formasini tekshiradi (server bilan bir xil qoidalar).
 * @returns {{ok: boolean, errors: string[], value: object}}
 */
export function validateAddress(form, { partial = false } = {}) {
  const errors = [];
  const value = {};
  const f = isPlainObject(form) ? form : {};

  if (f.label !== undefined) value.label = str(f.label).trim().slice(0, ADDRESS_MAX.label);
  if (f.city !== undefined) value.city = str(f.city).trim().slice(0, ADDRESS_MAX.city);
  if (f.note !== undefined) value.note = str(f.note).trim().slice(0, ADDRESS_MAX.note);

  if (f.line !== undefined) {
    const raw = str(f.line).trim();
    if (!partial && raw.length < 4) errors.push("addressLineTooShort");
    if (raw.length > ADDRESS_MAX.line) errors.push("addressLineTooLong");
    value.line = raw.slice(0, ADDRESS_MAX.line);
  } else if (!partial) {
    errors.push("addressLineRequired");
  }

  if (f.lat !== undefined && f.lat !== null && f.lat !== "") {
    if (!isValidLat(f.lat)) errors.push("addressLatInvalid");
    else value.lat = Number(f.lat);
  }
  if (f.lng !== undefined && f.lng !== null && f.lng !== "") {
    if (!isValidLng(f.lng)) errors.push("addressLngInvalid");
    else value.lng = Number(f.lng);
  }

  return { ok: errors.length === 0, errors, value };
}

// ---------------------------------------------------------------- usta sozlamalari

export function validateMasterForm(form) {
  const errors = [];
  const value = {};
  const f = isPlainObject(form) ? form : {};

  if (f.specialties !== undefined) {
    const list = Array.isArray(f.specialties) ? f.specialties : [];
    if (list.length > MAX_SPECIALTIES) errors.push("specialtiesTooMany");
    value.specialties = [...new Set(list.map((s) => str(s).trim().slice(0, 40)).filter(Boolean))];
  }
  if (f.coverageRadiusKm !== undefined) {
    const n = Number(f.coverageRadiusKm);
    if (!Number.isFinite(n) || n < COVERAGE_MIN || n > COVERAGE_MAX) errors.push("coverageInvalid");
    else value.coverageRadiusKm = Math.round(n);
  }
  if (f.availability !== undefined) {
    const v = str(f.availability).trim().toLowerCase();
    if (!MASTER_AVAILABILITY.includes(v)) errors.push("availabilityInvalid");
    else value.availability = v;
  }
  if (f.workingHours !== undefined) {
    value.workingHours = str(f.workingHours).trim().slice(0, 200);
  }
  if (f.price !== undefined && f.price !== null && f.price !== "") {
    const n = Number(f.price);
    if (!Number.isFinite(n) || n < 0 || n > 999999999) errors.push("priceInvalid");
    else value.price = Math.round(n);
  }
  return { ok: errors.length === 0, errors, value };
}

export function isValidVerificationStatus(value) {
  return VERIFICATION_STATUSES.includes(str(value).trim().toLowerCase());
}

// ---------------------------------------------------------------- ro'lik

/**
 * Sozlamalar bo'limlari ro'linga qarab ko'rsatiladi.
 * Ustaga xos bo'limlar mijozga ko'rinmaydi.
 */
export function settingsSectionsForRole(role, { isAdmin = false } = {}) {
  const r = str(role);
  const base = ["appearance", "language", "notifications", "addresses", "payments", "security", "help", "about"];
  if (r === "master" || r === "user") {
    return isAdmin ? base : [...base, "master"];
  }
  return base;
}

export function canUseMasterSettings(role) {
  return role === "master" || role === "user";
}
