const Master = require("../models/Master");
const Order = require("../models/Order");
const Review = require("../models/Review");
const {
  serializeMaster,
  parsePagination,
  paginationMeta,
  escapeRegex,
} = require("../utils/helpers");
const { validateMasterSettingsPatch, isValidVerificationStatus } = require("../utils/validation");

// Umumiy ustalar katalogi (barcha userlar ko'radi)
exports.list = async (req, res) => {
  const pag = parsePagination(req.query);
  const filter = { isPublished: { $ne: false } };

  if (req.query.device) {
    filter.devices = String(req.query.device);
  }

  // Matn bo'yicha qidiruv: ism, tajriba, qurilma nomlari
  const q = String(req.query.q || "").trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: rx }, { experience: rx }, { devices: rx }, { "location.address": rx }];
  }

  // Narx chegarasi
  const maxPrice = Number(req.query.maxPrice);
  if (Number.isFinite(maxPrice) && maxPrice > 0) {
    filter.price = { $lte: maxPrice };
  }

  // Saralash: reyting (standart) yoki narx
  const sort = {};
  if (req.query.sort === "price_asc") sort.price = 1;
  else if (req.query.sort === "price_desc") sort.price = -1;
  else sort.rating = -1;

  const total = pag.enabled ? await Master.countDocuments(filter) : 0;
  const masters = await Master.find(filter)
    .sort(sort)
    .skip(pag.skip)
    .limit(pag.limit || 0)
    .lean();
  res.json({
    success: true,
    data: masters.map(serializeMaster),
    ...(pag.enabled ? { pagination: paginationMeta(pag, total) } : {}),
  });
};

// Joriy usta o'z profilini olish (faqat egasi ko'radi — verifikatsiya ham)
exports.me = async (req, res) => {
  const master = await Master.findOne({ user: req.user._id }).lean();
  if (!master) {
    return res.status(404).json({ success: false, message: "Profil topilmadi" });
  }
  res.json({ success: true, data: serializeMaster(master, { private: true }) });
};

// Joriy usta profilini yangilash (banner, photo, name, price va h.k.)
exports.updateMe = async (req, res) => {
  const master = await Master.findOne({ user: req.user._id });
  if (!master) {
    return res.status(404).json({ success: false, message: "Profil topilmadi" });
  }
  const { banner, photo, name, phone, experience, devices } = req.body || {};
  if (banner !== undefined) master.banner = String(banner || "") || undefined;
  if (photo !== undefined) master.photo = String(photo || "") || undefined;
  if (name !== undefined && name !== "undefined") master.name = String(name).trim();
  if (phone !== undefined && phone !== "undefined") {
    const clean = String(phone).replace(/[\s-]/g, "");
    master.phone = clean;
    // Haqiqiy telefon qo'shilsa profil katalogga chiqadi
    if (!isGuestPhone(clean)) master.isPublished = true;
  }
  if (experience !== undefined) master.experience = String(experience || "").trim();
  if (Array.isArray(devices) && devices.length > 0) master.devices = devices;

  // ---- Usta sozlamalari (yo'nalish, hudud, radius, holat, narx, ish vaqti) ----
  const body = { ...(req.body || {}) };
  ["banner", "photo", "name", "phone", "experience", "devices"].forEach((k) => {
    delete body[k];
  });
  const settings = validateMasterSettingsPatch(body);
  if (!settings.ok) {
    return res.status(400).json({
      success: false,
      message: settings.errors.join("; "),
      code: "validation_error",
    });
  }
  Object.entries(settings.patch).forEach(([k, v]) => master.set(k, v));

  await master.save();
  res.json({ success: true, data: serializeMaster(master, { private: true }) });
};

// ------------------------------------------------ Usta daromadi (faqat o'z buyurtmalari)
// Faqat "paid" holatdagi buyurtmalar hisobga olinadi.
exports.earnings = async (req, res) => {
  const master = await Master.findOne({ user: req.user._id }).select("_id").lean();
  if (!master) {
    return res.status(404).json({ success: false, message: "Profil topilmadi" });
  }

  const match = { master: master._id, paymentStatus: "paid" };
  const [totals, monthly, recent, totalOrders] = await Promise.all([
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          revenue: { $sum: "$price" },
          commission: { $sum: "$commission" },
          count: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          total: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]),
    Order.find(match)
      .sort({ createdAt: -1 })
      .limit(20)
      .select("orderNumber device price commission total paymentStatus currency createdAt")
      .lean(),
    Order.countDocuments({ master: master._id }),
  ]);

  const t = totals[0] || { total: 0, revenue: 0, commission: 0, count: 0 };

  res.json({
    success: true,
    data: {
      summary: {
        paidCount: t.count,
        totalOrders,
        total: t.total,
        revenue: t.revenue,
        commission: t.commission,
        currency: "uzs",
      },
      monthly: monthly.map((m) => ({
        year: m._id.year,
        month: m._id.month,
        total: m.total,
        count: m.count,
      })),
      recent: recent.map((o) => ({
        id: o._id.toString(),
        orderNumber: o.orderNumber,
        device: o.device,
        price: o.price,
        commission: o.commission,
        total: o.total,
        createdAt: o.createdAt,
      })),
    },
  });
};

// ------------------------------------------------ Bitta ustaning chop etilgan sharhlari
exports.reviews = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const filter = { master: req.params.id, status: "published" };

  const [items, total, agg] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "name photo")
      .lean(),
    Review.countDocuments(filter),
    Review.aggregate([
      { $match: filter },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]),
  ]);

  const s = agg[0] || { avg: 0, count: 0 };
  res.json({
    success: true,
    data: items.map((r) => ({
      id: r._id.toString(),
      rating: r.rating,
      text: r.text || "",
      orderNumber: r.orderNumber,
      userName: (r.user && r.user.name) || "Foydalanuvchi",
      userPhoto: (r.user && r.user.photo) || null,
      masterResponse: r.masterResponse || "",
      createdAt: r.createdAt,
    })),
    summary: {
      average: Math.round((s.avg || 0) * 10) / 10,
      count: s.count || total,
    },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

// ------------------------------------------------ Admin: verifikatsiya holatini o'zgartirish
exports.setVerification = async (req, res) => {
  const status = String(req.body?.status || "").trim().toLowerCase();
  const note = String(req.body?.note || "").trim().slice(0, 300);
  if (!isValidVerificationStatus(status)) {
    return res.status(400).json({
      success: false,
      message: "Holat noto'g'ri (none | pending | approved | rejected)",
      code: "validation_error",
    });
  }
  const master = await Master.findById(req.params.id);
  if (!master) {
    return res.status(404).json({ success: false, message: "Usta topilmadi" });
  }
  master.verification = { status, note, updatedAt: new Date() };
  await master.save();
  res.json({ success: true, data: serializeMaster(master, { private: true }) });
};

// Bitta usta profili (ID bo'yicha — foydalanuvchi ko'rishi uchun)
exports.getOne = async (req, res) => {
  const master = await Master.findById(req.params.id).lean();
  if (!master) {
    return res.status(404).json({ success: false, message: "Usta topilmadi" });
  }
  res.json({ success: true, data: serializeMaster(master) });
};

// Umumiy katalogda telefon raqam bandligini tekshirish
async function phoneTakenByOtherPhone(phone, excludeMasterId) {
  const doc = await Master.findOne({
    phone,
    _id: { $ne: excludeMasterId || null },
  }).lean();
  return doc ? doc : null;
}

// Guest telefon (`guest-...`) — ro'yxatdan o'tmagan usta
function isGuestPhone(phone) {
  return /^guest-/i.test(String(phone || "").trim());
}

// Usta anketasini yaratish / yangilash
exports.create = async (req, res) => {
  const {
    name, phone, experience, devices, location,
    price, currency, workingHours, photo, banner,
  } = req.body || {};

  const errors = [];
  if (!(name || "").trim()) errors.push("Ism kiritilishi shart");
  if ((name || "").trim().length > 100) errors.push("Ism juda uzun (maks. 100)");
  if (!(phone || "").trim()) errors.push("Telefon raqam kiritilishi shart");
  if (!(experience || "").trim()) errors.push("Tajriba kiritilishi shart");
  if ((experience || "").length > 500) errors.push("Tajriba matni juda uzun");
  if (!Array.isArray(devices) || devices.length === 0) {
    errors.push("Kamida bitta qurilma tanlanishi shart");
  }
  if (devices.length > 10) errors.push("Juda ko'p qurilma tanlandi");
  if (Number(price) < 0) errors.push("Narf manfiy bo'lishi mumkin emas");
  if (Number(price) > 999999999) errors.push("Narf juda katta");
  const currencyVal = ["uzs", "rub", "usd", "eur"].includes(String(currency || ""))
    ? String(currency)
    : "uzs";
  if ((workingHours || "").length > 200) errors.push("Ish vaqti juda uzun");
  if (errors.length) {
    const msg = errors.join("; ");
    return res.status(400).json({ success: false, message: msg, error: msg });
  }

  const phoneNormalized = String(phone || "").replace(/[\s-]/g, "");

  // Bitta nomerdan bitta usta: mavjud profil
  const exists = await Master.findOne({ user: req.user._id });

  // Telefon raqam bandligi (o'zidan boshqa) — global katalogda
  const taken = await phoneTakenByOtherPhone(phoneNormalized, exists && exists._id);
  if (taken) {
    return res.status(409).json({
      success: false,
      message: `Bu telefon raqam allaqachon usta («${taken.name}») sifatida ro'yxatdan o'tgan. Bitta raqamdan bitta usta ochish mumkin.`,
      error: "phone_taken",
    });
  }

  const payload = {
    user: req.user._id,
    name: String(name).trim(),
    phone: phoneNormalized,
    experience: String(experience).trim(),
    devices,
    location: location || undefined,
    price: Number(price) || 0,
    currency: currencyVal,
    workingHours: String(workingHours || "").trim(),
    photo: String(photo || "") || undefined,
    banner: String(banner || "") || undefined,
    // Haqiqiy telefon kiritilgandagina profil katalogga chiqadi
    isPublished: !isGuestPhone(phoneNormalized),
  };

  if (exists) {
    Object.assign(exists, payload);
    await exists.save();
    return res.json({ success: true, data: serializeMaster(exists) });
  }

  const master = await Master.create(payload);
  res.status(201).json({ success: true, data: serializeMaster(master) });
};
