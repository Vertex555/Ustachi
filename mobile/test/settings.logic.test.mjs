// Sozlamalar mantiqini test qilish (node --test).
// Ishga tushirish: npm test
//
// src/settings/logic.js — sof ESM modul bo'lib, hech qanday React Native
// importi qilmaydi. Shuning uchun uni data: URL orqali to'g'ridan-to'g'ri
// import qilamiz (Node uni har doim ESM sifatida baholaydi).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

async function importSource(relPath) {
  const file = path.join(here, "..", relPath);
  const src = await readFile(file, "utf8");
  const b64 = Buffer.from(src, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${b64}`);
}

const L = await importSource("src/settings/logic.js");
const translationsModule = await importSource("src/i18n/translations.js");
const translations = translationsModule.default || translationsModule.translations;

// ---------------------------------------------------------------- mavzu

test("normalizeTheme: system | light | dark", () => {
  assert.equal(L.normalizeTheme("light"), "light");
  assert.equal(L.normalizeTheme("DARK"), "dark");
  assert.equal(L.normalizeTheme(" system "), "system");
  assert.equal(L.normalizeTheme("neon"), "system");
  assert.equal(L.normalizeTheme(undefined, "dark"), "dark");
});

test("resolveTheme: 'system' qurilma rejimiga qaradi", () => {
  assert.equal(L.resolveTheme("system", "dark"), "dark");
  assert.equal(L.resolveTheme("system", "light"), "light");
  assert.equal(L.resolveTheme("system", null), "light");
  assert.equal(L.resolveTheme("system", undefined), "light");
  // Aniq tanlangan rejim qurilma rejimini hisobga olmaydi
  assert.equal(L.resolveTheme("light", "dark"), "light");
  assert.equal(L.resolveTheme("dark", "light"), "dark");
});

test("resolveTheme: noma'lum qiymat xavfsiz (light) qoladi", () => {
  assert.equal(L.resolveTheme("nope", "dark"), "dark");
  assert.equal(L.resolveTheme("nope", undefined), "light");
});

test("preferences: saqlash -> o'qish -> boshqarish", () => {
  // Foydalanuvchi "dark" tanladi
  const patch = L.preferencesPatch({}, { theme: "dark" });
  assert.deepEqual(patch, { theme: "dark" });

  // Serverdan kelgan qiymat bilan bir xil bo'lishi kerak
  const next = L.defaultPreferences({ ...L.defaultPreferences({}), ...patch });
  assert.equal(next.theme, "dark");
  assert.equal(next.language, "uz");
  assert.equal(next.fontScale, 1);
  assert.equal(next.reduceMotion, false);

  // O'zgarish yo'q bo'lsa — serverga hech narsa yuborilmaydi
  assert.deepEqual(L.preferencesPatch(next, { theme: "dark" }), {});
});

// ---------------------------------------------------------------- til

test("normalizeLanguage: uz | ru | en", () => {
  assert.equal(L.normalizeLanguage("RU"), "ru");
  assert.equal(L.normalizeLanguage("en"), "en");
  assert.equal(L.normalizeLanguage("fr"), "uz");
  assert.equal(L.normalizeLanguage(undefined, "en"), "en");
});

test("preferencesPatch: til o'zgarishi serverga uzatiladi", () => {
  const patch = L.preferencesPatch({ language: "uz" }, { language: "ru" });
  assert.deepEqual(patch, { language: "ru" });
});

// ---------------------------------------------------------------- shrift

test("clampFontScale: chegarada va 0.05 qadam", () => {
  assert.equal(L.clampFontScale(1), 1);
  assert.equal(L.clampFontScale(0.1), 0.8);
  assert.equal(L.clampFontScale(99), 1.35);
  assert.equal(L.clampFontScale(1.2), 1.2); // float nuqsoni yo'q
  assert.equal(L.clampFontScale("1.13"), 1.15);
  assert.equal(L.clampFontScale("abc"), 1);
  assert.equal(L.clampFontScale(0), 1);
});

test("FONT_SCALE_STEPS: server chegaralariga sig'adi", () => {
  L.FONT_SCALE_STEPS.forEach((s) => {
    assert.ok(s >= L.FONT_SCALE_MIN && s <= L.FONT_SCALE_MAX, `${s} chegaradan tashqarida`);
  });
  assert.ok(L.FONT_SCALE_STEPS.includes(1), "100% o'lcham bo'lishi shart");
});

// ---------------------------------------------------------------- bildirishnoma

test("defaultNotifications: 5 kategoriya + push kanali", () => {
  const n = L.defaultNotifications();
  assert.equal(Object.keys(n.channels).length, 1);
  assert.equal(n.channels.push, true);
  L.NOTIFICATION_CATEGORIES.forEach((c) => {
    assert.equal(typeof n[c.key], "boolean", `${c.key} yo'q`);
  });
  assert.equal(n.promo, false, "reklamalar sukut bo'yicha o'chiq");
});

test("bildirishnoma pref'i saqlanadi va tiklanadi", () => {
  const patch = L.notificationPatch({}, { chat: false, promo: true });
  assert.deepEqual(patch, { chat: false, promo: true });
  const saved = L.defaultNotifications({ ...L.defaultNotifications(), ...patch });
  assert.equal(L.isCategoryEnabled(saved, "chat"), false);
  assert.equal(L.isCategoryEnabled(saved, "promo"), true);
  assert.equal(L.isCategoryEnabled(saved, "orders"), true);
});

test("push kanal o'chirilsa — hech qanday kategoriya yuborilmaydi", () => {
  const n = L.defaultNotifications({ channels: { push: false }, orders: true });
  assert.equal(L.isCategoryEnabled(n, "orders"), false);
  assert.equal(L.isCategoryEnabled(n, "chat"), false);
});

test("notificationPatch: noto'g'ri turdagi qiymat yuborilmaydi", () => {
  assert.deepEqual(L.notificationPatch({}, { chat: "no" }), {});
});

// ---------------------------------------------------------------- manzillar

test("validateAddress: minimal ma'lumot", () => {
  const r = L.validateAddress({ line: "Toshkent, Chilonzor, 5-uy" });
  assert.equal(r.ok, true);
  assert.equal(r.value.line, "Toshkent, Chilonzor, 5-uy");
});

test("validateAddress: xato kalitlari", () => {
  assert.equal(L.validateAddress({ line: "ab" }).errors[0], "addressLineTooShort");
  assert.equal(L.validateAddress({}).errors[0], "addressLineRequired");
  assert.equal(
    L.validateAddress({ line: "x".repeat(L.ADDRESS_MAX.line + 1) }).errors[0],
    "addressLineTooLong"
  );
  assert.equal(L.validateAddress({ line: "Toshkent shahri", lat: 100 }).errors[0], "addressLatInvalid");
  assert.equal(L.validateAddress({ line: "Toshkent shahri", lng: -300 }).errors[0], "addressLngInvalid");
});

test("validateAddress: partial — bo'sh patch rad etilmaydi", () => {
  const r = L.validateAddress({ note: "eski uy" }, { partial: true });
  assert.equal(r.ok, true);
  assert.equal(r.value.note, "eski uy");
  assert.equal(r.value.line, undefined);
});

test("validateAddress: validatsiya kalitlari tarjimada bor", () => {
  const keys = [
    "addressLineTooShort",
    "addressLineRequired",
    "addressLineTooLong",
    "addressLatInvalid",
    "addressLngInvalid",
  ];
  ["uz", "ru", "en"].forEach((lang) => {
    keys.forEach((k) => {
      assert.ok(translations[lang][k], `${lang}: "${k}" tarjimasi yo'q`);
    });
  });
});

// ---------------------------------------------------------------- usta

test("validateMasterForm: radius va holat", () => {
  const r = L.validateMasterForm({ coverageRadiusKm: 30, availability: "busy" });
  assert.equal(r.ok, true);
  assert.equal(r.value.coverageRadiusKm, 30);
  assert.equal(r.value.availability, "busy");
});

test("validateMasterForm: radius chegarasi", () => {
  assert.equal(L.validateMasterForm({ coverageRadiusKm: 0 }).ok, false);
  assert.equal(L.validateMasterForm({ coverageRadiusKm: 999 }).ok, false);
  assert.equal(L.validateMasterForm({ coverageRadiusKm: 24.6 }).value.coverageRadiusKm, 25);
});

test("validateMasterForm: yo'nalishlar unikal va cheklangan", () => {
  const r = L.validateMasterForm({ specialties: ["Kir yuvish", " Kir yuvish ", "", "Konditsioner"] });
  assert.deepEqual(r.value.specialties, ["Kir yuvish", "Konditsioner"]);

  const many = Array.from({ length: L.MAX_SPECIALTIES + 1 }, (_, i) => `x${i}`);
  assert.equal(L.validateMasterForm({ specialties: many }).ok, false);
});

test("validateMasterForm: narx manfiy bo'lmaydi", () => {
  assert.equal(L.validateMasterForm({ price: -1 }).ok, false);
  assert.equal(L.validateMasterForm({ price: 50000 }).value.price, 50000);
  assert.equal(L.validateMasterForm({ price: "" }).ok, true);
});

// ---------------------------------------------------------------- ro'lik

test("settingsSectionsForRole: ustaga xos bo'lim faqat masterda", () => {
  const master = L.settingsSectionsForRole("master");
  const user = L.settingsSectionsForRole("user");
  assert.ok(master.includes("master"));
  assert.ok(user.includes("master"));
  assert.ok(!L.settingsSectionsForRole("guest").includes("master"));
  assert.ok(!L.settingsSectionsForRole(null).includes("master"));
});

test("settingsSectionsForRole: admin uchun master bo'limi yashiriladi", () => {
  const admin = L.settingsSectionsForRole("admin", { isAdmin: true });
  assert.ok(!admin.includes("master"));
});

// ---------------------------------------------------------------- tarjima

test("tarjimalar: uz / ru / en bir xil kalit to'plamiga ega", () => {
  const base = Object.keys(translations.uz).sort();
  ["ru", "en"].forEach((lang) => {
    const keys = Object.keys(translations[lang]).sort();
    const missing = base.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !base.includes(k));
    assert.equal(missing.length, 0, `${lang}: yetishmayotgan kalitlar -> ${missing.slice(0, 12).join(", ")}`);
    assert.equal(extra.length, 0, `${lang}: ortiqcha kalitlar -> ${extra.slice(0, 12).join(", ")}`);
  });
});

test("tarjimalar: sozlamalar bo'limlari uchun barcha kalitlar mavjud", () => {
  const required = [
    "settings", "settingsSubtitle",
    "sectionAppearance", "sectionLanguage", "sectionNotifications", "sectionAddresses",
    "sectionPayments", "sectionSecurity", "sectionHelp", "sectionAbout", "sectionMaster",
    "appearance", "theme", "themeSystem", "themeLight", "themeDark", "systemThemeNote",
    "accentColor", "fontSize", "fontSizeNote", "reduceMotion", "reduceMotionNote",
    "notifications", "notificationsNote", "notificationOrders", "notificationChat",
    "notificationMasters", "notificationPayments", "notificationPromo", "pushChannel",
    "addresses", "addressesNote", "addAddress", "defaultAddress", "setDefault",
    "deleteAddressConfirm", "addressEmpty", "addressSaved", "addressDeleted",
    "payments", "paymentHistory", "paymentCards", "paymentMethods", "cardPaymentsDisabled",
    "security", "securityNote", "changePhone", "activeSessions", "activeSessionsNote",
    "currentSession", "logoutAll", "revokeSession", "sessionRevoked",
    "help", "helpCenter", "faq", "contactSupport", "supportRequest",
    "about", "appVersion", "privacyPolicy", "termsOfService", "openSourceLicenses",
    "masterSettings", "masterSettingsNote", "specialties", "specialtiesNote",
    "serviceArea", "coverageRadius", "availability", "availabilityAvailable",
    "availabilityBusy", "availabilityOff", "profileStatus", "profilePublished",
    "profileHidden", "verification", "earnings", "signOut", "signOutConfirm",
    "deleteAccount", "deleteAccountWarning", "deleteAccountConfirm",
  ];
  const missingByLang = {};
  ["uz", "ru", "en"].forEach((lang) => {
    missingByLang[lang] = required.filter((k) => !translations[lang][k]);
  });
  const total = Object.values(missingByLang).flat().length;
  assert.equal(total, 0, `yetishmayotgan kalitlar: ${JSON.stringify(missingByLang)}`);
});

test("tarjimalar: bo'sh yoki 'undefined' qiymat yo'q", () => {
  ["uz", "ru", "en"].forEach((lang) => {
    Object.entries(translations[lang]).forEach(([k, v]) => {
      assert.ok(typeof v === "string" && v.trim().length > 0, `${lang}.${k} bo'sh`);
    });
  });
});
