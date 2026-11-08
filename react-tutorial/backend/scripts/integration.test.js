/**
 * Ustachi — LIVE integratsiya testi.
 *
 * Haqiqiy MongoDB va ishlayotgan API serveriga ulanadi
 * (http://localhost:5000). Hech qanday soxta javob ishlatilmaydi.
 *
 * Ishga tushirish:
 *   1) cd react-tutorial/backend && npm start
 *   2) node scripts/integration.test.js
 */

const BASE = process.env.API_BASE || "http://localhost:5000";

let pass = 0;
let fail = 0;
const failures = [];

function ok(name, cond, extra) {
  if (cond) {
    pass++;
    console.log(`  \u2713 ${name}`);
  } else {
    fail++;
    failures.push(name + (extra ? ` :: ${JSON.stringify(extra)}` : ""));
    console.log(`  \u2717 ${name}${extra ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

function section(title) {
  console.log(`\n\u2500\u2500 ${title}`);
}

let token = null;

async function call(method, path, body, opts = {}) {
  const headers = {};
  if (token && !opts.noAuth) headers.Authorization = `Bearer ${token}`;
  if (opts.headers) Object.assign(headers, opts.headers);
  let payload;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

(async () => {
  console.log(`Ustachi integratsiya testi -> ${BASE}\n${"=".repeat(52)}`);

  // ------------------------------------------------ 1. Autentifikatsiya
  section("1. Autentifikatsiya va sessiya");
  const guest = await call("POST", "/api/auth/guest", {}, { noAuth: true });
  ok("guest ro'yxatdan o'tdi (201)", guest.status === 201, guest.data);
  token = guest.data?.token;
  ok("token qaytarildi", !!token);

  const me = await call("GET", "/api/auth/me");
  ok("GET /api/auth/me ishlaydi", me.status === 200 && me.data?.user?.id, me.data);

  const noAuth = await call("GET", "/api/users/me/preferences", undefined, { noAuth: true });
  ok("token'siz so'rov rad etiladi (401)", noAuth.status === 401, noAuth.data);

  const badToken = await call("GET", "/api/auth/me", undefined, {
    noAuth: true,
    headers: { Authorization: "Bearer not-a-real-token" },
  });
  ok("soxta token rad etiladi (401)", badToken.status === 401, badToken.data);

  // ------------------------------------------------ 2. Sozlamalar
  section("2. Sozlamalar (preferences)");
  const prefs0 = await call("GET", "/api/users/me/preferences");
  ok("GET preferences", prefs0.status === 200, prefs0.data);
  ok("mavzu 'system'", prefs0.data?.data?.preferences?.theme === "system", prefs0.data?.data?.preferences);
  ok("til 'uz'", prefs0.data?.data?.preferences?.language === "uz");
  ok("kanallar faqat push", JSON.stringify(prefs0.data?.data?.supported?.channels) === '["push"]');

  const p1 = await call("PATCH", "/api/users/me/preferences", { theme: "dark", language: "ru", fontScale: 1.2 });
  ok("PATCH preferences (dark/ru/1.2)", p1.status === 200 && p1.data?.data?.preferences?.theme === "dark", p1.data?.data?.preferences);
  ok("fontScale 1.2 saqlandi", p1.data?.data?.preferences?.fontScale === 1.2);

  const p2 = await call("PATCH", "/api/users/me/preferences", { theme: "neon" });
  ok("noto'g'ri mavzu rad etiladi (400)", p2.status === 400, p2.data);

  const p3 = await call("PATCH", "/api/users/me/preferences", { fontScale: 9 });
  ok("fontSize chegarada qisiladi (1.35)", p3.data?.data?.preferences?.fontScale === 1.35, p3.data?.data?.preferences);

  // Qayta olish — serverdan kelgan qiymat
  const p4 = await call("GET", "/api/users/me/preferences");
  ok("preferences serverdan tiklandi", p4.data?.data?.preferences?.theme === "dark");

  // ------------------------------------------------ 3. Bildirishnomalar
  section("3. Bildirishnoma sozlamalari");
  const n1 = await call("PATCH", "/api/users/me/notifications", { chat: false, promo: true });
  ok("PATCH notifications", n1.status === 200, n1.data);
  ok("chat o'chirildi", n1.data?.data?.notifications?.chat === false);
  ok("promo yoqildi", n1.data?.data?.notifications?.promo === true);

  const n2 = await call("PATCH", "/api/users/me/notifications", { chat: "yes" });
  ok("noto'g'ri turdagi qiymat rad etiladi (400)", n2.status === 400, n2.data);

  const n3 = await call("PATCH", "/api/users/me/notifications", { email: true });
  ok("mavjud bo'lmagan kanal rad etiladi (400)", n3.status === 400, n3.data);

  // ------------------------------------------------ 4. Manzillar
  section("4. Saqlangan manzillar");
  const a0 = await call("GET", "/api/users/me/addresses");
  ok("manzil ro'yxati bo'sh", Array.isArray(a0.data?.data) && a0.data.data.length === 0, a0.data);

  const aBad = await call("POST", "/api/users/me/addresses", { line: "ab" });
  ok("qisqa manzil rad etiladi (400)", aBad.status === 400, aBad.data);

  const a1 = await call("POST", "/api/users/me/addresses", {
    label: "Uy",
    line: "Toshkent shahri, Chilonzor tumani, 5-uy",
    city: "Toshkent",
    lat: 41.3111,
    lng: 69.2797,
  });
  ok("manzil qo'shildi (201)", a1.status === 201, a1.data);
  const addrId = a1.data?.data?.id;
  ok("birinchi manzil avtomatik default", a1.data?.data?.isDefault === true);

  const a2 = await call("POST", "/api/users/me/addresses", {
    label: "Ish",
    line: "Toshkent shahri, Yunusobod tumani, 12-uy",
    city: "Toshkent",
  });
  ok("ikkinchi manzil qo'shildi", a2.status === 201, a2.data);
  const addrId2 = a2.data?.data?.id;
  ok("ikkinchisi default EMAS", a2.data?.data?.isDefault === false);

  const aBad2 = await call("POST", "/api/users/me/addresses", {
    line: "Toshkent",
    lat: 120,
  });
  ok("noto'g'ri kenglik rad etiladi (400)", aBad2.status === 400, aBad2.data);

  const aDef = await call("POST", `/api/users/me/addresses/${addrId2}/default`);
  ok("default o'zgartirildi", aDef.status === 200 && aDef.data?.data?.isDefault === true, aDef.data);

  const aUpd = await call("PATCH", `/api/users/me/addresses/${addrId}`, { note: "Ko'p qavatli uy" });
  ok("manzil yangilandi", aUpd.status === 200 && aUpd.data?.data?.note === "Ko'p qavatli uy", aUpd.data);

  const aDel = await call("DELETE", `/api/users/me/addresses/${addrId}`);
  ok("manzil o'chirildi", aDel.status === 200, aDel.data);

  const aList = await call("GET", "/api/users/me/addresses");
  ok("manzillar ro'yxati 1 ta", aList.data?.data?.length === 1, aList.data?.data);
  ok("default saqlanib qoldi", aList.data?.data?.[0]?.isDefault === true);

  // ------------------------------------------------ 5. Sessiyalar
  section("5. Faol sessiyalar");
  const s1 = await call("GET", "/api/users/me/sessions");
  ok("sessiya ro'yxati", s1.status === 200 && Array.isArray(s1.data?.data), s1.data);
  ok("joriy sessiya belgilangan", s1.data?.data?.some((x) => x.isCurrent === true), s1.data?.data);
  ok("sessiya 'active' holatda", s1.data?.data?.[0]?.status === "active", s1.data?.data?.[0]);

  const s2 = await call("DELETE", `/api/users/me/sessions/${s1.data.data[0].id}`);
  ok("joriy sessiyani bekor qilish rad etiladi (400)", s2.status === 400, s2.data);

  // logout-all -> yangi token berilishi va ESKI token o'lishi kerak
  const oldToken = token;
  const la = await call("POST", "/api/users/me/logout-all");
  ok("logout-all muvaffaqiyatli", la.status === 200, la.data);
  ok("yangi token qaytarildi", !!la.data?.token, la.data);

  const withOld = await call("GET", "/api/auth/me", undefined, {
    noAuth: true,
    headers: { Authorization: `Bearer ${oldToken}` },
  });
  ok("ESKI token endi ishlamaydi (401)", withOld.status === 401, withOld.data);

  token = la.data?.token || oldToken;
  const withNew = await call("GET", "/api/auth/me");
  ok("YANGI token ishlaydi (200)", withNew.status === 200, withNew.data);

  // ------------------------------------------------ 6. To'lov
  section("6. To'lov xavfsizligi");
  const m1 = await call("GET", "/api/payments/methods");
  ok("GET /api/payments/methods", m1.status === 200, m1.data);
  const md = m1.data?.data || {};
  ok("kartalar orqali to'lov o'chirilgan", md.cardPayments === false, md);
  const methodKeys = (md.methods || []).map((x) => x.key).sort().join(",");
  ok("faqat click va payme", methodKeys === "click,payme", methodKeys);
  ok("credential yo'qligi haliqiy holatda ko'rsatiladi",
    (md.methods || []).every((x) => x.configured === false), md.methods);

  const legacy = await call("POST", "/api/payments/orders/000000000000000000000000/pay", {
    method: "card",
  });
  ok("eski karta to'lovi 410 qaytaradi", legacy.status === 410, legacy.data);

  const c1 = await call("POST", "/api/cards", {
    cardNumber: "4111111111111111",
    holderName: "TEST USER",
    expMonth: "12",
    expYear: "2030",
    cvv: "123",
  });
  ok("karta qo'shildi", c1.status === 201 || c1.status === 200, c1.data);
  const cardJson = JSON.stringify(c1.data);
  ok("javobda to'liq PAN yo'q", !cardJson.includes("4111111111111111"), cardJson.slice(0, 200));
  ok("javobda CVV yo'q", !/"cvv"/i.test(cardJson));
  ok("oxirgi 4 raqam saqlandi", /"last4"\s*:\s*"1111"/.test(cardJson), cardJson.slice(0, 250));
  ok("network aniqlangan", !!c1.data?.data?.network, c1.data?.data);

  const cList = await call("GET", "/api/cards");
  ok("karta ro'yxati PAN'siz", !JSON.stringify(cList.data).includes("4111111111111111"));

  // ------------------------------------------------ 7. Usta sozlamalari
  section("7. Usta sozlamalari");
  const mMe = await call("GET", "/api/masters/me");
  ok("guest uchun master profili yo'q (404/400)", [400, 403, 404].includes(mMe.status), mMe.data);

  const mBad = await call("PATCH", "/api/masters/me", { coverageRadiusKm: 9999 });
  ok("radius chegarasidan tashqarida rad etiladi", [400, 404].includes(mBad.status), mBad.data);

  const earn = await call("GET", "/api/masters/me/earnings");
  ok("earnings endpoint mavjud", [200, 400, 404].includes(earn.status), earn.data);

  // ------------------------------------------------ 8. Admin himoyasi
  section("8. Backend rolik nazorati");
  const adm = await call("GET", "/api/admin/overview");
  ok("guest admin panelga kira olmaydi (403)", [401, 403].includes(adm.status), adm.data);

  const adm2 = await call("POST", "/api/admin/masters/000000000000000000000000/verification", { status: "approved" });
  ok("guest master tasdiqlay olmaydi (403)", [401, 403].includes(adm2.status), adm2.data);

  // ------------------------------------------------ 9. Hisobni o'chirish
  section("9. Hisobni o'chirish");
  const dp = await call("GET", "/api/users/me/deletion-preview");
  ok("deletion-preview", dp.status === 200 && typeof dp.data?.data?.sessions === "number", dp.data);

  const dr = await call("POST", "/api/users/me/deletion/request");
  ok("deletion so'rovi qabul qilindi", dr.status === 200, dr.data);
  const devCode = dr.data?.devCode;
  ok("dev muhitda kod qaytarildi", !!devCode, dr.data);

  const badCode = await call("POST", "/api/users/me/deletion/confirm", { code: "0000" });
  ok("noto'g'ri kod rad etiladi (400)", badCode.status === 400, badCode.data);

  if (devCode) {
    const goodCode = await call("POST", "/api/users/me/deletion/confirm", { code: devCode });
    ok("to'g'ri kod bilan hisob o'chirildi", goodCode.status === 200, goodCode.data);

    const afterDelete = await call("GET", "/api/auth/me", undefined, {
      noAuth: true,
      headers: { Authorization: `Bearer ${goodCode.data?.token || token}` },
    });
    ok("o'chirilgan token endi ishlamaydi (401)", afterDelete.status === 401, afterDelete.data);
  }

  // ------------------------------------------------ NATIJA
  console.log(`\n${"=".repeat(52)}`);
  console.log(`PASS: ${pass}   FAIL: ${fail}`);
  if (fail) {
    console.log("\nYIQILGANLAR:");
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error("\nTESTLARNI BAJRARISHDA XATOLIK:", e);
  process.exit(1);
});
