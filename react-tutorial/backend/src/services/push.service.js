// Expo push xabarlarini jo'natish servisi.
// Tokenlar User.pushTokens'dan olinadi; xatolar xizmatni buzmaydi (fire-and-forget).
// Foydalanuvchining bildirishnoma sozlamalari (User.notifications) SHU YERDA
// qo'llaniladi — ya'ni pref' o'chirilgan bo'lsa, xabar umuman yuborilmaydi.
const User = require("../models/User");
const { shouldNotify } = require("../utils/validation");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const MAX_CHUNK = 100; // Expo har so'rovda cheklangan son qabul qiladi

/**
 * @param {string[]} tokens Expo push token'lari
 * @param {{title, body, data, sound, badge}} payload
 */
async function sendToTokens(tokens, payload = {}) {
  const list = Array.isArray(tokens)
    ? tokens.filter((t) => t && /^ExponentPushToken\[/.test(t))
    : [];
  if (!list.length) return { ok: true, skipped: 0 };
  if (!payload.title && !payload.body) return { ok: true, skipped: list.length };

  const messages = list.map((to) => ({
    to,
    title: String(payload.title || "").slice(0, 150),
    body: String(payload.body || "").slice(0, 300),
    data: payload.data || {},
    sound: payload.sound || "default",
    ...(payload.badge != null ? { badge: payload.badge } : {}),
  }));

  let sent = 0;
  for (let i = 0; i < messages.length; i += MAX_CHUNK) {
    const chunk = messages.slice(i, i + MAX_CHUNK);
    try {
      const headers = { "Content-Type": "application/json" };
      if ((process.env.EXPO_ACCESS_TOKEN || "").trim()) {
        headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN.trim()}`;
      }
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        console.error("[push] Expo API xatosi:", res.status);
      } else {
        sent += chunk.length;
        // Qaysidir token endi yaroqsiz bo'lsa, keyingi jo'natishlar uchun o'chirish mumkin
        try {
          const result = await res.json();
          result.forEach((r, idx) => {
            if (r && (r.status === "error") && /DeviceNotRegistered|ExponentPushToken/.test(r.details?.error || "")) {
              const bad = chunk[idx] && chunk[idx].to;
              if (bad) removeToken(bad).catch(() => {});
            }
          });
        } catch { /* javobni tahlil qilish ixtiyoriy */ }
      }
    } catch (err) {
      console.error("[push] Jo'natishda xato:", err.message);
    }
  }
  return { ok: true, sent };
}

/**
 * Bitta foydalanuvchiga push jo'natish.
 * @param {string} userId
 * @param {{title, body, data}} payload
 * @param {{category?: "order"|"chat"|"master"|"payment"|"promo"}} opts
 *        category — foydalanuvchi bu turdagi bildirishnomani ochirgan bo'lsa,
 *        xabar yuborilmaydi (pref' serverda saqlanadi).
 */
async function sendToUser(userId, payload, opts = {}) {
  if (!userId) return { ok: true, skipped: 0 };
  const user = await User.findById(userId)
    .select("pushTokens notifications")
    .lean()
    .catch(() => null);
  if (!user || !user.pushTokens || !user.pushTokens.length) {
    return { ok: true, skipped: 0, reason: "no_tokens" };
  }
  if (opts.category && !shouldNotify(user.notifications, opts.category)) {
    return { ok: true, skipped: user.pushTokens.length, reason: "preference_off" };
  }
  return sendToTokens(user.pushTokens, payload);
}

/**
 * Bir nechta foydalanuvchiga push jo'natish.
 * Har bir foydalanuvchi uchun pref'lari alohida tekshiriladi.
 * @param {string[]} userIds
 * @param {{title, body, data}} payload
 * @param {{category?: string}} opts
 */
async function sendToUsers(userIds, payload, opts = {}) {
  if (!Array.isArray(userIds) || !userIds.length) return { ok: true, skipped: 0 };
  const users = await User.find({ _id: { $in: userIds }, pushTokens: { $ne: [] } })
    .select("pushTokens notifications")
    .lean()
    .catch(() => []);

  const tokens = [];
  let skipped = 0;
  users.forEach((u) => {
    if (opts.category && !shouldNotify(u.notifications, opts.category)) {
      skipped += (u.pushTokens || []).length;
      return;
    }
    (u.pushTokens || []).forEach((t) => tokens.push(t));
  });

  if (!tokens.length) return { ok: true, skipped, reason: "preference_off" };
  const out = await sendToTokens(tokens, payload);
  return { ...out, skipped: skipped + (out.skipped || 0) };
}

let _removing = null;
async function removeToken(token) {
  // O'chirish jarayonini ketma-ketlashtiramiz (bir vaqtda ko'p yozuvlardan saqlanish)
  _removing = (_removing || Promise.resolve()).then(() =>
    User.updateMany({ pushTokens: token }, { $pull: { pushTokens: token } }).catch(() => {})
  );
  return _removing;
}

module.exports = { sendToTokens, sendToUser, sendToUsers, removeToken };