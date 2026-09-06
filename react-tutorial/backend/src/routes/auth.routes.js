const router = require("express").Router();

const { authRequired } = require("../middleware/auth");
const { sendCodeLimiter, telegramStatusLimiter, guestLimiter } = require("../middleware/rateLimit");
const ctrl = require("../controllers/auth.controller");

router.post("/send-code", sendCodeLimiter, ctrl.sendCode);
router.get("/telegram-status", telegramStatusLimiter, ctrl.telegramStatus);
router.post("/verify", sendCodeLimiter, ctrl.verify);
router.post("/guest", guestLimiter, ctrl.guest);
router.get("/me", authRequired, ctrl.me);

module.exports = router;