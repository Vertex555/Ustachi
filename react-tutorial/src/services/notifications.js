import { apiUrl, authHeaders } from "./api";

// Bildirishnomalar servisi — backend /api/notifications ga ulanadi.

async function json(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchNotifications({ page = 1, limit = 20, unread = false } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (unread) params.set("unread", "1");
  const res = await fetch(apiUrl(`/api/notifications?${params.toString()}`), {
    headers: authHeaders(),
  });
  const data = await json(res);
  if (!res.ok || !data?.success) return { items: [], unread: 0, pagination: null };
  return {
    items: data.data || [],
    unread: data.unread || 0,
    pagination: data.pagination || null,
  };
}

export async function fetchUnreadCount() {
  const res = await fetch(apiUrl("/api/notifications/unread-count"), { headers: authHeaders() });
  const data = await json(res);
  if (!res.ok || !data?.success) return 0;
  return data.data?.unread || 0;
}

export async function markNotificationsRead(ids) {
  const res = await fetch(apiUrl("/api/notifications/read"), {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(Array.isArray(ids) ? { ids } : {}),
  });
  return res.ok;
}

export async function markAllNotificationsRead() {
  const res = await fetch(apiUrl("/api/notifications/read-all"), {
    method: "POST",
    headers: authHeaders(),
  });
  return res.ok;
}

export async function deleteNotification(id) {
  const res = await fetch(apiUrl(`/api/notifications/${id}`), {
    method: "DELETE",
    headers: authHeaders(),
  });
  return res.ok;
}
