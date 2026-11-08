const router = require("express").Router();
const { authRequired } = require("../middleware/auth");
const ctrl = require("../controllers/notification.controller");

router.get("/", authRequired, ctrl.list);
router.get("/unread-count", authRequired, ctrl.unreadCount);
router.post("/read", authRequired, ctrl.markRead);
router.post("/read-all", authRequired, ctrl.markAllRead);
router.delete("/:id", authRequired, ctrl.remove);

module.exports = router;
