const Feedback = require("../models/Feedback");
const Order = require("../models/Order");
const User = require("../models/User");
const Master = require("../models/Master");
const { parsePagination, paginationMeta } = require("../utils/helpers");

const VALID_TYPES = ["suggestion", "complaint", "question", "praise", "support"];
const MAX_ATTACHMENTS = 5;

// Ilovalarni xavfsizroq qilish: faqat o'zimizning upload fayllarimizga
// yo'naltirilgan URL'lar qabul qilinadi.
function sanitizeAttachments(files) {
  const list = Array.isArray(files) ? files.slice(0, MAX_ATTACHMENTS) : [];
  return list
    .map((f) => {
      const original = String(f && f.originalname ? f.originalname : "").trim().slice(0, 120);
      return {
        url: `/uploads/${encodeURIComponent(String(f.filename))}`,
        name: original,
        mime: String(f.mimetype || "").slice(0, 60),
        size: Math.max(0, Math.round(Number(f.size) || 0)),
      };
    })
    .filter((a) => a.url && a.url !== "/uploads/undefined");
}

function serializeAttachment(a) {
  return {
    url: a.url,
    name: a.name || "",
    mime: a.mime || "",
    size: a.size || 0,
  };
}

// Avtomatik javob (maqtovga tashakkur, shikoyatga minnatdorlik)
const AUTO_NOTES = {
  uz: {
    praise: "Rahmat! Sizning maqtovingiz bizni juda quvontiradi. Xizmatimizni yanada yaxshilashda davom etamiz.",
    complaint: "Fikringiz uchun rahmat! Bu muammoni ko'rib chiqamiz va albatta tuzatamiz.",
  },
  ru: {
    praise: "Спасибо! Ваша похвала очень радует нас. Продолжаем улучшать наш сервис.",
    complaint: "Спасибо за ваше обращение! Мы рассмотрим эту проблему и обязательно исправим её.",
  },
  en: {
    praise: "Thank you! Your praise makes us very happy. We keep improving our service.",
    complaint: "Thank you for your feedback! We will review this problem and fix it.",
  },
};

// Maqtov va shikoyat uchun operator javob berishini kutmay, darhol minnatdorlik bildiradi
function buildAutoReply(type, lang) {
  const l = AUTO_NOTES[lang] ? lang : "uz";
  const note = AUTO_NOTES[l] && AUTO_NOTES[l][type] ? AUTO_NOTES[l][type] : "";
  if (!note) return null;
  return { adminNote: note, status: type === "praise" ? "answered" : "new" };
}

// Foydalanuvchi/usta taklif, shikoyat yoki yordam so'rovi yuboradi
exports.create = async (req, res) => {
  let type = String(req.body?.type || "suggestion");
  if (!VALID_TYPES.includes(type)) type = "suggestion";
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ success: false, message: "Xabar matnini kiriting" });
  if (text.length > 2000) return res.status(400).json({ success: false, message: "Xabar juda uzun (maks. 2000 belgi)" });

  const myMaster = await Master.findOne({ user: req.user._id }).lean();
  const role = myMaster ? "master" : req.user.role;

  // Ixtiyoriy bog'liq buyurtma — faqat o'z buyurtmasini bog'lashi mumkin
  let order = null;
  const orderId = String(req.body?.orderId || "").trim();
  if (/^[a-fA-F0-9]{24}$/.test(orderId)) {
    const owned = await Order.findOne({ _id: orderId, user: req.user._id }).select("_id").lean();
    if (owned) order = owned._id;
  }

  const auto = buildAutoReply(type, String(req.body?.lang || "uz"));
  const attachments = sanitizeAttachments(req.files);
  const fb = await Feedback.create({
    user: req.user._id,
    role,
    type,
    text,
    contact: String(req.body?.contact || "").trim().slice(0, 100),
    attachments,
    order,
    adminNote: auto ? auto.adminNote : "",
    status: auto ? auto.status : "new",
  });

  res.status(201).json({
    success: true,
    data: {
      id: fb._id.toString(),
      type: fb.type,
      status: fb.status,
      adminNote: fb.adminNote || "",
      attachments: (fb.attachments || []).map(serializeAttachment),
      createdAt: fb.createdAt,
    },
  });
};

// Joriy foydalanuvchining yuborgan xabarlari
exports.my = async (req, res) => {
  const pag = parsePagination(req.query);
  const query = { user: req.user._id };
  const total = pag.enabled ? await Feedback.countDocuments(query) : 0;
  const list = await Feedback.find(query)
    .sort({ createdAt: -1 })
    .skip(pag.skip)
    .limit(pag.limit || 0)
    .lean();
  res.json({
    success: true,
    data: list.map((f) => ({
      id: f._id.toString(),
      type: f.type,
      role: f.role,
      status: f.status,
      text: f.text,
      adminNote: f.adminNote || "",
      contact: f.contact || "",
      attachments: (f.attachments || []).map(serializeAttachment),
      orderId: f.order ? f.order.toString() : null,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    })),
    ...(pag.enabled ? { pagination: paginationMeta(pag, total) } : {}),
  });
};

// Admin: barcha xabarlar (kim yozgan, qachon, status)
exports.allForAdmin = async (req, res) => {
  const pag = parsePagination(req.query);
  const status = req.query.status || null;
  const query = status ? { status } : {};
  const total = pag.enabled ? await Feedback.countDocuments(query) : 0;
  let list = await Feedback.find(query)
    .sort({ createdAt: -1 })
    .skip(pag.skip)
    .limit(pag.limit || 0)
    .lean();

  const userIds = list.map((f) => f.user).filter(Boolean);
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = {};
  users.forEach((u) => { userMap[u._id.toString()] = u; });

  list = list.map((f) => ({
    id: f._id.toString(),
    role: f.role,
    type: f.type,
    text: f.text,
    status: f.status,
    adminNote: f.adminNote || "",
    contact: f.contact || "",
    attachments: (f.attachments || []).map(serializeAttachment),
    orderId: f.order ? f.order.toString() : null,
    createdAt: f.createdAt,
    author: {
      id: f.user ? f.user.toString() : null,
      name: f.user && userMap[f.user.toString()] ? (userMap[f.user.toString()].name || "") : "",
      phone: f.user && userMap[f.user.toString()] ? userMap[f.user.toString()].phone : "",
    },
  }));

  res.json({
    success: true,
    data: list,
    ...(pag.enabled ? { pagination: paginationMeta(pag, total) } : {}),
  });
};

// Admin: statusni yangilash (viewed / answered)
exports.updateForAdmin = async (req, res) => {
  const { status, adminNote } = req.body || {};
  const fb = await Feedback.findById(req.params.id);
  if (!fb) return res.status(404).json({ success: false, message: "Xabar topilmadi" });

  if (status === "viewed" || status === "answered" || status === "new") fb.status = status;
  if (adminNote !== undefined) fb.adminNote = String(adminNote || "").slice(0, 1000);
  await fb.save();

  res.json({ success: true, data: { id: fb._id.toString(), status: fb.status, adminNote: fb.adminNote } });
};