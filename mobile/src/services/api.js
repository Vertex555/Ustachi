import { apiUrl } from "../config";
import { getItem, setItem as setStorageItem, removeItem as removeStorageItem } from "./storage";

let cachedToken = null;

// Ilova boshlanganda AsyncStorage'dan tokenni xotiraga yuklash
export async function loadTokenFromStorage() {
  cachedToken = (await getItem("token")) || null;
  return cachedToken;
}

export function getToken() {
  return cachedToken;
}

export function setToken(token) {
  cachedToken = token || null;
  if (cachedToken) setStorageItem("token", cachedToken);
  else removeStorageItem("token");
}

export function authHeaders(extra = {}) {
  if (!cachedToken) return extra;
  return { Authorization: `Bearer ${cachedToken}`, ...extra };
}