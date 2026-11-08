// Sozlamalar validatsiyasi testlari (node --test, tashqi kutubxonasiz).
// Ishga tushirish: npm test  (backend/package.json ichida)
const test = require("node:test");
const assert = require("node:assert/strict");

const V = require("../src/utils/validation");

// ---------------------------------------------------------------- mavzu / til

test("normalizeTheme: faqat system|light|dark qabul qilinadi", () => {
  assert.equal(V.normalizeTheme("light"), "light");
  assert.equal(V.normalizeTheme("DARK"), "dark");
  assert.equal(V.normalizeTheme(" system "), "system");
  assert.equal(V.normalizeTheme("neon"), "system");
  assert.equal(V.normalizeTheme(undefined, "light"), "light");
  assert.equal(V.normalizeTheme(null, "nope"), "system");
});

test("normalizeLanguage: faqat uz|ru|en qabul qilinadi", () => {
  assert.equal(V.normalizeLanguage("ru"), "ru");
  assert.equal(V.normalizeLanguage("EN"), "en");
  assert.equal(V.normalizeLanguage("uz"), "uz");
  assert.equal(V.normalizeLanguage("fr"), "uz");
  assert.equal(V.normalizeLanguage("de", "ru"), "ru");
});

// ---------------------------------------------------------------- shrift

test("clampFontScale: 0.8..1.35 oralig'ida, 0.05 qadam", () => {
  assert.equal(V.clampFontScale(1), 1);
  assert.equal(V.clampFontScale(0.1), 0.8);
  assert.equal(V.clampFontScale(9), 1.35);
  assert.equal(V.clampFontScale(1.13), 1.15);
  assert.equal(V.clampFontScale("1.2"), 1.2);
  assert.equal(V.clampFontScale("abc"), 1);
  assert.equal(V.clampFontScale(0), 1);
  assert.equal(V.clampFontScale(-5), 1);
  assert.equal(V.clampFontScale(NaN), 1);
});

// ---------------------------------------------------------------- default'lar

test("defaultPreferences: har doim to'liq va to'g'ri qiymatlar", () => {
  const d = V.defaultPreferences();
  assert.equal(d.theme, "system");
  assert.equal(d.language, "uz");
  assert.equal(d.fontScale, 1);
  assert.equal(d.reduceMotion, false);

  const custom = V.defaultPreferences({ theme: "dark", language: "ru", fontScale: 5, reduceMotion: true });
  assert.equal(custom.theme, "dark");
  assert.equal(custom.language, "ru");
  assert.equal(custom.fontScale, 1.35);
  assert.equal(custom.reduceMotion, true);
});

test("defaultNotifications: eski/bo'sh qiymatlar to'ldiriladi", () => {
  const d = V.defaultNotifications();
  assert.equal(d.orders, true);
  assert.equal(d.chat, true);
  assert.equal(d.masters, true);
  assert.equal(d.payments, true);
  assert.equal(d.promo, false);
  assert.equal(d.channels.push, true);

  const partial = V.defaultNotifications({ chat: false });
  assert.equal(partial.chat, false);
  assert.equal(partial.orders, true);
  assert.equal(partial.channels.push, true);
});

// ---------------------------------------------------------------- PATCH /me/preferences

test("validatePreferencesPatch: to'g'ri qiymatlar qabul qilinadi", () => {
  const r = V.validatePreferencesPatch({ theme: "dark", language: "en", fontScale: 1.2, reduceMotion: true });
  assert.equal(r.ok, true);
  assert.equal(r.errors.length, 0);
  assert.deepEqual(r.patch, { theme: "dark", language: "en", fontScale: 1.2, reduceMotion: true });
});

test("validatePreferencesPatch: noto'g'ri mavzu/til rad etiladi", () => {
  const r = V.validatePreferencesPatch({ theme: "neon", language: "fr" });
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 2);
  assert.deepEqual(r.patch, {});
});

test("validatePreferencesPatch: noto'g'ri tiplar rad etiladi", () => {
  const r = V.validatePreferencesPatch({ fontScale: "big", reduceMotion: "ha" });
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 2);
});

test("validatePreferencesPatch: bo'sh obyekt — xatosiz (idempotent)", () => {
  const r = V.validatePreferencesPatch({});
  assert.equal(r.ok, true);
  assert.deepEqual(r.patch, {});
});

// ---------------------------------------------------------------- bildirishnoma

test("validateNotificationsPatch: kategoriya va kanal", () => {
  const r = V.validateNotificationsPatch({ chat: false, channels: { push: false } });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { chat: false, channels: { push: false } });
});

test("validateNotificationsPatch: noma'lum kalit/xato turi rad etiladi", () => {
  const bad1 = V.validateNotificationsPatch({ unknown: true });
  assert.equal(bad1.ok, false);
  assert.match(bad1.errors[0], /Noma'lum bildirishnoma kaliti/);

  const bad2 = V.validateNotificationsPatch({ orders: "yes" });
  assert.equal(bad2.ok, false);

  const bad3 = V.validateNotificationsPatch({ channels: { email: true } });
  assert.equal(bad3.ok, false);
  assert.match(bad3.errors[0], /Noma'lum bildirishnoma kanali/);

  const bad4 = V.validateNotificationsPatch({});
  assert.equal(bad4.ok, false);
});

test("shouldNotify: kategoriya va kanal pref'lari qo'llaniladi", () => {
  const off = V.defaultNotifications({ chat: false });
  assert.equal(V.shouldNotify(off, "chat"), false);
  assert.equal(V.shouldNotify(off, "order"), true);

  const pushOff = V.defaultNotifications({ channels: { push: false } });
  assert.equal(V.shouldNotify(pushOff, "order"), false);
  assert.equal(V.shouldNotify(pushOff, "chat"), false);

  // Noma'lum kategoriya bloklanmaydi (xato bo'lsa bildirishnoma ketadi)
  assert.equal(V.shouldNotify({}, "unknown"), true);
});

// ---------------------------------------------------------------- manzillar

test("validateAddressInput: minimal ma'lumot yetarli", () => {
  const r = V.validateAddressInput({ line: "Toshkent, Yunusobod tumani, 12-uy" });
  assert.equal(r.ok, true);
  assert.equal(r.value.line, "Toshkent, Yunusobod tumani, 12-uy");
});

test("validateAddressInput: juda qisqa matn rad etiladi", () => {
  const r = V.validateAddressInput({ line: "ab" });
  assert.equal(r.ok, false);
  assert.equal(r.value, null);
});

test("validateAddressInput: line yo'q bo'lsa xato", () => {
  const r = V.validateAddressInput({ city: "Toshkent" });
  assert.equal(r.ok, false);
  assert.match(r.errors.join(" "), /Manzil kiritilishi shart/);
});

test("validateAddressInput: lat/lng chegarasi", () => {
  assert.equal(V.validateAddressInput({ line: "Toshkent shahri", lat: 41.3, lng: 69.2 }).ok, true);
  assert.equal(V.validateAddressInput({ line: "Toshkent shahri", lat: 999 }).ok, false);
  assert.equal(V.validateAddressInput({ line: "Toshkent shahri", lng: -200 }).ok, false);
});

test("validateAddressInput: matn uzunligi cheklangan", () => {
  const long = "x".repeat(V.ADDRESS_MAX.line + 50);
  const r = V.validateAddressInput({ line: long });
  assert.equal(r.ok, false);
  assert.match(r.errors.join(" "), /juda uzun/);
});

test("validateAddressInput: partial — bo'sh patch rad etiladi", () => {
  const r = V.validateAddressInput({}, { partial: true });
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /Hech qanday maydon/);
});

test("validateAddressInput: partial — faqat izoh o'zgartiriladi", () => {
  const r = V.validateAddressInput({ note: "Eski uy" }, { partial: true });
  assert.equal(r.ok, true);
  assert.equal(r.value.note, "Eski uy");
  assert.equal(r.value.line, undefined);
});

// ---------------------------------------------------------------- usta sozlamalari

test("validateMasterSettingsPatch: radius va holat", () => {
  const r = V.validateMasterSettingsPatch({ coverageRadiusKm: 25, availability: "busy" });
  assert.equal(r.ok, true);
  assert.deepEqual(r.patch, { coverageRadiusKm: 25, availability: "busy" });
});

test("validateMasterSettingsPatch: radius chegarasidan tashqarida", () => {
  assert.equal(V.validateMasterSettingsPatch({ coverageRadiusKm: 0 }).ok, false);
  assert.equal(V.validateMasterSettingsPatch({ coverageRadiusKm: 500 }).ok, false);
  assert.equal(V.validateMasterSettingsPatch({ coverageRadiusKm: 24.6 }).patch.coverageRadiusKm, 25);
});

test("validateMasterSettingsPatch: holat enum'i", () => {
  assert.equal(V.validateMasterSettingsPatch({ availability: "sleepy" }).ok, false);
  V.MASTER_AVAILABILITY.forEach((a) => {
    assert.equal(V.validateMasterSettingsPatch({ availability: a }).ok, true, a);
  });
});

test("validateMasterSettingsPatch: yo'nalishlar tozalangan va unikal", () => {
  const r = V.validateMasterSettingsPatch({ specialties: ["Konditsioner", " Konditsioner ", "", "Kir yuvish"] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.patch.specialties, ["Konditsioner", "Kir yuvish"]);
});

test("validateMasterSettingsPatch: verifikatsiya faqat admin uchun", () => {
  const r = V.validateMasterSettingsPatch({ verification: { status: "approved" } });
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /faqat administrator/);
});

test("isValidVerificationStatus", () => {
  assert.equal(V.isValidVerificationStatus("approved"), true);
  assert.equal(V.isValidVerificationStatus("nope"), false);
  assert.equal(V.isValidVerificationStatus(undefined), false);
});

// ---------------------------------------------------------------- helper'lar

test("isValidLat / isValidLng chegaralari", () => {
  assert.equal(V.isValidLat(90), true);
  assert.equal(V.isValidLat(-90), true);
  assert.equal(V.isValidLat(90.1), false);
  assert.equal(V.isValidLng(180), true);
  assert.equal(V.isValidLng(-180.1), false);
  assert.equal(V.isValidLng("abc"), false);
});

test("trimmed: uzunlik cheklovi va tozalash", () => {
  assert.equal(V.trimmed("  salom  ", 10), "salom");
  assert.equal(V.trimmed("abcdefghij", 5), "abcde");
  assert.equal(V.trimmed(null, 5), "");
});

test("isPlainObject: massiv va null qabul qilinmaydi", () => {
  assert.equal(V.isPlainObject({}), true);
  assert.equal(V.isPlainObject([]), false);
  assert.equal(V.isPlainObject(null), false);
  assert.equal(V.isPlainObject("x"), false);
});

test("supportedNotificationCategories: UI uchun to'liq ro'yxat", () => {
  const list = V.supportedNotificationCategories();
  assert.equal(list.length, 5);
  list.forEach((c) => {
    assert.equal(typeof c.key, "string");
    assert.equal(typeof c.defaultOn, "boolean");
  });
});
