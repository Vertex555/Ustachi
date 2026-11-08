// Backend manzili.
// Android emulatorida: http://10.0.2.2:5000 (kompyuterdagi localhost)
// Haqiqiy telefonda: kompyuteringizning LAN IP manzili, masalan: "http://192.168.1.10:5000"
export const API_URL = "http://10.0.2.2:5000";

export function apiUrl(path) {
  return `${API_URL}${path}`;
}

// Backenddan kelgan nisbiy rasm yo'lini (masalan "/uploads/x.jpg") to'liq URL'ga aylantiradi
export function absoluteUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (String(path).startsWith("data:")) return path;
  return `${API_URL}${path}`;
}