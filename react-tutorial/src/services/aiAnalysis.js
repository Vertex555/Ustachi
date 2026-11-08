import { apiUrl, authHeaders } from "./api";

const MAX_SIDE_MB = 40;

function pickLargestImage(images) {
  let best = null;
  for (const k of ["front", "back", "side"]) {
    const img = images && images[k];
    if (img && img.file && (!best || img.file.size > best.file.size)) best = img;
  }
  return best ? best.file : null;
}

function pickLargestVideo(images) {
  let best = null;
  for (const k of ["video"]) {
    const img = images && images[k];
    if (img && img.file && (!best || img.file.size > best.file.size)) best = img;
  }
  return best ? best.file : null;
}

function payloadFor(file) {
  if (!file) return null;
  if (file.size > MAX_SIDE_MB * 1024 * 1024) {
    return { error: "ai_videoTooLarge" };
  }
  const fd = new FormData();
  fd.append("media", file);
  return { fd, size: file.size };
}

// UploadScreen'da foydalanuvchi yuklagan video/foto asosida
// qurilma turi, model va muammoni aniqlash (Google Gemini — tekin).
// forcedFile: yangi yozilgan video bo'lsa uzatiladi (state hali yangilanmagan).
// Qaytargich: { device, model, issue, description } yoki { error }
export async function analyzeDeviceMedia(images, forcedFile) {
  const videoFile = forcedFile || pickLargestVideo(images);
  const photoFile = videoFile ? null : (forcedFile || pickLargestImage(images));
  const file = videoFile || photoFile;
  const payload = payloadFor(file);
  if (!payload) return { error: "ai_noMedia" };
  if (payload.error) return { error: payload.error };

  try {
    const res = await fetch(apiUrl("/api/ai/analyze"), {
      method: "POST",
      headers: authHeaders(),
      body: payload.fd,
    });
    if (!res.ok) {
      let msg = "ai_error";
      try {
        const j = await res.json();
        if (j && j.message) msg = j.message;
      } catch {}
      if (typeof msg === "string" && msg.includes("GEMINI_API_KEY")) return { error: "ai_noKey" };
      return { error: typeof msg === "string" && msg.length > 200 ? "ai_error" : msg };
    }
    const data = await res.json();
    if (data && data.success && data.data) return data.data;
    return { error: "ai_error" };
  } catch {
    return { error: "ai_error" };
  }
}

// Muammo matnini berilgan ro'yxatdagi eng mos variantga yaqinlashtirish
export function matchIssue(issueText, issueList) {
  const text = String(issueText || "").toLowerCase().trim();
  if (!text) return { issue: "", custom: false };
  let best = "";
  let bestScore = 0;
  for (const candidate of issueList) {
    const c = candidate.toLowerCase();
    let score = 0;
    text.split(/[^a-zа-яё0-9]+/).forEach((word) => {
      if (word.length >= 3 && c.includes(word) && !/[0-9]{3,}/.test(word)) score += 1;
    });
    if (score > bestScore) { bestScore = score; best = candidate; }
  }
  const fullMatch = issueList.some((it) => it.toLowerCase() === text);
  if (fullMatch) return { issue: issueList.find((it) => it.toLowerCase() === text), custom: false };
  if (bestScore > 0 && best) return { issue: best, custom: false };
  return { issue: String(issueText).slice(0, 120), custom: true };
}

// Qurilma nomini berilgan ro'yxatdagi mos variantga yaqinlashtirish
export function matchDevice(deviceText, deviceList) {
  const text = String(deviceText || "").toLowerCase().trim();
  if (!text) return "";
  for (const d of deviceList) {
    if (d.toLowerCase() === text) return d;
  }
  const aliases = {
    smartphone: "Smartfon", "smart phone": "Smartfon", telefon: "Smartfon", phone: "Smartfon",
    laptop: "Noutbuk", noutbook: "Noutbuk", notebook: "Noutbuk", kompyuter: "Noutbuk", computer: "Noutbuk",
    tablet: "Planshet", ipad: "Planshet", planshet: "Planshet",
    watch: "Soat", "smart watch": "Soat", "smart-watch": "Soat",
    tv: "TV", television: "TV", televizor: "TV",
    iron: "Dazmol", utyug: "Dazmol",
    "vacuum cleaner": "Changyutgich", changyutgich: "Changyutgich",
    hair_dryer: "Fen", fen: "Fen", "hair dryer": "Fen", kanfen: "Fen",
    microwave: "Mikrotolqin", mikrotolqinli: "Mikrotolqin", mikrotolqin: "Mikrotolqin",
    refrigerator: "Muzlatgich", fridge: "Muzlatgich", muzlatgich: "Muzlatgich",
    "washing machine": "Kir yuvish", washing: "Kir yuvish", kiryuvish: "Kir yuvish", kir: "Kir yuvish",
    conditioner: "Konditsioner", konditsioner: "Konditsioner", ac: "Konditsioner",
  };
  const token = text.split(/[^a-zа-яё0-9]+/).filter(Boolean).join(" ");
  for (const key of Object.keys(aliases)) {
    if (token.includes(key) || text.includes(key)) return aliases[key];
  }
  return "";
}