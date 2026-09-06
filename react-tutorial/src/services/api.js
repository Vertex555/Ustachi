const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}

export function authHeaders(extra = {}) {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token) {
  if (token) {
    localStorage.setItem("token", token);
  } else {
    localStorage.removeItem("token");
  }
}