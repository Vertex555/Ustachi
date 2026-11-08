import { getItem, setItem, removeItem } from "./storage";

// Chat xabarlari QURILMADA saqlanadi (AsyncStorage) — alohida MongoDB/SQLite ishlatilmaydi.
// MongoDB faqat "zaxira" sifatida ishlaydi (TTL bilan), asosiy manba — bu store.
//
// Kalitlar:
//   ustachi_chats_v1            -> { threads: [...] }  (chatlar ro'yxati + o'qilmaganlik)
//   ustachi_chat_msgs_<chatId>  -> [ ...xabarlar ]
//
// Chegara: Android AsyncStorage ~6MB. Chegarsiz o'sish qulimga olib keladi,
// shuning uchun har bir chat oxirgi MAX_MESSAGES_PER_CHAT, umumiy MAX_THREADS saqlanadi.

const THREADS_KEY = "ustachi_chats_v1";
const MSG_PREFIX = "ustachi_chat_msgs_";

const MAX_MESSAGES_PER_CHAT = 300;
const MAX_THREADS = 50;
const MAX_TEXT = 2000;

const safeParse = (raw, fallback) => {
  try {
    const v = raw ? JSON.parse(raw) : fallback;
    return v ?? fallback;
  } catch {
    return fallback;
  }
};

const msgKey = (chatId) => `${MSG_PREFIX}${chatId}`;

// --------------------------------------------------------------- threads

export async function readThreads() {
  const data = safeParse(await getItem(THREADS_KEY), { threads: [] });
  return Array.isArray(data.threads) ? data.threads : [];
}

async function writeThreads(threads) {
  // Eng eski chatlar chiqarib tashlanadi
  const trimmed = (Array.isArray(threads) ? threads : [])
    .slice()
    .sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0))
    .slice(0, MAX_THREADS);
  await setItem(THREADS_KEY, JSON.stringify({ threads: trimmed }));
  return trimmed;
}

// Serverdan kelgan chat ro'yxatini lokal ro'yxatga singdirish
export async function mergeThreads(serverList) {
  if (!Array.isArray(serverList) || !serverList.length) return readThreads();
  const local = await readThreads();
  const map = {};
  local.forEach((c) => { if (c && c.id) map[String(c.id)] = { ...c, _local: true }; });
  serverList.forEach((c) => {
    if (!c || !c.id) return;
    const id = String(c.id);
    const prev = map[id] || {};
    // lokal ma'lumot ustidan yozilmaydi (server bo'sh bo'lsa ham saqlanib qoladi)
    map[id] = { ...prev, ...c, id };
  });
  return writeThreads(Object.values(map));
}

// Yangi/обновлённый chat qo'shish yoki yangilash
export async function upsertThread(chat) {
  if (!chat || !chat.id) return readThreads();
  const id = String(chat.id);
  const threads = await readThreads();
  const idx = threads.findIndex((c) => String(c.id) === id);
  const prev = idx >= 0 ? threads[idx] : {};
  const next = {
    ...prev,
    ...chat,
    id,
    lastActivity: chat.lastActivity || Date.now(),
  };
  if (idx >= 0) threads[idx] = next;
  else threads.unshift(next);
  return writeThreads(threads);
}

// --------------------------------------------------------------- messages

export async function getMessages(chatId) {
  if (!chatId) return [];
  const list = safeParse(await getItem(msgKey(chatId)), []);
  return Array.isArray(list) ? list : [];
}

async function writeMessages(chatId, messages) {
  const trimmed = (Array.isArray(messages) ? messages : [])
    .filter((m) => m && (m.text || m.image))
    .slice(-MAX_MESSAGES_PER_CHAT);
  await setItem(msgKey(chatId), JSON.stringify(trimmed));
  return trimmed;
}

// Xabar qo'shish. id bo'yicha dedupe — socket va HTTP javobida takrorlanmasin.
export async function appendMessage(chatId, message, { bumpThread = true } = {}) {
  if (!chatId || !message) return getMessages(chatId);
  const list = await getMessages(chatId);

  const mid = String(message.id || "");
  if (mid && list.some((m) => String(m.id) === mid)) return list;

  // "pending" xabar tasdiqlanganda (server id keldi) — vaqtinchalik id bo'yicha almashtiriladi
  if (message.tempId) {
    const ti = String(message.tempId);
    const idx = list.findIndex((m) => String(m.tempId) === ti);
    if (idx >= 0) {
      const merged = { ...list[idx], ...message };
      delete merged.tempId;
      // Server tasdiqladi -> "yuborilmoqda"/"muvaffaqiyatsiz" holati o'chadi
      merged.pending = false;
      merged.failed = false;
      list[idx] = merged;
      await writeMessages(chatId, list);
      if (bumpThread) await upsertThread({ id: chatId, lastMessage: merged.text, lastActivity: Date.now(), unread: 0 });
      return list;
    }
  }

  const entry = {
    id: message.id || `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    tempId: message.tempId || null,
    text: String(message.text || "").slice(0, MAX_TEXT),
    image: message.image || null,
    system: !!message.system,
    senderId: message.senderId || null,
    senderRole: message.senderRole || null,
    createdAt: message.createdAt || new Date().toISOString(),
    pending: !!message.pending,
    failed: !!message.failed,
    fromSupport: !!message.fromSupport,
  };
  list.push(entry);
  await writeMessages(chatId, list);

  if (bumpThread) {
    await upsertThread({
      id: chatId,
      lastMessage: entry.text,
      lastActivity: Date.now(),
      lastSenderId: entry.senderId,
    });
  }
  return list;
}

// Serverdan kelgan butun tarixni lokal bilan birlashtirish
export async function mergeMessages(chatId, serverList) {
  if (!Array.isArray(serverList) || !serverList.length) return getMessages(chatId);
  const local = await getMessages(chatId);
  const map = {};
  local.forEach((m) => { if (m && m.id) map[String(m.id)] = m; });
  serverList.forEach((m) => {
    if (!m || !m.id) return;
    const id = String(m.id);
    // Serverda bor = yetkazilgan xabar. Lokal "pending/failed" sentinel'lar
    // server nusxasini to'sib qo'ymasligi kerak, aks holda xabar abadiy
    // xiralashgan (clock ikon) holatda qolib ketadi.
    const prev = map[id];
    const merged = { ...m, ...(prev || {}) };
    merged.pending = false;
    merged.failed = false;
    // Lokal bo'sh qolgan identifikatsiya maydonlarini server to'g'risi bilan to'ldiramiz
    if (!merged.senderId) merged.senderId = m.senderId;
    if (!merged.senderRole) merged.senderRole = m.senderRole;
    if (!merged.text) merged.text = m.text;
    map[id] = merged;
  });
  return writeMessages(
    chatId,
    Object.values(map).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  );
}

// Xabar yuborilganini tasdiqlash (server id keldi)
export async function confirmMessage(chatId, tempId, serverMessage) {
  return appendMessage(chatId, { ...serverMessage, tempId });
}

// Yuborish muvaffaqiyatsiz -> qayta urinish uchun belgilash
export async function markMessageFailed(chatId, messageId) {
  const list = await getMessages(chatId);
  let changed = false;
  list.forEach((m) => {
    const hit = String(m.id) === String(messageId) || (m.tempId && String(m.tempId) === String(messageId));
    if (hit && m.pending) {
      m.pending = false;
      m.failed = true;
      changed = true;
    }
  });
  if (changed) await writeMessages(chatId, list);
  return list;
}

// Xabarni butunlay o'chirish (qayta urinishdan oldin eskisini tozalash)
export async function removeMessage(chatId, messageId) {
  const list = await getMessages(chatId);
  const next = list.filter((m) => {
    const hit = String(m.id) === String(messageId) || (m.tempId && String(m.tempId) === String(messageId));
    return !hit;
  });
  if (next.length !== list.length) await writeMessages(chatId, next);
  return next;
}

// --------------------------------------------------------------- unread

export async function markThreadRead(chatId) {
  const threads = await readThreads();
  const idx = threads.findIndex((c) => String(c.id) === String(chatId));
  if (idx < 0) return threads;
  threads[idx] = { ...threads[idx], unread: 0, lastSeenAt: Date.now() };
  return writeThreads(threads);
}

export async function markAllThreadsRead() {
  const threads = await readThreads();
  const next = threads.map((c) => ({ ...c, unread: 0, lastSeenAt: Date.now() }));
  return writeThreads(next);
}

// O'qilmagan chatlar soni (offline holatda ham ishlaydi)
export async function unreadCount() {
  const threads = await readThreads();
  return threads.filter((c) => c && c.unread).length;
}

// --------------------------------------------------------------- boshqaruv

// Chiqishda chaqiriladi — maxfiylik (boshqa qurilmada xabarlar qolmasin)
export async function clearAllChats() {
  const threads = await readThreads();
  await Promise.all(threads.map((c) => c && c.id ? removeItem(msgKey(c.id)) : Promise.resolve()));
  await removeItem(THREADS_KEY);
}

// Xabar matni bo'sh bo'lib qolmasligi uchun yordamchi
export const isSendableText = (text) => {
  const t = String(text || "").trim();
  return t.length > 0 && t.length <= MAX_TEXT;
};
