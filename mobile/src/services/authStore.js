import { apiUrl } from "../config";
import { loadTokenFromStorage, setToken, authHeaders } from "./api";
import { getItem, setItem as setStorageItem, removeItem as removeStorageItem } from "./storage";
import { detachSocket } from "./socket";
import { logoutPush } from "./push";
import { clearAllChats } from "./chatStore";

let currentUser = null;
let ready = false;
const listeners = new Set();

function publish() {
  listeners.forEach((fn) => { try { fn(currentUser); } catch {} });
}

export function subscribeAuth(fn) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getAuthUser() {
  return currentUser;
}

export function isAuthReady() {
  return ready;
}

export async function initAuth() {
  const token = await loadTokenFromStorage();
  if (!token) {
    ready = true;
    publish();
    return null;
  }
  try {
    const res = await fetch(apiUrl("/api/auth/me"), { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok && data.success && data.user) {
      currentUser = data.user;
      if (data.user?.id) setStorageItem("ustachi_user_id", String(data.user.id));
      if (data.user?.phone) setStorageItem("ustachi_phone", String(data.user.phone));
    } else {
      setToken(null);
    }
  } catch {
    setToken(null);
  }
  ready = true;
  publish();
  return currentUser;
}

export function setAuth(token, user) {
  setToken(token);
  currentUser = user;
  if (user?.id) setStorageItem("ustachi_user_id", String(user.id));
  if (user?.phone) setStorageItem("ustachi_phone", String(user.phone));
  publish();
  return user;
}

export function updateAuthUser(patch) {
  if (!currentUser) return null;
  if (patch && typeof patch === "object") currentUser = { ...currentUser, ...patch };
  publish();
  return currentUser;
}

// Rolni SERVERDA ham saqlash (usta/foydalanuvchi rejimi). Faqat lokal o'zgartirish
// navigator'da nomuvofiqlikka olib keladi: masalan "usta" bo'limida mijoz oynalari.
export async function setRole(role) {
  if (!currentUser) return null;
  const res = await fetch(apiUrl("/api/users/me"), {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ role }),
  });
  const data = await res.json();
  if (!res.ok || !data.success || !data.user) return null;
  currentUser = data.user;
  if (data.user?.id) setStorageItem("ustachi_user_id", String(data.user.id));
  if (data.user?.phone) setStorageItem("ustachi_phone", String(data.user.phone));
  publish();
  return currentUser;
}

export function clearAuth() {
  logoutPush();
  setToken(null);
  removeStorageItem("ustachi_user_id");
  removeStorageItem("ustachi_phone");
  // Chiqishda chatlar qurilmadan o'chadi (maxfiylik: boshqa qurilmada qolmasin)
  clearAllChats().catch(() => {});
  currentUser = null;
  detachSocket();
  publish();
}