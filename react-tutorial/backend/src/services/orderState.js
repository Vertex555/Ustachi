/**
 * Buyurtma holati hayoti (Order lifecycle).
 *
 * §8: "O'zgartirishlarni backend da aniqlang. Noto'g'ri status o'zgarishlarini
 * rad eting."
 *
 * Maqsad: frontend status'ni to'g'ridan-to'g'ri yuborib yozib qo'yishi
 * mumkin bo'lmasligi kerak. Shuning uchun hech qanday controller
 * `order.status = req.body.status` qilmaydi — faqat shu modul orqali.
 */

/** Barcha ruxsat etilgan statuslar */
const STATUSES = [
  "draft",
  "submitted",
  "awaiting_master",
  "quoted",
  "accepted",
  "awaiting_payment",
  "paid",
  "in_progress",
  "completed",
  "cancelled",
  "disputed",
  "refunded",
];

/** Tumanlar (terminal) — bu holatlardan chiqish mumkin emas */
const TERMINAL = new Set(["completed", "cancelled", "refunded"]);

/** To'lov talab qiladigan statuslar (bu holatlarda to'lov tekshiriladi) */
const REQUIRES_PAID = new Set(["in_progress", "completed"]);

/**
 * Ruxsat etilgan o'tishlar: { from: [to, ...] }
 * "*" — istalgan ko'p sonli o'tish (masalan cancel/dispute).
 */
const TRANSITIONS = {
  draft: ["submitted", "cancelled"],
  submitted: ["awaiting_master", "cancelled"],
  awaiting_master: ["quoted", "accepted", "cancelled", "disputed"],
  quoted: ["accepted", "awaiting_master", "cancelled", "disputed"],
  accepted: ["awaiting_payment", "paid", "cancelled", "disputed"],
  awaiting_payment: ["paid", "cancelled", "disputed"],
  paid: ["in_progress", "cancelled", "disputed", "refunded"],
  in_progress: ["completed", "disputed", "cancelled"],
  completed: ["disputed"],
  cancelled: [],
  disputed: ["completed", "refunded", "cancelled"],
  refunded: [],
};

/** Kim qaysi o'tishni qilishi mumkin */
const ROLE_TRANSITIONS = {
  customer: {
    submit: { from: ["draft"], to: "submitted" },
    cancel: { from: ["submitted", "awaiting_master", "quoted", "accepted", "awaiting_payment"], to: "cancelled" },
    confirm: { from: ["quoted"], to: "accepted" },
    dispute: { from: ["paid", "in_progress", "completed"], to: "disputed" },
    pay: { from: ["accepted", "awaiting_payment"], to: "paid" },
  },
  master: {
    quote: { from: ["awaiting_master"], to: "quoted" },
    accept: { from: ["awaiting_master", "quoted"], to: "accepted" },
    start: { from: ["paid"], to: "in_progress" },
    complete: { from: ["in_progress"], to: "completed" },
  },
  admin: {
    // Admin qutqazlovchi sifatida istalgan o'tishni qilishi mumkin,
    // lekin har doim audit yoziladi (middleware orqali).
    force: true,
  },
  system: {
    // To'lov webhook'i, avtomatik bekor qilish va h.k.
    pay: { from: ["accepted", "awaiting_payment", "paid"], to: "paid" },
    cancel: { from: ["*"], to: "cancelled" },
    dispute: { from: ["*"], to: "disputed" },
    complete: { from: ["in_progress"], to: "completed" },
    refund: { from: ["paid", "in_progress", "completed", "disputed"], to: "refunded" },
    submit: { from: ["draft"], to: "submitted" },
    awaitingMaster: { from: ["submitted"], to: "awaiting_master" },
    accept: { from: ["awaiting_master", "quoted"], to: "accepted" },
  },
};

function canTransition(from, to) {
  if (!STATUSES.includes(to)) {
    return { ok: false, code: "invalid_status", message: `Noma'lum holat: ${to}` };
  }
  if (from === to) {
    return { ok: false, code: "same_status", message: "Holat o'zgarmadi" };
  }
  if (TERMINAL.has(from)) {
    return {
      ok: false,
      code: "terminal_status",
      message: `«${from}» yakuniy holat — boshqa o'tish mumkin emas`,
    };
  }
  const allowed = TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    return {
      ok: false,
      code: "invalid_transition",
      message: `«${from}» dan «${to}» ga o'tish mumkin emas`,
    };
  }
  return { ok: true };
}

/**
 * Rol + harakatni tekshiradi.
 * @param {string} role  customer | master | admin | system
 * @param {string} action buyurtma.controller dagi harakat nomi (masalan "complete")
 */
function canAct(role, action, currentStatus) {
  const r = ROLE_TRANSITIONS[role];
  if (!r) return { ok: false, code: "forbidden", message: "Noma'lom rol" };
  if (role === "admin" && r.force) return { ok: true, admin: true };

  const rule = r[action];
  if (!rule) {
    return { ok: false, code: "forbidden_action", message: `"${action}" harakati ${role} uchun ruxsat etilmagan` };
  }
  const fromOk =
    rule.from.includes("*") ||
    rule.from.includes(currentStatus) ||
    (Array.isArray(rule.to) && rule.to.includes(currentStatus));
  if (!fromOk) {
    return {
      ok: false,
      code: "invalid_transition",
      message: `"${action}" faqat ${rule.from.join("/")} holatida bajariladi (hozir: ${currentStatus})`,
    };
  }
  return { ok: true, to: rule.to };
}

module.exports = {
  STATUSES,
  TERMINAL,
  REQUIRES_PAID,
  TRANSITIONS,
  canTransition,
  canAct,
};
