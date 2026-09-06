const crypto = require("crypto");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_USERNAME_FALLBACK = process.env.TELEGRAM_BOT_USERNAME;

let cachedUsername = null;
let lastUpdateId = 0;
let pollingTimer = null;

function isConfigured() {
  return !!BOT_TOKEN;
}

async function api(method, params = {}) {
  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }
  );
  const data = await res.json();
  if (!res.ok || !data.ok) {
    const err = new Error(data?.description || `Telegram: ${method} xatosi`);
    err.telegram = data;
    throw err;
  }
  return data.result;
}

async function getBotUsername() {
  if (cachedUsername) return cachedUsername;
  if (!BOT_TOKEN) return BOT_USERNAME_FALLBACK || null;
  try {
    const me = await api("getMe");
    cachedUsername = me?.username || BOT_USERNAME_FALLBACK;
  } catch {
    cachedUsername = BOT_USERNAME_FALLBACK;
  }
  return cachedUsername;
}

// Botga start berish uchun deep-link
async function buildDeepLink(token) {
  return `https://t.me/${await getBotUsername()}?start=${token}`;
}

function newLinkToken() {
  return crypto.randomBytes(12).toString("hex");
}

async function sendVerificationCode(phone, code, chatId) {
  if (!BOT_TOKEN) {
    const err = new Error(
      "Telegram xizmati sozlanmagan (TELEGRAM_BOT_TOKEN)."
    );
    err.configured = false;
    throw err;
  }
  if (!chatId) {
    const err = new Error("Foydalanuvchi Telegram bilan bog'lanmagan.");
    err.telegramMissing = true;
    throw err;
  }

  const text = [
    "🔐 Ustachi — tasdiqlash kodi",
    `📱 Telefon: ${phone}`,
    `🔑 Kod: ${code}`,
    "Kod 5 daqiqa amal qiladi.",
  ].join("\n");

  await api("sendMessage", { chat_id: chatId, text });
}

// /start <token> kelganda chat'ni telefon raqamga bog'lash
async function linkUserByToken(token, chatId) {
  const User = require("../models/User");
  const user = await User.findOne({ telegramLinkToken: token });
  if (!user) return "notfound";

  const expired =
    user.telegramLinkTokenExpiresAt &&
    user.telegramLinkTokenExpiresAt.getTime() < Date.now();

  if (expired) {
    user.telegramLinkToken = undefined;
    user.telegramLinkTokenExpiresAt = undefined;
    await user.save();
    return "expired";
  }

  user.telegramChatId = String(chatId);
  user.telegramLinkedAt = new Date();
  user.telegramLinkToken = undefined;
  user.telegramLinkTokenExpiresAt = undefined;
  await user.save();
  return "linked";
}

async function handleUpdate(update) {
  const message = update?.message;
  if (!message) return;

  const text = String(message.text || "");
  if (!text.startsWith("/start")) return;
  const token = text.split(/\s+/)[1];
  if (!token) return; // tokensiz start — e'tiborsiz

  const chatId = message.chat?.id;
  let result;
  try {
    result = await linkUserByToken(token, chatId);
  } catch {
    return;
  }

  if (result === "linked") {
    try {
      await api("sendMessage", {
        chat_id: chatId,
        text: "✅ Hisobingiz Ustachi bilan bog'landi. Endi qurilmaga kod yuboriladi.",
      });
    } catch {
      // xabar yuborilmasa ham bog'lanish qilindi
    }
  } else if (result === "expired") {
    try {
      await api("sendMessage", {
        chat_id: chatId,
        text: "⏰ Ushbu havola eskirgan. Ilovada qaytadan «Kod yuborish» tugmasini bosing.",
      });
    } catch {
      // e'tiborsiz
    }
  }
}

async function pollOnce() {
  if (!BOT_TOKEN) return;
  const offset = lastUpdateId + 1;
  let updates;
  try {
    updates = await api("getUpdates", {
      offset,
      timeout: 10,
      allowed_updates: ["message"],
    });
  } catch {
    return; // vaqtinchalik xato — keyingi sikl
  }
  for (const u of updates) {
    if (u.update_id > lastUpdateId) {
      lastUpdateId = u.update_id;
      try {
        await handleUpdate(u);
      } catch {
        // bitta update xato bo'lsa ham davom etamiz
      }
    }
  }
}

function startLinkListener() {
  if (!BOT_TOKEN || pollingTimer) return;
  pollingTimer = setInterval(pollOnce, 2000);
}

module.exports = {
  isConfigured,
  getBotUsername,
  buildDeepLink,
  newLinkToken,
  sendVerificationCode,
  startLinkListener,
};