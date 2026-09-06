const Master = require("../models/Master");
const { serializeMaster } = require("../utils/helpers");

// Umumiy ustalar katalogi (barcha userlar ko'radi)
exports.list = async (req, res) => {
  const filter = {};
  if (req.query.device) {
    filter.devices = String(req.query.device);
  }
  const masters = await Master.find(filter).sort({ rating: -1 }).lean();
  res.json({ success: true, data: masters.map(serializeMaster) });
};

// Joriy usta o'z profilini olish
exports.me = async (req, res) => {
  const master = await Master.findOne({ user: req.user._id }).lean();
  if (!master) {
    return res.status(404).json({ success: false, message: "Profil topilmadi" });
  }
  res.json({ success: true, data: serializeMaster(master) });
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

// Usta anketasini yaratish / yangilash
exports.create = async (req, res) => {
  const {
    name, phone, experience, devices, location,
    price, workingHours, bankCard, cardholderName, photo,
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
    workingHours: String(workingHours || "").trim(),
    bankCard: String(bankCard || "").trim(),
    cardholderName: String(cardholderName || "").trim(),
    photo: String(photo || "") || undefined,
  };

  if (exists) {
    Object.assign(exists, payload);
    await exists.save();
    return res.json({ success: true, data: serializeMaster(exists) });
  }

  const master = await Master.create(payload);
  res.status(201).json({ success: true, data: serializeMaster(master) });
};
