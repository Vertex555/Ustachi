const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Master = require("../models/Master");
const Session = require("../models/Session");
const { ensureAdminRole } = require("./admin");

const JWT_SECRET = process.env.JWT_SECRET || "ustachi-dev-secret-change-me";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("NODE_ENV=production bo'lsa, .env faylida JWT_SECRET o'rnatish shart!");
}

async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Avtorizatsiya talab qilinadi" });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res
        .status(401)
        .json({ success: false, message: "Yaroqsiz yoki muddati o'tgan token" });
    }

    const user = await User.findById(payload.id);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Foydalanuvchi topilmadi" });
    }

    // "Barcha qurilmalardan chiqish" -> sessionVersion oshadi
    if (payload.sv !== undefined && payload.sv !== (user.sessionVersion || 0)) {
      return res.status(401).json({
        success: false,
        message: "Sessiya bekor qilingan. Qayta kiring.",
        code: "session_revoked",
      });
    }

    // Faol sessiya tekshiruvi (faqat jti'si bor yangi tokenlar uchun)
    // Eski tokenlar (jti'siz) statistik ravishda ishlashda davom etadi.
    if (payload.jti) {
      const session = await Session.findOne({
        jti: payload.jti,
        user: user._id,
        revokedAt: null,
      }).lean();
      if (!session) {
        return res.status(401).json({
          success: false,
          message: "Sessiya tugagan. Qayta kiring.",
          code: "session_revoked",
        });
      }
      req.sessionJti = payload.jti;
      // lastUsedAt'ni har so'rovda yozmaymiz — har 5 daqiqada bitta marta
      const stale = Date.now() - new Date(session.lastUsedAt || 0).getTime();
      if (stale > 5 * 60 * 1000) {
        Session.updateOne({ _id: session._id }, { $set: { lastUsedAt: new Date() } })
          .catch(() => {});
      }
    }

    // Qora ro'yxatga tushgan foydalanuvchini bloklaymiz
    if (user.banned) {
      return res.status(403).json({
        success: false,
        message: user.bannedReason || "Hisobingiz bloklangan",
        banned: true,
      });
    }

    // .env da ruxsat berilgan raqamlar avtomatik admin bo'ladi
    try {
      await ensureAdminRole(user);
    } catch {}

    // "usta" roli bor, lekin Master hujjati yo'q bo'lsa — avtomatik yaratamiz.
    // (guest foydalanuvchi role='master' tanlagan holat; eski hisoblar ham qamrab olinadi)
    // Hech qanday so'rovga xato qaytarilmaydi: ishlamasdan qoldirmaslik afzal.
    if (user.role === "master" && !(await Master.exists({ user: user._id }))) {
      try {
        await Master.create({
          user: user._id,
          name: (user.name && user.name.trim()) || "Mehmon usta",
          phone: user.phone,
          experience: "",
          devices: [],
          isPublished: false,
        });
      } catch {}
    }

    req.user = user;
    req.userId = user._id.toString();
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { authRequired, JWT_SECRET };