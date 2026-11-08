require("dotenv").config();

// Production'da CORS_ORIGIN majburiy — aks holda API hamma joyga ochiq qoladi.
if (process.env.NODE_ENV === "production" && !(process.env.CORS_ORIGIN || "").trim()) {
  throw new Error("NODE_ENV=production bo'lsa, .env dagi CORS_ORIGIN ni o'rnatish shart");
}

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { connectDB } = require("./src/config/db");
const { notFound, errorHandler } = require("./src/middleware/error");
const { sanitizeMiddleware } = require("./src/middleware/security");
const { startLinkListener } = require("./src/services/telegram");
const { initSocket } = require("./src/services/socket");

const app = express();

// Proxy / nginx ortida client IP ni to'g'ri aniqlash (rate-limit kalitlari uchun)
app.set("trust proxy", 1);

// Xavfsizlik sarlavhalari. Rasmlarni cross-origin ko'rsatishga ruxsat.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

// CORS: .env dagi CORS_ORIGIN ro'yxati yoki barchaga ruxsat (development)
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  })
);

// Body parser limits
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// NoSQL injection va prototype pollution himoyasi (body parse'dan keyin)
app.use(sanitizeMiddleware);

// Yuklangan rasmlar uchun statik papka
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  maxAge: "30d",
  etag: true,
}));

// Sog'liqni tekshirish endpointi (auth talab qilmaydi)
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    uptime: process.uptime(),
    memory: process.memoryUsage().rss,
    timestamp: Date.now(),
  });
});

// Global rate limit — hech qanday client 3000 so'rov / 15 daqiqa (user bo'yicha, IP emas).
// Bu faqat ekstremal DoS/Ustar xurujlarini to'xtatish uchun.
const { default: rateLimit } = require("express-rate-limit");
const { userOrIpKey } = require("./src/middleware/rateLimit");
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  skip: (req) => req.path === "/api/health",
  message: { success: false, message: "Juda ko'p so'rov. Biroz kuting." },
});
app.use("/api", globalLimiter);

// API yo'nalishlari
app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/users", require("./src/routes/user.routes"));
app.use("/api/masters", require("./src/routes/master.routes"));
app.use("/api/orders", require("./src/routes/order.routes"));
app.use("/api/chat", require("./src/routes/chat.routes"));
app.use("/api/ai", require("./src/routes/ai.routes"));
app.use("/api/cards", require("./src/routes/card.routes"));
app.use("/api/feedback", require("./src/routes/feedback.routes"));
app.use("/api/payments", require("./src/routes/payment.routes"));
app.use("/api/push", require("./src/routes/push.routes"));
app.use("/api/admin", require("./src/routes/admin.routes"));
app.use("/api/notifications", require("./src/routes/notification.routes"));
app.use("/api/catalog", require("./src/routes/catalog.routes"));

// Topilmagan yo'nalishlar va xatolarni boshqarish
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
let httpServer = null;
let shuttingDown = false;

async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[${signal}] Server to'xtatilmoqda...`);
  try {
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
    const mongoose = require("mongoose");
    await mongoose.connection.close(false);
    console.log("MongoDB ulanish yopildi");
  } catch (e) {
    console.error("Shutdown xatolik:", e.message);
  }
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  console.error("[UNCAUGHT]", err.message);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  console.error("[UNHANDLED_REJECTION]", reason);
});

connectDB()
  .then(() => {
    const { ensureSupportIdentity } = require("./src/controllers/admin.controller");
    ensureSupportIdentity().catch((err) => {
      console.error("Support identifikatsiyasini yaratishda xatolik:", err.message);
    });
    startLinkListener();
    httpServer = app.listen(PORT, () => {
      console.log(`Server ishga tushdi: http://localhost:${PORT}`);
    });
    initSocket(httpServer);
    console.log("Socket.io real-time xizmati yoqildi");
  })
  .catch((err) => {
    console.error("MongoDB ga ulanishda xatolik:", err.message);
    process.exit(1);
  });
