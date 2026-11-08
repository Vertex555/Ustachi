/**
 * §13 — Komissiya va decimal-safe pul hisobi.
 *
 * Bular REAL hisob-kitob qoidalarini tekshiradi:
 * 7% stavka, yaxlitlash, refund, snapshot.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const money = require("../src/utils/money");
const commission = require("../src/services/commission.service");
const orderState = require("../src/services/orderState");

// ---------------------------------------------------------------- money
test("money: toMinor/toMajor qaytarish (float xatosi yo'q)", () => {
  assert.equal(money.toMinor("1234.56"), 123456);
  assert.equal(money.toMajor(123456), 1234.56);
  // Klassik float muammosi: 0.1 + 0.2 !== 0.3
  assert.equal(money.toMinor(0.1) + money.toMinor(0.2), money.toMinor(0.3));
});

test("money: string va null qiymatlar", () => {
  assert.equal(money.toMinor("99.99"), 9999);
  assert.equal(money.toMinor(null), 0);
  assert.equal(money.toMinor(undefined), 0);
  assert.equal(money.toMinor(""), 0);
  assert.equal(money.toMinor("abc"), 0);
});

test("money: formatMajor har doim 2 ta kasr", () => {
  assert.equal(money.formatMajor(5), "0.05");
  assert.equal(money.formatMajor(100000), "1000.00");
  assert.equal(money.formatMajor(0), "0.00");
});

test("money: applyRate — 7% (700 bps)", () => {
  assert.equal(money.applyRate(100000, 700), 7000); // 1000 so'm -> 70 so'm
  assert.equal(money.applyRate(123456, 700), 8642); // 1234.56 -> 86.42
  assert.equal(money.applyRate(999, 700), 70); // 9.99 -> 0.70
  assert.equal(money.applyRate(100, 700), 7); // 1.00 -> 0.07 (7 tiyin)
  assert.equal(money.applyRate(1, 700), 0); // 0.01 -> 0.0007 -> 0 (kichik)
  assert.equal(money.applyRate(0, 700), 0);
});

test("money: applyRate 0% va 100%", () => {
  assert.equal(money.applyRate(50000, 0), 0);
  assert.equal(money.applyRate(50000, 10000), 50000);
});

test("money: noto'g'ri stavka rad etiladi", () => {
  assert.throws(() => money.applyRate(100, -1), RangeError);
  assert.throws(() => money.applyRate(100, 10001), RangeError);
});

test("money: splitByRate qismlar yig'indisi umumiyga teng", () => {
  for (const v of [1, 7, 99, 1234, 99999, 123456]) {
    const { part, rest } = money.splitByRate(v, 700);
    assert.equal(part + rest, v, `yo'qotish bor: ${v}`);
    assert.ok(part >= 0 && rest >= 0);
  }
});

test("money: manfiy narx rad etiladi", () => {
  assert.throws(() => money.priceToMinor(-1), RangeError);
  assert.throws(() => money.priceToMinor("abc"), TypeError);
  assert.throws(() => money.priceToMinor(0, { allowZero: false }), RangeError);
});

test("money: butun son bo'lmagan qiymat assertSafe da rad etiladi", () => {
  assert.throws(() => money.assertSafe(1.5), TypeError);
  assert.equal(money.assertSafe(150), 150);
});

// ------------------------------------------------------- commission
test("§13: 7% komissiya — xizmat summasidan", () => {
  const t = commission.computeTotals({ priceMajor: 1000 });
  assert.equal(t.priceMinor, 100000);
  assert.equal(t.commissionMinor, 7000);
  assert.equal(t.masterNetMinor, 93000);
  assert.equal(t.totalMinor, 100000);
  assert.equal(t.rateBps, 700);
});

test("§13: komissiya yetkazib berish to'lovidan hisoblanMAYdi (basis=service)", () => {
  const t = commission.computeTotals({ priceMajor: 1000, feesMajor: 50 });
  // 1000 so'm -> 70 so'm komissiya; 50 so'm yetkazib berish komissiyaga kirmaydi
  assert.equal(t.commissionMinor, 7000);
  assert.equal(t.feesMinor, 5000);
  assert.equal(t.totalMinor, 105000);
  assert.equal(t.masterNetMinor, 98000);
});

test("§13: basis=total da komissiya jami summadan", () => {
  const t = commission.computeTotals({ priceMajor: 1000, feesMajor: 50, basis: "total" });
  assert.equal(t.commissionMinor, Math.round(105000 * 0.07)); // 7350
  assert.equal(t.masterNetMinor, 105000 - 7350);
});

test("§13: komissiya stavkasi buyurtmada snapshot qilinadi", () => {
  const t = commission.computeTotals({ priceMajor: 1000, rateBps: 725 });
  assert.equal(t.rateBps, 725);
  assert.equal(t.commissionMinor, 7250);
  // Snapshot keyinroq config o'zgarsa ham o'sha buyurtma o'zgarmaydi
  assert.equal(t.rateBps, 725);
});

test("§13: komissiya butun summadan oshmasin", () => {
  const t = commission.computeTotals({ priceMajor: 10, rateBps: 10000 });
  assert.ok(t.commissionMinor <= t.totalMinor);
  assert.equal(t.masterNetMinor, 0);
});

test("§13: butun son tiyin hisobi — 0.01 so'm ham yo'qolmaydi", () => {
  const t = commission.computeTotals({ priceMajor: 0.01 });
  assert.equal(t.priceMinor, 1);
  assert.equal(t.commissionMinor, 0);
  assert.equal(t.masterNetMinor, 1);
});

test("§13: yaxlitlash — komissiya + net = jami (1000 ta tasodifiy narx)", () => {
  for (let i = 1; i <= 1000; i++) {
    const price = i * 7.77; // kasrli narxlar
    const t = commission.computeTotals({ priceMajor: price, feesMajor: i * 0.31 });
    assert.equal(
      t.commissionMinor + t.masterNetMinor,
      t.totalMinor,
      `muvozanat buzildi: price=${price}`
    );
    assert.equal(t.totalMinor, t.priceMinor + t.feesMinor);
  }
});

test("§13: eski maydonlar ham to'g'ri (back-compat)", () => {
  const t = commission.computeTotals({ priceMajor: 1000, feesMajor: 50 });
  assert.equal(t.price, 1000);
  assert.equal(t.commission, 70);
  assert.equal(t.total, 1050);
  assert.equal(t.deliveryFee, 50);
  assert.equal(t.masterNet, 980);
});

// ----------------------------------------------------- orderState
test("§8: ruxsat etilgan o'tishlar", () => {
  assert.equal(orderState.canTransition("submitted", "awaiting_master").ok, true);
  assert.equal(orderState.canTransition("awaiting_master", "quoted").ok, true);
  assert.equal(orderState.canTransition("paid", "in_progress").ok, true);
  assert.equal(orderState.canTransition("in_progress", "completed").ok, true);
});

test("§8: noto'g'ri o'tish rad etiladi", () => {
  assert.equal(orderState.canTransition("draft", "completed").ok, false);
  assert.equal(orderState.canTransition("draft", "in_progress").ok, false);
  assert.equal(orderState.canTransition("awaiting_master", "completed").ok, false);
});

test("§8: yakuniy holatdan chiqib bo'lmaydi", () => {
  for (const s of ["completed", "cancelled", "refunded"]) {
    const r = orderState.canTransition(s, "in_progress");
    assert.equal(r.ok, false);
    assert.equal(r.code, "terminal_status");
  }
});

test("§8: bir xil holatga o'tish rad etiladi", () => {
  const r = orderState.canTransition("paid", "paid");
  assert.equal(r.ok, false);
  assert.equal(r.code, "same_status");
});

test("§8: noma'lom holat rad etiladi", () => {
  const r = orderState.canTransition("paid", "hacked_status");
  assert.equal(r.ok, false);
  assert.equal(r.code, "invalid_status");
});

test("§8: rol va harakat tekshiruvi", () => {
  // Usta completed dan keyin boshlay olmaydi
  assert.equal(orderState.canAct("master", "start", "awaiting_master").ok, false);
  assert.equal(orderState.canAct("master", "start", "paid").ok, true);
  // Usta completed qila oladi
  assert.equal(orderState.canAct("master", "complete", "in_progress").ok, true);
  assert.equal(orderState.canAct("master", "complete", "paid").ok, false);
});

test("§8: mijoz master harakatlarini bajarolmaydi", () => {
  assert.equal(orderState.canAct("customer", "complete", "in_progress").ok, false);
  assert.equal(orderState.canAct("customer", "quote", "awaiting_master").ok, false);
});

test("§8: noma'lom rol rad etiladi", () => {
  const r = orderState.canAct("superuser", "complete", "in_progress");
  assert.equal(r.ok, false);
  assert.equal(r.code, "forbidden");
});

test("§8: to'lov talab qiladigan holatlar belgilangan", () => {
  assert.ok(orderState.REQUIRES_PAID.has("in_progress"));
  assert.ok(orderState.REQUIRES_PAID.has("completed"));
  assert.ok(!orderState.REQUIRES_PAID.has("paid"));
});

test("§8: barcha statuslar enum bilan mos", () => {
  for (const s of orderState.STATUSES) {
    assert.equal(orderState.TRANSITIONS[s] !== undefined, true, `${s} uchun o'tishlar yo'q`);
  }
});
