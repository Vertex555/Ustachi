// Promo-kod / referral tizimi — brauzerda to'liq ishlaydi (localStorage).
// Foydalanuvchi o'z referral kodini oladi, promo yaratadi va narxga chegirma qo'llaydi.

const LS_KEY = "ustachi_promos_v1";
const LS_REF = "ustachi_referral_v1";

function uid() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function read() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.promos)) return parsed;
  } catch {}
  return { promos: [] };
}

function write(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

function readRef() {
  try {
    const raw = localStorage.getItem(LS_REF);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object") {
      return { code: parsed.code || null, invited: Number(parsed.invited) || 0, earned: Number(parsed.earned) || 0 };
    }
  } catch {}
  return { code: null, invited: 0, earned: 0 };
}

function writeRef(ref) {
  try {
    localStorage.setItem(LS_REF, JSON.stringify(ref));
  } catch {}
}

// Foydalanuvchi uchun barqaror referral kod (ismdan hosil, takrorlanmaydi)
export function getReferral(user) {
  const ref = readRef();
  if (ref.code) return ref;
  const base = String(user?.id || user?._id || user?.phone || "USTACHI")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-4)
    .toUpperCase();
  const code = `UST${base || uid().slice(0, 4)}`;
  const next = { ...ref, code };
  writeRef(next);
  return next;
}

export function referralLink(code) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://ustachi.app";
  return `${origin}/?ref=${encodeURIComponent(code)}`;
}

// Boshlang'ich promo to'plami (birinchi marta o'qilganda qo'shiladi)
function seedIfEmpty(state) {
  if (state.promos.length > 0) return state;
  const now = Date.now();
  return {
    promos: [
      { code: "WELCOME10", type: "percent", value: 10, uses: 0, maxUses: 1000, active: true, createdAt: now, note: "Yangi foydalanuvchilar uchun" },
      { code: "USTACHI50", type: "fixed", value: 50000, uses: 0, maxUses: 500, active: true, createdAt: now, note: "50 000 so'm chegirma" },
      { code: "FIX20", type: "percent", value: 20, uses: 0, maxUses: 300, active: true, createdAt: now, note: "20% chegirma" },
    ],
  };
}

export function listPromos() {
  const seeded = seedIfEmpty(read());
  if (seeded !== read() && read().promos.length === 0) write(seeded);
  return seeded.promos;
}

export function createPromo({ code, type = "percent", value = 0, maxUses = 100, note = "" }) {
  const clean = String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
  if (!clean) return { ok: false, message: "Kod kiritilmadi" };
  const state = seedIfEmpty(read());
  if (state.promos.some((p) => p.code === clean)) {
    return { ok: false, message: "Bunday kod allaqachon mavjud" };
  }
  const v = Number(value) || 0;
  if (type === "percent" && (v <= 0 || v > 100)) return { ok: false, message: "Foiz 1..100 bo'lishi kerak" };
  if (type === "fixed" && v <= 0) return { ok: false, message: "Summa manfiy bo'lishi mumkin emas" };
  const promo = {
    code: clean,
    type,
    value: v,
    uses: 0,
    maxUses: Math.max(1, Number(maxUses) || 100),
    active: true,
    createdAt: Date.now(),
    note: String(note || "").slice(0, 80),
    custom: true,
  };
  state.promos.unshift(promo);
  write(state);
  return { ok: true, promo };
}

export function deletePromo(code) {
  const state = read();
  state.promos = state.promos.filter((p) => p.code !== code);
  write(state);
}

// Kodni tekshirish + chegirmani hisoblash. amount = asosiy narx.
export function applyPromo(code, amount) {
  const clean = String(code || "").trim().toUpperCase();
  if (!clean) return { ok: false, message: "Promo kod kiriting" };
  const state = seedIfEmpty(read());
  const promo = state.promos.find((p) => p.code === clean);
  if (!promo) return { ok: false, message: "Bunday promo kod topilmadi" };
  if (!promo.active) return { ok: false, message: "Bu kod faol emas" };
  if (promo.maxUses && promo.uses >= promo.maxUses) return { ok: false, message: "Kod limiti tugagan" };

  const base = Math.max(0, Number(amount) || 0);
  let discount = promo.type === "percent" ? Math.round((base * promo.value) / 100) : promo.value;
  discount = Math.min(discount, base);
  const total = Math.max(0, base - discount);
  return { ok: true, promo, discount, total };
}

export function usePromo(code) {
  const state = read();
  const promo = state.promos.find((p) => p.code === String(code || "").trim().toUpperCase());
  if (promo) {
    promo.uses = (promo.uses || 0) + 1;
    write(state);
  }
}

// Referral: kimdir siz orqali keldi → ball/qo'shimcha hisoblash
// (bir xil kod bir sessiyada faqat bir marta hisoblanadi — reload uchun ham)
export function trackReferral() {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref");
    if (!code) return null;
    let seen = null;
    try { seen = sessionStorage.getItem("ustachi_ref_seen"); } catch {}
    if (seen === code) return code;
    const ref = readRef();
    ref.invited = (ref.invited || 0) + 1;
    ref.earned = (ref.earned || 0) + 10000; // har taklif uchun 10 000 ball
    writeRef(ref);
    try { sessionStorage.setItem("ustachi_ref_seen", code); } catch {}
    return code;
  } catch {
    return null;
  }
}
