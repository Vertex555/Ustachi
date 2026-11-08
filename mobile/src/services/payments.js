import { apiUrl, authHeaders } from "./api";

// GET /api/payments/my -> { id, orderId, amount, method, cardLast4, status, txId, gatewayState, createdAt }
export async function fetchMyPayments() {
  try {
    const res = await fetch(apiUrl("/api/payments/my"), { headers: authHeaders() });
    const data = await res.json();
    if (res.ok && data.success && Array.isArray(data.data)) return data.data;
    return [];
  } catch {
    return [];
  }
}

// To'lovga xarid: usta uchun to'lanadigan (paid bo'lmagan) buyurtmalar
export async function fetchPayableOrders() {
  try {
    const res = await fetch(apiUrl("/api/orders?view=master&limit=100"), { headers: authHeaders() });
    const data = await res.json();
    if (res.ok && data.success && Array.isArray(data.data)) {
      return data.data.filter((o) => o.paymentStatus && o.paymentStatus !== "paid");
    }
    return [];
  } catch {
    return [];
  }
}

// To'lov havolasi olish (Click / Payme). Gateway sozlanmagan bo'lsa xatolik qaytadi.
export async function createPaymentLink(orderId, method = "click") {
  try {
    const res = await fetch(apiUrl(`/api/payments/orders/${orderId}/${method}/link`), {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json();
    const url = data && (data.url || data.link || (data.data && (data.data.url || data.data.link)));
    if (res.ok && data.success && url) return { ok: true, url };
    return { ok: false, message: (data && data.message) || "Xatolik yuz berdi" };
  } catch (e) {
    return { ok: false, message: e.message || "Tarmoq xatoligi" };
  }
}

// GET /api/cards -> saqlangan kartalar
export async function fetchCards() {
  try {
    const res = await fetch(apiUrl("/api/cards"), { headers: authHeaders() });
    const data = await res.json();
    if (res.ok && data.success && Array.isArray(data.data)) return data.data;
    return [];
  } catch {
    return [];
  }
}
