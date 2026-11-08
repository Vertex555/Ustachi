import { apiUrl, authHeaders } from "./api";

export async function fetchOrders(view) {
  try {
    const res = await fetch(apiUrl(`/api/orders${view === "master" ? "?view=master" : ""}`), {
      headers: authHeaders(),
    });
    const data = await res.json();
    if (res.ok && data.success && Array.isArray(data.data)) return data.data;
    return [];
  } catch {
    return [];
  }
}

// Sahifalangan buyurtmalar ro'yxati (OrdersView "ko'proq yuklash" uchun)
export async function fetchOrdersPage(view, page, limit = 50) {
  try {
    const qs =
      view === "master" ? `?view=master&page=${page}&limit=${limit}` : `?page=${page}&limit=${limit}`;
    const res = await fetch(apiUrl(`/api/orders${qs}`), { headers: authHeaders() });
    const data = await res.json();
    if (res.ok && data.success && Array.isArray(data.data)) {
      return {
        items: data.data,
        hasMore: !!(data.pagination && data.pagination.page < data.pagination.pages),
      };
    }
    return { items: [], hasMore: false };
  } catch {
    return { items: [], hasMore: false };
  }
}

export async function markOrdersSeen() {
  try {
    await fetch(apiUrl("/api/orders/seen"), { method: "POST", headers: authHeaders() });
  } catch {}
}

export async function createOrder({
  masterId,
  device,
  deviceModel,
  issue,
  description,
  comment,
  deliveryMethod,
  paymentMethod,
  userLocation,
  photos,
}) {
  try {
    const fd = new FormData();
    fd.append("masterId", masterId);
    if (device) fd.append("device", device);
    if (deviceModel) fd.append("deviceModel", deviceModel);
    if (issue) fd.append("issue", issue);
    if (description) fd.append("description", description);
    if (comment) fd.append("comment", comment);
    if (deliveryMethod) fd.append("deliveryMethod", deliveryMethod);
    if (paymentMethod) fd.append("paymentMethod", paymentMethod);
    if (userLocation) fd.append("userLocation", JSON.stringify(userLocation));
    (photos || []).forEach((p) => {
      if (p && p.uri) {
        fd.append("photos", {
          uri: p.uri,
          name: p.name || `photo_${Date.now()}.jpg`,
          type: p.type || "image/jpeg",
        });
      }
    });
    const res = await fetch(apiUrl("/api/orders"), {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    });
    const data = await res.json();
    if (res.ok && data.success) return { ok: true, order: data.data };
    return { ok: false, message: (data && data.message) || "Xatolik yuz berdi" };
  } catch (e) {
    return { ok: false, message: e.message || "Tarmoq xatoligi" };
  }
}

export async function updateOrderStatus(orderId, status, rejectionReason = "") {
  try {
    const res = await fetch(apiUrl(`/api/orders/${orderId}/status`), {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ status, rejectionReason }),
    });
    const data = await res.json();
    if (res.ok && data.success) return { ok: true, order: data.data };
    return { ok: false, message: (data && data.message) || "Xatolik" };
  } catch (e) {
    return { ok: false, message: e.message || "Tarmoq xatoligi" };
  }
}

export async function rateOrder(orderId, rating, review) {
  try {
    const res = await fetch(apiUrl(`/api/orders/${orderId}/rate`), {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ rating, review }),
    });
    const data = await res.json();
    if (res.ok && data.success) return { ok: true, order: data.data };
    return { ok: false, message: (data && data.message) || "Xatolik" };
  } catch (e) {
    return { ok: false, message: e.message || "Tarmoq xatoligi" };
  }
}

export async function updateOrderLocation(orderId, lat, lng) {
  try {
    const res = await fetch(apiUrl(`/api/orders/${orderId}/location`), {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ lat, lng }),
    });
    const data = await res.json();
    if (res.ok && data.success) return { ok: true, order: data.data };
    return { ok: false, message: (data && data.message) || "Xatolik" };
  } catch (e) {
    return { ok: false, message: e.message || "Tarmoq xatoligi" };
  }
}

export async function cancelOrder(orderId, reason) {
  try {
    const res = await fetch(apiUrl(`/api/orders/${orderId}/cancel`), {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (res.ok && data.success) return { ok: true, order: data.data };
    return { ok: false, message: (data && data.message) || "Xatolik" };
  } catch (e) {
    return { ok: false, message: e.message || "Tarmoq xatoligi" };
  }
}