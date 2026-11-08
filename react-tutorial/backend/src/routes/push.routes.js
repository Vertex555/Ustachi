const router = require("express").Router();

const { authRequired } = require("../middleware/auth");
const { userLimiter } = require("../middleware/rateLimit");
const User = require("../models/User");

function validToken(req, res, next) {
  const token = String(req.body?.token || "").trim();
  if (!token || token.length > 400 || !/^ExponentPushToken\[/.test(token)) {
    return res.status(400).json({ success: false, message: "Noto'g'ri push token" });
  }
  req.pushToken = token;
  next();
}

// Expo push token'ini foydalanuvchiga bog'lash (devices/platform avtomatik)
router.post("/register", authRequired, userLimiter, validToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });
    const tokens = (user.pushTokens || []).filter((t) => t !== req.pushToken);
    tokens.unshift(req.pushToken); // eng yangi token birinchi
    user.pushTokens = tokens.slice(0, 10); // har bir foydalanuvchiga 10 tagacha token
    await user.save();
    res.json({ success: true, count: user.pushTokens.length });
  } catch (err) {
    next(err);
  }
});

// Token o'chirish (foydalanuvchi chiqib ketganda / token eskirganda)
router.post("/unregister", authRequired, userLimiter, validToken, async (req, res, next) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { pushTokens: req.pushToken } }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;