const router = require("express").Router();
const { authRequired } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");
const ctrl = require("../controllers/admin.controller");

router.get("/overview", authRequired, requireAdmin, ctrl.overview);
router.get("/series", authRequired, requireAdmin, ctrl.series);
router.get("/users", authRequired, requireAdmin, ctrl.users);
router.get("/masters", authRequired, requireAdmin, ctrl.masters);
router.post("/users/:id/ban", authRequired, requireAdmin, ctrl.setUserBan);
router.post("/masters/:id/ban", authRequired, requireAdmin, ctrl.setMasterBan);
router.post("/masters/:id/verification", authRequired, requireAdmin, ctrl.setMasterVerification);
router.post("/support/send", authRequired, requireAdmin, ctrl.supportSend);
router.get("/support/inbox", authRequired, requireAdmin, ctrl.supportInbox);
router.get("/support/:id/messages", authRequired, requireAdmin, ctrl.supportMessages);
router.post("/support/:id/send", authRequired, requireAdmin, ctrl.supportSendMessage);

module.exports = router;