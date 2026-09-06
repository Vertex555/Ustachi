const multer = require("multer");

function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: "API yo'nalishi topilmadi",
  });
}

function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Rasm hajmi 5MB dan oshmasligi kerak"
        : "Fayl yuklashda xatolik: " + err.message;
    return res.status(400).json({ success: false, message });
  }

  const status = err.status || (err.name === "ValidationError" ? 400 : 500);

  // Validatsiya xatoliklari — xabarni ko'rsatamiz
  if (status === 400 && err.message) {
    return res.status(400).json({ success: false, message: err.message });
  }

  // 404 xatoliklar
  if (status === 404) {
    return res.status(404).json({ success: false, message: err.message || "Topilmadi" });
  }

  // 403/401
  if (status === 403) {
    return res.status(403).json({ success: false, message: "Ruxsat yo'q" });
  }
  if (status === 401) {
    return res.status(401).json({ success: false, message: "Avtorizatsiya talab qilinadi" });
  }

  // Server xatoliklari — prod-da batafsil xabar ko'rsatmaymiz
  if (status >= 500) {
    console.error("[ERROR]", err.message || err);
  }

  const message = status >= 500 && process.env.NODE_ENV === "production"
    ? "Serverda kutilmagan xatolik yuz berdi"
    : err.message || "Serverda kutilmagan xatolik yuz berdi";

  res.status(status).json({ success: false, message });
}

module.exports = { notFound, errorHandler };
