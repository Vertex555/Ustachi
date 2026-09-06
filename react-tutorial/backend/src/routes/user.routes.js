const router = require("express").Router();

const { authRequired } = require("../middleware/auth");
const { userLimiter, savedLimiter } = require("../middleware/rateLimit");
const ctrl = require("../controllers/user.controller");

router.put("/me", authRequired, userLimiter, ctrl.updateMe);
router.patch("/me/profile", authRequired, userLimiter, ctrl.updateProfile);
router.get("/me/saved-masters", authRequired, savedLimiter, ctrl.mySavedMasters);
router.post("/me/saved-masters/:id", authRequired, savedLimiter, ctrl.addSavedMaster);
router.delete("/me/saved-masters/:id", authRequired, savedLimiter, ctrl.removeSavedMaster);
router.post("/me/change-phone", authRequired, userLimiter, ctrl.changePhoneRequest);
router.post("/me/change-phone/verify", authRequired, userLimiter, ctrl.changePhoneVerify);

module.exports = router;
