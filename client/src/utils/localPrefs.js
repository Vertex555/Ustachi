import { API_BASE_URL } from '../utils/constants';

/**
 * Read/write non-sensitive local preferences. Auth tokens and media are
 * intentionally NOT handled here.
 */
const KEY = 'ustachi_prefs';

export function getPrefs() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function setPrefs(patch) {
  const next = { ...getPrefs(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function getPref(key, fallback = null) {
  const prefs = getPrefs();
  return key in prefs ? prefs[key] : fallback;
}
