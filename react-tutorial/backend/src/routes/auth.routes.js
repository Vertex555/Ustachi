const router = require("express").Router();

const { authRequired } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");
const ctrl = require("../controllers/auth.controller");

router.post("/send-code", authLimiter, ctrl.sendCode);
router.get("/telegram-status", authLimiter, ctrl.telegramStatus);
router.post("/verify", authLimiter, ctrl.verify);
router.post("/guest", authLimiter, ctrl.guest);
router.get("/me", authRequired, ctrl.me);

module.exports = router;