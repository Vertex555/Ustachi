// Marshrut xavfsizligi va ro'lik (authorization) testlari.
// Bu testlar marshrutlarning TO'G'RI middleware bilan himoyalanganini tekshiradi
// (autentifikatsiyasiz yoki ro'lsiz foydalanuvchi kirishiga yo'l yo'qligi).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROUTES_DIR = path.join(__dirname, "..", "src", "routes");

function readRoute(file) {
  return fs.readFileSync(path.join(ROUTES_DIR, file), "utf8");
}

/** Route qatorlarini ajratib, har birini middleware zanjiri bilan qaytaradi. */
function routeLines(src) {
  return src
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^router\.(get|post|patch|put|delete)\(/.test(l));
}

/** Sharhlarni olib tashlaydi — izohdagi so'z kod deb tekshirilmasin. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

test("user.routes: barcha /me* endpointlari authRequired bilan himoyalangan", () => {
  const lines = routeLines(readRoute("user.routes.js"));
  assert.ok(lines.length >= 10, "endpointlar kamroq ko'rinmoqda");
  lines.forEach((l) => {
    assert.match(l, /authRequired/, `authsiz endpoint: ${l}`);
  });
});

test("user.routes: o'chirish / sessiya endpointlari mavjud", () => {
  const src = readRoute("user.routes.js");
  [
    "/me/preferences",
    "/me/notifications",
    "/me/addresses",
    "/me/sessions",
    "/me/logout-all",
    "/me/deletion/request",
    "/me/deletion/confirm",
  ].forEach((p) => {
    assert.ok(src.includes(p), `yo'q endpoint: ${p}`);
  });
});

test("payment.routes: karta to'lovi endpointi faqat 410 qaytaradi", () => {
  const src = readRoute("payment.routes.js");
  assert.ok(src.includes("/orders/:orderId/pay"), "eski endpoint butunlay o'chiring");
  const ctrl = fs.readFileSync(
    path.join(__dirname, "..", "src", "controllers", "payment.controller.js"),
    "utf8"
  );
  assert.match(ctrl, /exports\.pay\s*=\s*async[\s\S]*?status\(410\)/);
  // Soxta to'lov yaratuvchi funksiya qolmasin
  assert.ok(!/chargeCard/.test(stripComments(ctrl)), "soxta chargeCard hali ham bor");
  const service = fs.readFileSync(
    path.join(__dirname, "..", "src", "services", "payment.service.js"),
    "utf8"
  );
  assert.ok(
    !/chargeCard|payForOrder/.test(stripComments(service)),
    "soxta to'lov servisi hali ham bor"
  );
});

test("admin.routes: admin-only endpointlar requireAdmin bilan", () => {
  const lines = routeLines(readRoute("admin.routes.js"));
  assert.ok(lines.length > 0);
  lines.forEach((l) => {
    assert.match(l, /requireAdmin/, `requireAdmin'siz admin marshruti: ${l}`);
  });
});

test("feedback.routes: admin endpointlari requireAdmin bilan", () => {
  const lines = routeLines(readRoute("feedback.routes.js"));
  const adminLines = lines.filter((l) => l.includes("/admin/"));
  assert.ok(adminLines.length >= 2);
  adminLines.forEach((l) => {
    assert.match(l, /requireAdmin/, `requireAdmin'siz: ${l}`);
  });
});

test("karta maxfiy ma'lumotlari saqlanmaydi", () => {
  const ctrl = stripComments(
    fs.readFileSync(
      path.join(__dirname, "..", "src", "controllers", "card.controller.js"),
      "utf8"
    )
  );
  assert.ok(!/encryptCardData|decryptCardData/.test(ctrl), "karta shifrlash kodi qoldi");
  assert.ok(!/cvvEnc\s*:/.test(ctrl), "cvvEnc yozilmoqda");
  assert.ok(!/numberEnc\s*:/.test(ctrl), "numberEnc yozilmoqda");
});

test("Bildirishnoma pref'lari barcha push qo'ng'iroqlarida qo'llaniladi", () => {
  const dir = path.join(__dirname, "..", "src", "controllers");
  const callers = ["order.controller.js", "chat.controller.js", "admin.controller.js"];
  callers.forEach((f) => {
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    const calls = src.match(/sendToUser\(/g) || [];
    const withCategory = src.match(/\{\s*category:\s*"/g) || [];
    assert.equal(
      calls.length,
      withCategory.length,
      `${f}: ${calls.length} ta sendToUser, ${withCategory.length} tasi kategoriyasiz`
    );
  });
});

test("Parol/ token hech qayerda qaytarilmaydi", () => {
  const helpers = fs.readFileSync(
    path.join(__dirname, "..", "src", "utils", "helpers.js"),
    "utf8"
  );
  const serialize = helpers.slice(
    helpers.indexOf("function serializeUser"),
    helpers.indexOf("// serializeUser +")
  );
  assert.ok(!/verificationCode|deleteCode|pushTokens|sessionVersion/.test(serialize));
});
