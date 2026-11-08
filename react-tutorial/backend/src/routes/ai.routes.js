const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { authRequired } = require("../middleware/auth");
const { aiLimiter } = require("../middleware/rateLimit");
const ctrl = require("../controllers/ai.controller");

const aiUploadDir = path.join(__dirname, "..", "..", "uploads", "ai");
if (!fs.existsSync(aiUploadDir)) fs.mkdirSync(aiUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, aiUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

// Video (MP4/WebM/MOV/3GP) yoki rasm qabul qilamiz
const aiUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype.startsWith("video/") ||
      ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif"].includes(file.mimetype);
    if (ok) cb(null, true);
    else {
      const err = new Error("Faqat video (MP4/WebM/MOV) yoki rasm (JPG/PNG/WebP) yuklang");
      err.status = 400;
      cb(err);
    }
  },
});

// Bitta katta faylni qabul qilamiz: video yoki rasm
router.post("/analyze", authRequired, aiLimiter, aiUpload.single("media"), ctrl.analyze);

module.exports = router;