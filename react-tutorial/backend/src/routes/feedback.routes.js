const router = require("express").Router();
const { authRequired } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");
const { upload } = require("../middleware/upload");
const ctrl = require("../controllers/feedback.controller");

// Yordam so'rovi / fikr — 5 tagacha rasm ilovasi bilan
router.post("/", authRequired, upload.array("attachments", 5), ctrl.create);
router.get("/my", authRequired, ctrl.my);

router.get("/admin/all", authRequired, requireAdmin, ctrl.allForAdmin);
router.patch("/admin/:id", authRequired, requireAdmin, ctrl.updateForAdmin);

module.exports = router;
