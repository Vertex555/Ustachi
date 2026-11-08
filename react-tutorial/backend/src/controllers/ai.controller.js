const fs = require("fs");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const DEVICE_LIST = [
  "Smartfon", "Noutbuk", "Planshet", "Soat", "TV",
  "Dazmol", "Changyutgich", "Fen", "Mikrotolqin", "Muzlatgich",
  "Kir yuvish", "Konditsioner",
];

// Videodagi ot-nutq/teksdan qurilma turini taxminiy aniqlash (backup)
function detectDevice(text) {
  const low = (text || "").toLowerCase();
  if (/phone|smartfon|telefon|iphone|android|samsung|redmi|xiaomi|huawei|oppo|vivo|realme|poco/i.test(low)) return "Smartfon";
  if (/noutbuk|laptop|macbook|notebook|komputer/i.test(low)) return "Noutbuk";
  if (/planshet|ipad|tablet/i.test(low)) return "Planshet";
  if (/smart[ -]?watch|apple watch|soat|saat/i.test(low)) return "Soat";
  if (/televizor|tv[^?]|led|oled/i.test(low)) return "TV";
  if (/dazmol|утюг/i.test(low)) return "Dazmol";
  if (/changyutgich|pylesos|пылесос/i.test(low)) return "Changyutgich";
  if (/soch feni|fen|фен/i.test(low)) return "Fen";
  if (/mikrotolqin|микроволнов/i.test(low)) return "Mikrotolqin";
  if (/muzlatgich|холодильник/i.test(low)) return "Muzlatgich";
  if (/kir yuvish|kiryuvish|kir mashina|стир/i.test(low)) return "Kir yuvish";
  if (/konditsioner|кондиционер|kondishka/i.test(low)) return "Konditsioner";
  return "";
}

// Muammo turini taxminiy aniqlash (backup)
function detectIssue(text, device) {
  const low = (text || "").toLowerCase();
  if (/zaryad|заряд|charge|gneoz|raz'em|gn`еоз/i.test(low)) return "Zaryad olmasligi (Gneoz)";
  if (/batareya|battery|тез tugash|быстро разряж|tez tugash/i.test(low)) return "Batareya tez tugashi";
  if (/ekran|screen|shisha|ostekol|razbilo|триснул|sindirdi|sinishi/i.test(low)) return "Ekran / Shisha sinishi";
  if (/kamera|camera/i.test(low)) return "Kamera ishlamasligi";
  if (/dinamik|mikrofon|ovoz|звук|speaker|mic/i.test(low)) return "Dinamik yoki Mikrofonda ovoz yo'q";
  if (/suv kirdi|water|влага|namlik/i.test(low)) return "Suv kirishi";
  if (/isitmay|не греет|no heat|qizmaydi/i.test(low)) return "Isitmayapti";
  if (/sovutmay|не холодит|no cooling|sovuq emas/i.test(low)) return "Sovutmayapti";
  if (/aylanmay|не крутит|baraban/i.test(low)) return "Baraban aylanmayapti";
  if (/shovqin|шоroq|звук|gurullay/i.test(low)) return "Kuchli shovqin (nojo'ya tovush)";
  return "";
}

function cleanModel(raw) {
  const s = String(raw || "")
    .trim()
    .replace(/[^\w ./-]/g, "")
    .slice(0, 60);
  if (s.length < 2) return "";
  return s;
}

// Modelni oddiy qilib qaytarish
function normalizeModel(raw) {
  const model = cleanModel(raw);
  if (!model) return "";
  const lower = model.toLowerCase();
  const known = ["iphone", "samsung", "xiaomi", "redmi", "poco", "huawei", "honor", "oppo", "vivo", "realme", "google", "oneplus", "nokia", "motorola", "infinix", "tecno", "itel", "macbook", "thinkpad", "aspire", "galaxy", "ipad"];
  if (known.some((k) => lower.includes(k))) return model;
  const first = model.split(/\s+/)[0];
  return first && first.length >= 3 ? first : model;
}

// Matndan (masalan description ichidan) qurilma modelini chiqarib olish
function extractModelFromText(text) {
  const src = String(text || "").slice(0, 300);
  if (!src) return "";
  const known = /(Samsung\s*(?:Galaxy\s*)?[A-Z0-9][\w-]*|Galaxy\s+[A-Za-z0-9][\w-]*(?:\s+[A-Za-z0-9]+)?|iPhone\s*\d+[\w-]*|Redmi\s+[A-Za-z0-9][\w-]*|Xiaomi\s+[A-Za-z0-9][\w-]*|POCO\s+[A-Za-z0-9][\w-]*|Huawei\s+[A-Za-z0-9][\w-]*|Honor\s+[A-Za-z0-9][\w-]*|Oppo\s+[A-Za-z0-9][\w-]*|Vivo\s+[A-Za-z0-9][\w-]*|Realme\s+[A-Za-z0-9][\w-]*|OnePlus\s+[A-Za-z0-9][\w-]*|Nokia\s+[A-Za-z0-9][\w-]*|Lenovo\s+[A-Za-z0-9][\w-]*|Asus\s+[A-Za-z0-9][\w-]*|Acer\s+[A-Za-z0-9][\w-]*|HP\s+[A-Za-z0-9][\w-]*|Dell\s+[A-Za-z0-9][\w-]*|MacBook\s*[A-Za-z0-9]*|iPad\s*[A-Za-z0-9]*)/
  const m = src.match(known);
  return m ? m[1].trim().slice(0, 60) : "";
}

// Model ni Gemini'ning shablon so'zlaridan tozalash (echolangan placeholder'larni rad etish)
function looksLikeInstruction(raw) {
  return /masalan|aniq model|muammoni|bo['’` ]?sh(?: qoldir)?|yoki|qaytar|shablon|kalitlar|l[iy]st/i.test(
    String(raw || "").slice(0, 60)
  );
}

// Model tanlash: birinchi aniq brend+model, agar yo'q bo'lsa device/description dan qidiramiz
function pickModel(parsedModel, deviceRaw, descriptionText) {
  const pm = trimModel(String(parsedModel || ""));
  if (pm && !looksLikeInstruction(pm)) {
    return extractModelFromText(pm) || normalizeModel(pm);
  }
  // Gemini ba'zan modelni device maydoniga qo'shib yozadi: "Smartfon Samsung S21"
  const fromDevice = extractModelFromText(String(deviceRaw || ""));
  if (fromDevice) return fromDevice;
  return extractModelFromText(String(descriptionText || ""));
}

function trimModel(raw) {
  return String(raw || "").trim();
}

// "00:05" / "5" / "5s" kabi soniyalarni qayta ishlash
function parseSeconds(v) {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
  const s = String(v).trim();
  const mmss = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (mmss) {
    const sec = parseInt(mmss[1], 10) * 60 + parseInt(mmss[2], 10);
    return sec > 0 ? sec : null;
  }
  const f = parseFloat(s.replace(/[sS秒]/g, ""));
  return Number.isFinite(f) && f > 0 ? Math.round(f) : null;
}

// Video / rasm mazmunini tahlil qilib, qurilma + model + muammo chiqaramiz
exports.analyze = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Video yoki rasm yuklang" });
    }
    if (!GEMINI_API_KEY) {
      return res.status(503).json({
        success: false,
        message: "AI tahlil o'chirilgan — serverda GEMINI_API_KEY sozlanmagan",
      });
    }

    const data = fs.readFileSync(req.file.path);
    const base64 = data.toString("base64");
    const ext = (req.file.originalname.split(".").pop() || "mp4").toLowerCase();
    const mime =
      ext === "mp4" ? "video/mp4"
      : ext === "mov" ? "video/quicktime"
      : ext === "webm" ? "video/webm"
      : req.file.mimetype || "image/jpeg";
    const isVideo = String(mime).startsWith("video/");

    // Gemini videoni ham rasmni ham inline qabul qiladi
    const prompt = `Siz xizmat ko'rsatish ustassiz. Foydalanuvchi buzilgan qurilmasini ${isVideo ? "video" : "foto"}da ko'rsatdi.
${isVideo ? "Videodagi ovozli tushuntirishni diqqat bilan tinglang va har bir sahna qaysi soniyada ko'rsatilganini aniqlang." : ""}
Mening savolimga FAQAT bitta JSON qaytar, boshqa hech qanday matn yozma:
{"device":"Smartfon","model":"Samsung Galaxy S21","issue":"zaryad olmayapti","description":"Qurilma zaryad olmayapti, kontakt ham yetib kelmayotgandek","frames":{"front":1,"back":2,"defect":3}}

Qoidalar:
- device faqat shu ro'yxatdagi so'zlardan biriga teng bo'lsin: Smartfon, Noutbuk, Planshet, Soat, TV, Dazmol, Changyutgich, Fen, Mikrotolqin, Muzlatgich, Kir yuvish, Konditsioner. Boshqa so'z yozma.
- model = suratda/videoda/ovozda ko'ringan yoki aytilgan brend va model, masalan "Samsung Galaxy S21", "iPhone 13", "Redmi Note 12 5G". Bo'sh qoldirmaslikka harakat qil: faqat brend aniq bo'lsa ham uni yoz (masalan "Samsung"). Umuman aniqlash imkoni bo'lmasagina bo'sh qoldir.
- issue = bitta aniq asosiy muammo, masalan "ekran shisha sinishi", "zaryad olmayapti", "qizib o'chib qoladi". HECH QACHON bo'sh qoldirma: videodagi audio yoki ko'ringan nuqsonga asoslanib taxmin qil.
- description = muammoning o'zbekcha 1-2 jumlali aniq xulosasi; qisqa bo'lsin, audio bo'lmasa ko'ringan nuqsonga qarab yoz.
- frames faqat video uchun (foto bo'lsa hammasi 0): front = qurilmaning old tomoni ko'rsatilgan soniya, back = orqa tomoni ko'rsatilgan soniya, defect = zarar/nuqson joyi yaqindan ko'rsatilgan soniya. Butun son; aniq aniqlanmasa 0 yoz.
Xato qilmaslik uchun: faqat JSON qaytar, shablon so'zlarni va tushuntirish matnini takrorlama.`;

    const parts = [{ text: prompt }];
    parts.push({ inline_data: { mime_type: mime, data: base64 } });

    // Bepul kwota 503/"high demand" qaytarsa keyingi modelga o'tamiz
    const fallbackModels = [
      GEMINI_MODEL,
      "gemini-flash-latest",
      "gemini-2.5-flash-lite",
      "gemini-flash-lite-latest",
    ].filter((m, i, arr) => m && arr.indexOf(m) === i);

    let text = "";
    let lastErr = "";
    let lastStatus = 0;

    for (const model of fallbackModels) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
            }),
            signal: controller.signal,
          }
        );
        clearTimeout(timer);

        if (!resp.ok) {
          lastStatus = resp.status;
          lastErr = (await resp.text().catch(() => "")).slice(0, 300);
          // Auth/loyiha xatosi — boshqa modelga o'tish yordam bermaydi, to'xtaymiz
          if (resp.status === 400 || resp.status === 401 || resp.status === 403) break;
          continue;
        }

        const dataJson = await resp.json();
        const candidate = (dataJson.candidates || [])[0];
        if (candidate && candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.text) { text = String(part.text).trim(); break; }
          }
        }
        if (text) break;
        if (dataJson.promptFeedback) {
          lastErr = dataJson.promptFeedback.blockReason || "BLOCKED";
          continue;
        }
      } catch (err) {
        clearTimeout(timer);
        lastErr = err.message || String(err);
        // Abort — aloqada uzilish, keyingi modelga o'tamiz
        continue;
      }
    }

    if (!text) {
      return res.status(502).json({
        success: false,
        message: lastErr.includes("API key")
          ? "AI kalit noto'g'ri yoki limit tugagan"
          : "AI xizmati hozir band — birozdan so'ng qayta urinib ko'ring",
        detail: String(lastErr).slice(0, 300) || String(lastStatus),
      });
    }

    let parsed = {};
    try {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    } catch (e) {
      parsed = {};
    }

    // Gemini ba'zan javobni markdown blokka o'raydi — descriptionda chiqmasligi uchun tozalaymiz
    const isJsonOnly = /^```\s*(json)?\s*\{|^\s*\{/.test(text);
    // JSON blokdan tashqaridagi matn (AI tushuntirishidan qolgan izlar) — detected uchun foydalanamiz
    const residualText = String(text)
      .replace(/^\s*```\s*(json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .replace(/\{[\s\S]*\}/, "")
      .trim();
    const description = String(parsed.description || (isJsonOnly ? residualText : text) || "")
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim()
      .slice(0, 500);

    const rawDevice = String(parsed.device || "").trim();
    const device =
      DEVICE_LIST.find((d) => d.toLowerCase() === rawDevice.toLowerCase()) ||
      detectDevice(rawDevice) ||
      detectDevice(description || "") ||
      detectDevice(residualText || "") ||
      detectDevice(text || "") ||
      DEVICE_LIST.find((d) => rawDevice.toLowerCase().includes(d.toLowerCase())) ||
      "";
    const model =
      pickModel(parsed.model, rawDevice, description) ||
      pickModel(parsed.model, parsed.device, parsed.description || "") ||
      extractModelFromText(parsed.description || "") ||
      "";
    const detectorText = [String(parsed.issue || ""), String(parsed.description || ""), description, residualText]
      .filter((s) => s && s.trim())
      .join("\n");
    const issue = String(parsed.issue || "").trim() ||
      detectIssue(detectorText || text, device) ||
      detectIssue(text, device) ||
      "";

    // Videodagi muhim sahnalar (front/back/defect) soniyalari — AI aniqlaydi
    let frames = {};
    if (isVideo) {
      for (const k of ["front", "back", "defect"]) {
        frames[k] = parseSeconds(parsed.frames && parsed.frames[k]);
      }
    }

    return res.json({
      success: true,
      data: { device, model, issue, description, frames },
    });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(400).json({ success: false, message: "Noto'g'ri so'rov formati" });
    }
    return res.status(500).json({ success: false, message: "AI tahlil xatolik: " + err.message });
  } finally {
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
  }
};