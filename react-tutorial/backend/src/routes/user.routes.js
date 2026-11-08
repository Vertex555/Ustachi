const router = require("express").Router();

const { authRequired } = require("../middleware/auth");
const { userLimiter, savedLimiter } = require("../middleware/rateLimit");
const ctrl = require("../controllers/user.controller");
const settings = require("../controllers/settings.controller");

router.put("/me", authRequired, userLimiter, ctrl.updateMe);
router.patch("/me/profile", authRequired, userLimiter, ctrl.updateProfile);
router.get("/me/saved-masters", authRequired, savedLimiter, ctrl.mySavedMasters);
router.post("/me/saved-masters/:id", authRequired, savedLimiter, ctrl.addSavedMaster);
router.delete("/me/saved-masters/:id", authRequired, savedLimiter, ctrl.removeSavedMaster);
router.post("/me/change-phone", authRequired, userLimiter, ctrl.changePhoneRequest);
router.post("/me/change-phone/verify", authRequired, userLimiter, ctrl.changePhoneVerify);

// ---- Sozlamalar: ko'rinish, til, bildirishnoma ----
router.get("/me/preferences", authRequired, userLimiter, settings.getPreferences);
router.patch("/me/preferences", authRequired, userLimiter, settings.updatePreferences);
router.patch("/me/notifications", authRequired, userLimiter, settings.updateNotifications);

// ---- Saqlangan manzillar ----
router.get("/me/addresses", authRequired, userLimiter, settings.listAddresses);
router.post("/me/addresses", authRequired, userLimiter, settings.createAddress);
router.patch("/me/addresses/:id", authRequired, userLimiter, settings.updateAddress);
router.delete("/me/addresses/:id", authRequired, userLimiter, settings.deleteAddress);
router.post("/me/addresses/:id/default", authRequired, userLimiter, settings.setDefaultAddress);

// ---- Faol sessiyalar (parolsiz auth -> token/sessiya boshqaruvi) ----
router.get("/me/sessions", authRequired, userLimiter, settings.listSessions);
router.delete("/me/sessions/:id", authRequired, userLimiter, settings.revokeSession);
router.post("/me/logout-all", authRequired, userLimiter, settings.logoutAll);

// ---- Hisobni o'chirish (avval kod bilan tasdiqlanadi) ----
router.get("/me/deletion-preview", authRequired, userLimiter, settings.deletionPreview);
router.post("/me/deletion/request", authRequired, userLimiter, settings.requestAccountDeletion);
router.post("/me/deletion/confirm", authRequired, userLimiter, settings.confirmAccountDeletion);

module.exports = router;
