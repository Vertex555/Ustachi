const jwt = require("jsonwebtoken");

const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "ustachi-dev-secret-change-me";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.warn(
    "XAVFSIZLIK: NODE_ENV=production bo'lsa, .env faylida JWT_SECRET o'rnatishingiz shart!"
  );
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

    req.user = user;
    req.userId = user._id.toString();
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { authRequired, JWT_SECRET };