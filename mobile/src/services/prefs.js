// Sozlamalarni boshqarish: lokal (AsyncStorage) + server sinxronizatsiya.
//
// Tamoyil: ilova darholda ISHLASHI SHART (server yo'q bo'lsa ham). Server
// faqat boshqa qurilmalarda ham xuddi shunday bo'lishi uchun ishlatiladi.
//
// Senkronizatsiya strategiyasi:
//   - o'zgarish avval lokalga yoziladi → UI darhol yangilanadi
//   - keyin serverga yuboriladi (PATCH /api/users/me/preferences)
//   - serverda saqlangan qiymat qaytariladi va qayta lokalga yoziladi
//     (server do'kon sifatida ishlaydi — kelgusi versiyalar bilan mos keladi)

import { apiUrl } from "../config";
import { authHeaders } from "./api";
import { getItem, setItem, removeItem } from "./storage";
import {
  defaultPreferences,
  defaultNotifications,
  preferencesPatch,
  notificationPatch,
  isPlainObject,
} from "../settings/logic";

const PREFS_KEY = "ustachi_prefs_v1";
const PENDING_KEY = "ustachi_prefs_pending_v1";

let prefs = defaultPreferences();
let notifications = defaultNotifications();
let hydrated = false;
const listeners = new Set();

function publish() {
  listeners.forEach((fn) => {
    try { fn({ preferences: prefs, notifications }); } catch {}
  });
}

export function subscribePrefs(fn) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getPrefs() {
  return { preferences: prefs, notifications };
}

function persist() {
  setItem(PREFS_KEY, JSON.stringify({ preferences: prefs, notifications }));
}

// Server javobida kelgan ma'lumotni ishonchli qilib olamiz
function adopt(payload) {
  if (!isPlainObject(payload)) return false;
  const data = isPlainObject(payload.data) ? payload.data : payload;
  let changed = false;
  if (isPlainObject(data.preferences)) {
    prefs = defaultPreferences({ ...prefs, ...data.preferences });
    changed = true;
  }
  if (isPlainObject(data.notifications)) {
    notifications = defaultNotifications({ ...notifications, ...data.notifications });
    changed = true;
  }
  if (changed) persist();
  return changed;
}

async function request(method, path, body) {
  const res = await fetch(apiUrl(path), {
    method,
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const err = new Error((data && (data.message || data.errors)) || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Ilova boshlanganda: lokal sozlamalarni darhol ishlatamiz, so'ng
 * autentifikatsiyalangan bo'lsa serverdan yangilab olamiz.
 */
export async function hydratePrefs({ fromUser = null } = {}) {
  // 1) Lokal kesh — ekran darhol to'g'ri ko'rinadi
  const cached = await getItem(PREFS_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (isPlainObject(parsed)) {
        if (parsed.preferences) prefs = defaultPreferences(parsed.preferences);
        if (parsed.notifications) notifications = defaultNotifications(parsed.notifications);
      }
    } catch {}
  }
  hydrated = true;
  publish();

  // 2) Kirish javobida server yuborgan sozlamalar (xotirada bo'lishi mumkin)
  if (fromUser) adopt(fromUser);

  // 3) Faol sessiya bilan serverdan o'qib olamiz
  try {
    const data = await request("GET", "/api/users/me/preferences");
    adopt(data);
    publish();
    await flushPending();
  } catch {
    // Offline / token yo'q — lokal sozlamalar bilan ishlashda davom etamiz
  }
  return getPrefs();
}

/**
 * O'zgartirilgan maydonlarni serverga yuboradi. `notify` — bildirishnoma
 * pref'lari uchun alohida endpoint.
 */
async function pushPreferences(changes) {
  const patch = preferencesPatch(prefs, changes);
  if (!Object.keys(patch).length) return getPrefs();

  // 1) lokal
  prefs = defaultPreferences({ ...prefs, ...patch });
  persist();
  publish();

  // 2) server
  try {
    const data = await request("PATCH", "/api/users/me/preferences", patch);
    adopt(data);
    publish();
  } catch (err) {
    // Serverga yetib borolmadi — keyinroq yuborish uchun navbatga qo'yamiz
    const pending = (await getItem(PENDING_KEY)) || {};
    await setItem(PENDING_KEY, JSON.stringify({ ...pending, ...patch }));
  }
  return getPrefs();
}

async function pushNotifications(changes) {
  const patch = notificationPatch(notifications, changes);
  if (!Object.keys(patch).length) return getPrefs();

  notifications = defaultNotifications({ ...notifications, ...patch });
  persist();
  publish();

  try {
    const data = await request("PATCH", "/api/users/me/notifications", patch);
    if (isPlainObject(data?.data?.notifications)) {
      notifications = defaultNotifications(data.data.notifications);
    } else {
      notifications = defaultNotifications(notifications);
    }
    persist();
    publish();
  } catch {
    const pending = (await getItem(PENDING_KEY)) || {};
    await setItem(PENDING_KEY, JSON.stringify({ ...pending, ...patch }));
  }
  return getPrefs();
}

// Navbatga qo'yilgan o'zgarishlarni yuborish
async function flushPending() {
  const pending = (await getItem(PENDING_KEY)) || null;
  if (!pending || !isPlainObject(pending) || !Object.keys(pending).length) return;

  const prefKeys = ["theme", "language", "fontScale", "reduceMotion"];
  const prefPart = {};
  const notifyPart = {};
  Object.keys(pending).forEach((k) => {
    if (prefKeys.includes(k)) prefPart[k] = pending[k];
    else notifyPart[k] = pending[k];
  });

  try {
    if (Object.keys(prefPart).length) {
      await request("PATCH", "/api/users/me/preferences", prefPart);
    }
    if (Object.keys(notifyPart).length) {
      await request("PATCH", "/api/users/me/notifications", notifyPart);
    }
    await removeItem(PENDING_KEY);
    const data = await request("GET", "/api/users/me/preferences");
    adopt(data);
    publish();
  } catch {
    // Hali ham yo'q — keyinroq urinish
  }
}

export const updateTheme = (mode) => pushPreferences({ theme: mode });
export const updateLanguage = (lang) => pushPreferences({ language: lang });
export const updateFontScale = (scale) => pushPreferences({ fontScale: scale });
export const updateReduceMotion = (value) => pushPreferences({ reduceMotion: !!value });

export function updateNotificationCategory(key, value) {
  return pushNotifications({ [key]: !!value });
}

export function updatePushChannel(value) {
  return pushNotifications({ channels: { ...(notifications.channels || {}), push: !!value } });
}

/** Chiqishda lokal sozlamalarni tozalashim mumkin emas (til/mavzu saqlansin),
 *  lekin navbatdagi o'zgarishlar bekor qilinadi. */
export async function resetPendingPrefs() {
  await removeItem(PENDING_KEY);
}

export function isPrefsHydrated() {
  return hydrated;
}
