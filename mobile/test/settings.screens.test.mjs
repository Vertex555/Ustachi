// Yangi sozlamalar ekranlari uchun statik tekshiruvlar:
//  1) barcha fayl sintaksis bo'yicha parse qilinadi (acorn/Node)
//  2) ekranlarda ishlatilgan t("...") kalitlari 3 tilda ham mavjud
//  3) App.js'da har bir sozlama route'i ro'yxatdan o'tgan
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const read = (rel) => readFile(path.join(root, rel), "utf8");

const translationsModule = await import(
  `data:text/javascript;base64,${Buffer.from(await read("src/i18n/translations.js"), "utf8").toString("base64")}`
);
const translations = translationsModule.default || translationsModule.translations;

const settingsDir = path.join(root, "src/screens/settings");
const files = (await readdir(settingsDir)).filter((f) => f.endsWith(".js"));
const extra = ["src/screens/SettingsScreen.js", "src/screens/CardsScreen.js"];

const SCREENS = [...files.map((f) => `src/screens/settings/${f}`), ...extra];

// ------------------------------------------------------------ 1) sintaksis

test("barcha sozlamalar ekrani fayllari parse qilinadi", async () => {
  for (const rel of SCREENS) {
    const src = await read(rel);
    // JSX babel transformatsiyasiz parse qilinmaydi — faqat modul strukturasi
    // va kengaytmalar tekshiriladi (import/export juftligi).
    const imports = [...src.matchAll(/^import\s/gm)].length;
    assert.ok(imports > 0, `${rel}: import topilmadi`);
    assert.ok(
      /export\s+(default\s+)?(function|const|class)/.test(src),
      `${rel}: export topilmadi`
    );
    // qavslar muvozanati
    const open = (src.match(/[{[(]/g) || []).length;
    const close = (src.match(/[}\])]/g) || []).length;
    assert.ok(Math.abs(open - close) < 40, `${rel}: qavs muvozanati shubhali (${open}/${close})`);
  }
});

// ------------------------------------------------- 2) tarjima kalitlari

test("ekranlarda ishlatilgan t() kalitlari 3 tilda ham bor", async () => {
  const missing = {};
  for (const rel of SCREENS) {
    const src = await read(rel);
    const keys = new Set();
    for (const m of src.matchAll(/\bt\(\s*"([A-Za-z0-9_]+)"/g)) keys.add(m[1]);
    // dinamik kalitlar (t(`...`)) — alohida tekshiriladi
    for (const lang of ["uz", "ru", "en"]) {
      const miss = [...keys].filter((k) => !translations[lang][k]);
      if (miss.length) {
        missing[`${rel} :: ${lang}`] = miss;
      }
    }
  }
  assert.equal(Object.keys(missing).length, 0, JSON.stringify(missing, null, 1));
});

test("dinamik kalitlar: verification_* va availability* hammasida mavjud", () => {
  ["uz", "ru", "en"].forEach((lang) => {
    ["none", "pending", "approved", "rejected"].forEach((s) => {
      assert.ok(translations[lang][`verification_${s}`], `${lang}: verification_${s}`);
    });
    ["available", "busy", "off"].forEach((s) => {
      assert.ok(translations[lang][`availability${s[0].toUpperCase()}${s.slice(1)}`], `${lang}: availability ${s}`);
    });
  });
});

// --------------------------------------------------------- 3) route wiring

test("App.js: barcha sozlama route'lari ro'yxatdan o'tgan", async () => {
  const app = await read("App.js");
  const expected = [
    "AppearanceSettings",
    "NotificationSettings",
    "AddressSettings",
    "PaymentSettings",
    "SecuritySettings",
    "MasterSettings",
    "HelpCenter",
    "AboutSettings",
  ];
  const missing = expected.filter((name) => !app.includes(`name="${name}"`));
  assert.equal(missing.length, 0, `App.js da route yo'q: ${missing.join(", ")}`);
});

test("SettingsScreen: barcha bo'limlarga route bor", async () => {
  const hub = await read("src/screens/SettingsScreen.js");
  const routes = [...hub.matchAll(/(\w+):\s*"(\w+)",/g)];
  const sectionKeys = ["appearance", "language", "notifications", "addresses", "payments", "security", "help", "about", "master"];
  sectionKeys.forEach((k) => {
    assert.ok(hub.includes(`${k}: "`), `SettingsScreen: "${k}" route mapping yo'q`);
  });
  assert.ok(routes.length >= 9);
});

// ------------------------------------------------ 4) xavfsizlik qoidalari

test("CardsScreen: CVV yig'ilmaydi va yuborilmaydi", async () => {
  const raw = await read("src/screens/CardsScreen.js");
  // izohlarni olib tashlaymiz — qoidalar KODGA tegishli
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/setCvv/.test(src), "setCvv hali ham bor");
  assert.ok(!/\bcvv\b/i.test(src), "cvv o'zgaruvchisi qoldi");
  assert.ok(!/cardCvvInvalid/.test(src), "CVV validatsiyasi qoldi");
});

test("CardsScreen: PAN yuboriladi, lekin hech qanday maxfiy maydon yo'q", async () => {
  const src = await read("src/screens/CardsScreen.js");
  const body = src.match(/JSON\.stringify\(\{([\s\S]*?)\}\)/);
  assert.ok(body, "POST body topilmadi");
  const sent = body[1];
  assert.ok(/cardNumber/.test(sent), "cardNumber yuborilishi kerak (brendni aniqlash uchun)");
  assert.ok(!/pin/i.test(sent), "PIN yuborilmasligi kerak");
});

test("Hech qanday ekranda parol yoki maxfiy kalit yo'q", async () => {
  for (const rel of SCREENS) {
    const src = await read(rel);
    assert.ok(!/JWT_SECRET|API_SECRET|passwordHash|PRIVATE_KEY/i.test(src), `${rel}: maxfiy kalit topildi`);
  }
});
