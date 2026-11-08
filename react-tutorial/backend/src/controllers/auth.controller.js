const User = require("../models/User");
const { createSessionToken, requestMeta, serializeUserWithMaster } = require("../utils/helpers");
const {
  newLinkToken,
  buildDeepLink,
  sendVerificationCode,
} = require("../services/telegram");

function validPhone(value) {
  return /^\+998\d{9}$/.test(value || "");
}

function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// 1) Telefon raqamga tasdiqlash kodini "yuborish"
//    Birinchi marta foydalanuvchi Telegram botga Start berishi kerak.
//    Shundan keyin kod aynan o'sha foydalanuvchining Telegram'iga yuboriladi.
exports.sendCode = async (req, res) => {
  const phone = String(req.body?.phone || "").trim();

  if (!validPhone(phone)) {
    return res.status(400).json({
      success: false,
      message: "Telefon raqam formati noto'g'ri (misol: +998901234567)",
    });
  }

  let user = await User.findOne({ phone });
  if (!user) {
    user = await User.create({ phone, role: null });
  }

  // Foydalanuvchi hali Telegram bilan bog'lanmagan -> birinchi Start so'raladi
  if (!user.telegramChatId) {
    const linkToken = newLinkToken();
    user.telegramLinkToken = linkToken;
    user.telegramLinkTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const deepLink = await buildDeepLink(linkToken);
    return res.json({
      success: true,
      needTelegram: true,
      linkToken,
      botUsername: (process.env.TELEGRAM_BOT_USERNAME || "ustachi_verify_bot"),
      deepLink,
      message: "Kodni olish uchun avval Telegram botga Start bering.",
    });
  }

  const code = generateCode();
  user.verificationCode = code;
  user.codeExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 daqiqa
  await user.save();

  const payload = { success: true, message: "Kod yuborildi" };

  // Kod foydalanuvchining o'z Telegram'iga yuboriladi
  try {
    await sendVerificationCode(phone, code, user.telegramChatId);
  } catch (err) {
    // Telegramga yuborib bo'lmadi — dev rejimida kod javobda qaytadi
    if (process.env.NODE_ENV !== "production") {
      payload.devCode = code;
    }
  }

  res.json(payload);
};

// Telegram bog'lanish holatini so'rash (frontend polling qiladi)
exports.telegramStatus = async (req, res) => {
  const phone = String(req.query?.phone || "").trim();
  if (!validPhone(phone)) {
    return res.status(400).json({
      success: false,
      message: "Telefon raqam formati noto'g'ri",
    });
  }

  const user = await User.findOne({ phone });
  res.json({
    success: true,
    linked: !!(user && user.telegramChatId),
  });
};

// 2) Kodni tasdiqlash
exports.verify = async (req, res) => {
  const phone = String(req.body?.phone || "").trim();
  const code = String(req.body?.code || "").trim();

  if (!validPhone(phone)) {
    return res.status(400).json({
      success: false,
      message: "Telefon raqam formati noto'g'ri",
    });
  }

  const user = await User.findOne({ phone }).select(
    "+verificationCode +codeExpiresAt"
  );

  if (!user || !user.codeExpiresAt || user.codeExpiresAt.getTime() < Date.now()) {
    return res.status(400).json({
      success: false,
      message: "Kod muddati o'tgan. Yangi kod yuboring.",
    });
  }

  if (user.banned) {
    return res.status(403).json({
      success: false,
      message: user.bannedReason || "Hisobingiz bloklangan",
      banned: true,
    });
  }

  if (String(user.verificationCode) !== code) {
    return res.status(400).json({
      success: false,
      message: "Kod noto'g'ri!",
    });
  }

  user.verificationCode = undefined;
  user.codeExpiresAt = undefined;
  await user.save();

  const token = await createSessionToken(user, requestMeta(req));
  res.json({ success: true, token, user: await serializeUserWithMaster(user) });
};

// 3) Mehmon sifatida kirish
exports.guest = async (req, res) => {
  const phone = `guest-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  const user = await User.create({ phone, role: "guest" });
  const token = await createSessionToken(user, requestMeta(req));

  res.status(201).json({ success: true, token, user: await serializeUserWithMaster(user) });
};

// 4) Joriy foydalanuvchi
exports.me = async (req, res) => {
  res.json({ success: true, user: await serializeUserWithMaster(req.user) });
};