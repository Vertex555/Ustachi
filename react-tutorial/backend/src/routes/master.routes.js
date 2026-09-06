const router = require("express").Router();

const { authRequired } = require("../middleware/auth");
const { masterLimiter } = require("../middleware/rateLimit");
const ctrl = require("../controllers/master.controller");

router.get("/", authRequired, masterLimiter, ctrl.list);
router.get("/me", authRequired, masterLimiter, ctrl.me);
router.get("/:id", authRequired, masterLimiter, ctrl.getOne);
router.post("/", authRequired, masterLimiter, ctrl.create);

module.exports = router;
