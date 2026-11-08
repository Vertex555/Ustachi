// Sozlamalar ekranlari uchun API qatlami.
// Barcha so'rovlar shu yerdan o'tadi — UI to'g'ridan-to'g'ri fetch
// ishlatmaydi (shunda xato boshqaruvi va token yangilanishi bir joyda bo'ladi).

import { apiUrl } from "../config";
import { authHeaders, getToken } from "./api";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.code = data?.code;
  }
}

function firstError(data) {
  if (Array.isArray(data?.errors)) return data.errors.join("; ");
  return data?.message || `HTTP ${data?.status || ""}`.trim();
}

export async function apiRequest(path, { method = "GET", body, form } = {}) {
  const headers = authHeaders();
  let payload;
  if (form) {
    payload = form; // fetch FormData'ning Content-Type'ini o'zi qo'yadi
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(apiUrl(path), { method, headers, body: payload });
  let data = null;
  try { data = await res.json(); } catch {}

  if (!res.ok) {
    throw new ApiError(firstError(data) || "Xatolik", res.status, data);
  }
  return data;
}

// ------------------------------------------------------------- sozlamalar

export const getPreferences = () => apiRequest("/api/users/me/preferences");

export const patchPreferences = (patch) =>
  apiRequest("/api/users/me/preferences", { method: "PATCH", body: patch });

export const patchNotifications = (patch) =>
  apiRequest("/api/users/me/notifications", { method: "PATCH", body: patch });

// ------------------------------------------------------------- manzillar

export const listAddresses = () => apiRequest("/api/users/me/addresses");

export const createAddress = (body) =>
  apiRequest("/api/users/me/addresses", { method: "POST", body });

export const updateAddress = (id, body) =>
  apiRequest(`/api/users/me/addresses/${id}`, { method: "PATCH", body });

export const deleteAddress = (id) =>
  apiRequest(`/api/users/me/addresses/${id}`, { method: "DELETE" });

export const setDefaultAddress = (id) =>
  apiRequest(`/api/users/me/addresses/${id}/default`, { method: "POST" });

// ------------------------------------------------------------- sessiyalar

export const listSessions = () => apiRequest("/api/users/me/sessions");

export const revokeSession = (jti) =>
  apiRequest(`/api/users/me/sessions/${encodeURIComponent(jti)}`, { method: "DELETE" });

export const logoutAll = () => apiRequest("/api/users/me/logout-all", { method: "POST" });

// ------------------------------------------------------------- hisobni o'chirish

export const getDeletionPreview = () => apiRequest("/api/users/me/deletion-preview");

export const requestAccountDeletion = () =>
  apiRequest("/api/users/me/deletion/request", { method: "POST" });

export const confirmAccountDeletion = (code) =>
  apiRequest("/api/users/me/deletion/confirm", { method: "POST", body: { code } });

// ------------------------------------------------------------- to'lovlar

export const getPaymentMethods = () => apiRequest("/api/payments/methods");

export const getMyPayments = () => apiRequest("/api/payments/my");

// ------------------------------------------------------------- usta

export const getMyEarnings = () => apiRequest("/api/masters/me/earnings");

export const updateMySettings = (patch) =>
  apiRequest("/api/masters/me", { method: "PATCH", body: patch });

// ------------------------------------------------------------- yordam

export const sendSupportRequest = ({ type, message, order, attachments }) => {
  const form = new FormData();
  form.append("type", type || "support");
  form.append("message", message || "");
  if (order) form.append("order", order);
  (attachments || []).forEach((file) => {
    form.append("attachments", {
      uri: file.uri,
      name: file.name || `photo-${Date.now()}.jpg`,
      type: file.mimeType || "image/jpeg",
    });
  });
  return apiRequest("/api/feedback", { method: "POST", form });
};

// ------------------------------------------------------------- telefon

export const requestPhoneChange = (phone) =>
  apiRequest("/api/auth/change-phone/request", { method: "POST", body: { phone } });

export const confirmPhoneChange = (code) =>
  apiRequest("/api/auth/change-phone/confirm", { method: "POST", body: { code } });

export const isSignedIn = () => !!getToken();
