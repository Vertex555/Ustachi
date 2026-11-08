const router = require("express").Router();
const { authRequired } = require("../middleware/auth");
const ctrl = require("../controllers/card.controller");

router.get("/", authRequired, ctrl.list);
router.post("/", authRequired, ctrl.create);
router.delete("/:id", authRequired, ctrl.remove);
router.post("/:id/set-default", authRequired, ctrl.setDefault);

module.exports = router;