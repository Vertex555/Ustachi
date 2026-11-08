const router = require("express").Router();

const { authRequired } = require("../middleware/auth");
const { masterLimiter } = require("../middleware/rateLimit");
const ctrl = require("../controllers/master.controller");

router.get("/", authRequired, masterLimiter, ctrl.list);
router.get("/me", authRequired, masterLimiter, ctrl.me);
router.patch("/me", authRequired, masterLimiter, ctrl.updateMe);
router.get("/me/earnings", authRequired, masterLimiter, ctrl.earnings);
router.get("/:id/reviews", authRequired, masterLimiter, ctrl.reviews);
router.get("/:id", authRequired, masterLimiter, ctrl.getOne);
router.post("/", authRequired, masterLimiter, ctrl.create);

module.exports = router;
