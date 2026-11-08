const router = require("express").Router();
const { authRequired } = require("../middleware/auth");
const ctrl = require("../controllers/payment.controller");

// Webhook'lar — auth talab qilmaydi (imzo/Basic-auth bilan himoyalanadi)
router.post("/click/webhook", ctrl.clickWebhook);
router.post("/payme/webhook", ctrl.paymeWebhook);

// To'lov havolalari
router.post("/orders/:orderId/click/link", authRequired, ctrl.clickLink);
router.post("/orders/:orderId/payme/link", authRequired, ctrl.paymeLink);

// Eski karta to'lovi — o'chirilgan (410 qaytaradi, soxta tranzaksiya yaratmaydi)
router.post("/orders/:orderId/pay", authRequired, ctrl.pay);

// Mavjud to'lov usullari (sozlamalar ekrani uchun)
router.get("/methods", authRequired, ctrl.methods);

router.get("/my", authRequired, ctrl.myPayments);

module.exports = router;