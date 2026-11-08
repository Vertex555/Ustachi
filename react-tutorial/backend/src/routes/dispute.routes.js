const router = require("express").Router();
const { authRequired } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const ctrl = require("../controllers/dispute.controller");

// §15 — Nizolar
router.get("/", authRequired, ctrl.listMine);
router.get("/:id", authRequired, ctrl.getOne);
router.post("/orders/:orderId", authRequired, upload.array("evidence", 5), ctrl.create);
router.post("/:id/evidence", authRequired, upload.array("evidence", 5), ctrl.addEvidence);
router.post("/:id/explain", authRequired, ctrl.explain);
router.post("/:id/withdraw", authRequired, ctrl.withdraw);

module.exports = router;
