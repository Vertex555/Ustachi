const router = require("express").Router();
const { authRequired } = require("../middleware/auth");
const ctrl = require("../controllers/catalog.controller");

// §6.2 katalog — mijoz va usta (ham) foydalana oladi.
// Kategoriyalar DB da saqlanadi, UI da hardcode emas.
router.get("/categories", ctrl.listCategories);
router.get("/categories/:key", ctrl.getCategory);

module.exports = router;
