const router = require("express").Router();

const { authRequired } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const { orderLimiter } = require("../middleware/rateLimit");
const ctrl = require("../controllers/order.controller");

router.get("/", authRequired, ctrl.list);
router.post("/", authRequired, orderLimiter, upload.array("photos", 5), ctrl.create);
router.post("/seen", authRequired, ctrl.markSeen);
router.get("/:id", authRequired, ctrl.getOne);
router.patch("/:id/status", authRequired, ctrl.updateStatus);
router.post("/:id/rate", authRequired, ctrl.rate);
router.post("/:id/location", authRequired, ctrl.updateLocation);
router.post("/:id/cancel", authRequired, ctrl.cancel);

module.exports = router;