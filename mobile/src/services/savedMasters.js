import { apiUrl, authHeaders } from "./api";
import { getItem, setItem, removeItem } from "./storage";

const LS_KEY = "ustachi_saved_ids";

async function readLocal() {
  try {
    const raw = await getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function writeLocal(list) {
  try {
    await setItem(LS_KEY, JSON.stringify(list));
  } catch {}
}

function normalizeFromServer(m) {
  return m
    ? {
        id: String(m.id || m._id || ""),
        name: m.name || "",
        phone: m.phone || "",
        photo: m.photo || null,
        rating: m.rating ?? 0,
        price: m.price ?? 0,
        workingHours: m.workingHours || "",
        location: m.location || null,
        devices: m.devices || [],
      }
    : null;
}

function mergeLists(serverList, localList) {
  const map = {};
  (serverList || []).forEach((m) => { if (m && m.id) map[String(m.id)] = normalizeFromServer(m); });
  (localList || []).forEach((m) => { if (m && m.id && !map[String(m.id)]) map[String(m.id)] = normalizeFromServer(m); });
  return Object.values(map);
}

export async function fetchSavedMasters() {
  try {
    const res = await fetch(apiUrl("/api/users/me/saved-masters"), { headers: authHeaders() });
    const data = await res.json();
    if (res.ok && data.success && Array.isArray(data.data)) {
      const merged = mergeLists(data.data, await readLocal());
      await writeLocal(merged);
      return merged;
    }
  } catch {}
  return readLocal();
}

export async function getSavedMasters() {
  return fetchSavedMasters();
}

export async function isMasterSaved(id) {
  const list = await fetchSavedMasters();
  return list.some((m) => String(m.id) === String(id));
}

export async function saveMaster(master) {
  const id = master && (master.id || master._id);
  if (!id) return fetchSavedMasters();
  const idStr = String(id);
  const local = await readLocal();
  if (!local.some((m) => String(m.id) === idStr)) {
    local.push(normalizeFromServer(master));
    await writeLocal(local);
  }
  try {
    await fetch(apiUrl(`/api/users/me/saved-masters/${idStr}`), {
      method: "POST",
      headers: authHeaders(),
    });
  } catch {}
  return fetchSavedMasters();
}

export async function unsaveMaster(id) {
  const idStr = String(id || "");
  try {
    await writeLocal((await readLocal()).filter((m) => String(m.id) !== idStr));
  } catch {}
  try {
    await fetch(apiUrl(`/api/users/me/saved-masters/${idStr}`), {
      method: "DELETE",
      headers: authHeaders(),
    });
  } catch {}
  return fetchSavedMasters();
}

export async function clearSavedMastersLocal() {
  try {
    await removeItem(LS_KEY);
  } catch {}
}