import { apiUrl, authHeaders } from "./api";
import { attachSocket } from "./socket";
import { fetchOrders } from "./orders";
import { fetchSavedMasters } from "./savedMasters";
import { mergeThreads, unreadCount, markAllThreadsRead } from "./chatStore";
import { getAuthUser } from "./authStore";

const ACTIVE_ORDER_STATUSES = ["placed", "accepted", "in_progress", "ready"];
let state = { orders: 0, chats: 0, saved: 0 };
const listeners = new Set();
let attachedFlag = false;
let activeTab = null;

// Hozir ochiq bo'lim — badge faqat boshqa bo'limlarda ko'rsatiladi
export function setActiveTab(kind) {
  activeTab = kind;
}

export function getActiveTab() {
  return activeTab;
}

function emit() {
  listeners.forEach((fn) => { try { fn(state); } catch {} });
}

export function subscribeBadges(fn) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getBadges() {
  return state;
}

export async function refreshBadges() {
  let orders = 0, chats = 0, saved = 0;
  // Joriy rejimga mos buyurtma ko'rinishi (usta = qabul qilishi kerak bo'lganlar)
  const view = (getAuthUser() && getAuthUser().role === "master") ? "master" : "user";
  // Foydalanuvchi hozir turgan bo'lim uchun badge doim 0 bo'ladi —
  // chunki u yangi narsani hozir ko'ryapti (keyin openVisible bo'lsa kerak)
  if (activeTab !== "orders") {
    try {
      const list = await fetchOrders(view);
      orders = list.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status) && o.seen !== true).length;
    } catch {}
  }
  if (activeTab !== "chats") {
    // Avval serverdan, keyin lokal ro'yxatdan (offline ham ishlashi uchun)
    try {
      const res = await fetch(apiUrl("/api/chat/my"), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        await mergeThreads(data.data);
        chats = await unreadCount();
      }
    } catch {
      try { chats = await unreadCount(); } catch {}
    }
  }
  try {
    saved = (await fetchSavedMasters() || []).length;
  } catch {}
  state = { orders, chats, saved };
  emit();
}

// Tab ochilganda o'sha bo'limdagi bildirishnomalarni darhol tozalash
export function focusTabBadge(kind) {
  activeTab = kind;
  if (kind === "orders") {
    if (state.orders > 0) {
      state = { ...state, orders: 0 };
      emit();
    }
    fetch(apiUrl("/api/orders/seen"), { method: "POST", headers: authHeaders() }).catch(() => {});
  } else if (kind === "chats") {
    if (state.chats > 0) {
      state = { ...state, chats: 0 };
      emit();
    }
    markAllThreadsRead().catch(() => {});
    fetch(apiUrl("/api/chat/read"), { method: "POST", headers: authHeaders() }).catch(() => {});
  } else if (kind === "saved") {
    refreshBadges();
  }
}

export function ensureBadges() {
  if (!attachedFlag) {
    attachedFlag = true;
    attachSocket({
      onOrderNew: refreshBadges,
      onOrderUpdate: refreshBadges,
      onChatNew: refreshBadges,
    });
  }
  refreshBadges();
}