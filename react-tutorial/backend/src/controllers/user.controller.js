const User = require("../models/User");
const Master = require("../models/Master");
const { serializeUser, serializeMaster } = require("../utils/helpers");
const { sendVerificationCode } = require("../services/telegram");

const VALID_ROLES = ["user", "master"];

function validPhone(value) {
  return /^\+998\d{9}$/.test(value || "");
}

function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Foydalanuvchi rolini yangilash (User / Master)
exports.updateMe = async (req, res) => {
  const role = req.body?.role;

  if (!VALID_ROLES.includes(role)) {
    return res
      .status(400)
      .json({ success: false, message: "Noto'g'ri rol tanlandi" });
  }

  req.user.role = role;
  await req.user.save();

  res.json({ success: true, user: serializeUser(req.user) });
};

// Profil ma'lumotlarini yangilash (ism, email, avatar, telefon)
exports.updateProfile = async (req, res) => {
  const { name, email, photo, phone } = req.body || {};

  if (name !== undefined) req.user.name = String(name || "").trim();
  if (email !== undefined) req.user.email = String(email || "").trim();
  if (photo !== undefined) req.user.photo = String(photo || "") || null;

  if (phone !== undefined) {
    const cleanPhone = String(phone || "").replace(/[\s-]/g, "");
    if (cleanPhone && !validPhone(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Telefon raqam formati noto'g'ri (misol: +998901234567)",
      });
    }
    if (cleanPhone) {
      const takenUser = await User.findOne({ phone: cleanPhone });
      if (takenUser && takenUser._id.toString() !== req.user._id.toString()) {
        return res.status(409).json({ success: false, message: "Bu raqam allaqachon ishlatilmoqda" });
      }
      const takenMaster = await Master.findOne({ phone: cleanPhone }).lean();
      if (takenMaster && req.user.role !== "master") {
        return res.status(409).json({ success: false, message: "Bu raqam allaqachon usta sifatida ro'yxatdan o'tgan" });
      }
      req.user.phone = cleanPhone;
    }
  }

  await req.user.save();
  res.json({ success: true, user: serializeUser(req.user) });
};

// Saqlangan ustalar ro'yxati (to'liq ma'lumot bilan)
exports.mySavedMasters = async (req, res) => {
  const user = await User.findById(req.user._id).populate("savedMasters").lean();
  const list = (user && user.savedMasters ? user.savedMasters : []).filter(Boolean);
  res.json({ success: true, data: list.map(serializeMaster) });
};

// Ustani saqlash
exports.addSavedMaster = async (req, res) => {
  const masterId = String(req.params?.id || "");
  const master = await Master.findById(masterId);
  if (!master) {
    return res.status(404).json({ success: false, message: "Usta topilmadi" });
  }

  const user = await User.findById(req.user._id);
  const saved = user.savedMasters || [];
  if (!saved.some((s) => String(s) === String(master._id))) {
    saved.push(master._id);
    user.savedMasters = saved;
    await user.save();
  }

  res.json({ success: true, user: serializeUser(user) });
};

// Saqlangan ustani o'chirish
exports.removeSavedMaster = async (req, res) => {
  const masterId = String(req.params?.id || "");
  const user = await User.findById(req.user._id);
  user.savedMasters = (user.savedMasters || []).filter(
    (s) => String(s) !== masterId
  );
  await user.save();

  res.json({ success: true, user: serializeUser(user) });
};

// Telefon raqamni o'zgartirish — 1-qadam: yangi raqamga kod yuborish
exports.changePhoneRequest = async (req, res) => {
  const newPhone = String(req.body?.newPhone || "").trim();
  if (!validPhone(newPhone)) {
    return res.status(400).json({
      success: false,
      message: "Telefon raqam formati noto'g'ri (misol: +998901234567)",
    });
  }

  // Boshqa user tomonidan band ekanligini tekshirish
  const existingUser = await User.findOne({ phone: newPhone });
  if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
    return res.status(409).json({ success: false, message: "Bu raqam allaqachon ishlatilmoqda" });
  }

  // Usta katalogida bandmi
  const takenMaster = await Master.findOne({ phone: newPhone.replace(/[\s-]/g, "") }).lean();
  if (takenMaster) {
    return res.status(409).json({ success: false, message: "Bu raqam allaqachon usta sifatida ro'yxatdan o'tgan" });
  }

  const code = generateCode();
  req.user.verificationCode = code;
  req.user.codeExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
  req.user.pendingPhone = newPhone;
  await req.user.save();

  const payload = { success: true, message: "Kod yuborildi" };
  try {
    if (req.user.telegramChatId) {
      await sendVerificationCode(newPhone, code, req.user.telegramChatId);
    } else if (process.env.NODE_ENV !== "production") {
      payload.devCode = code;
    } else {
      return res.status(400).json({ success: false, message: "Telegram bog'lanmagan" });
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      payload.devCode = code;
    }
  }

  res.json(payload);
};

// Telefon raqamni o'zgartirish — 2-qadam: kodni tasdiqlash
exports.changePhoneVerify = async (req, res) => {
  const newPhone = String(req.body?.newPhone || "").trim();
  const code = String(req.body?.code || "").trim();

  if (req.user.pendingPhone !== newPhone) {
    return res.status(400).json({ success: false, message: "Raqam mos kelmadi. Avval yangi raqamni so'rang." });
  }

  if (!req.user.codeExpiresAt || req.user.codeExpiresAt.getTime() < Date.now()) {
    return res.status(400).json({ success: false, message: "Kod muddati o'tgan. Yangi kod yuboring." });
  }

  if (String(req.user.verificationCode) !== code) {
    return res.status(400).json({ success: false, message: "Kod noto'g'ri!" });
  }

  req.user.phone = newPhone;
  req.user.verificationCode = undefined;
  req.user.codeExpiresAt = undefined;
  req.user.pendingPhone = undefined;
  await req.user.save();

  res.json({ success: true, user: serializeUser(req.user) });
};
