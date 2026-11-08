const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../middleware/auth");
const User = require("../models/User");

let io = null;

// user id -> socket.id xaritalash (bitta foydalanuvchi bir nechta joyda ochiq)
const userSockets = new Map();

// IP -> connection count (DoS himoyasi)
const ipConnections = new Map();
const MAX_CONNECTIONS_PER_IP = Number(process.env.MAX_CONNECTIONS_PER_IP) || 10;

// Proxy / nginx ortida ham haqiqiy client IP'ni topish.
// Socket.io express'dagi "trust proxy" sozlamasini ishlatmaydi, shuning uchun
// x-forwarded-for sarlavhasini o'zimiz parse qilamiz.
function clientIp(socket) {
  const fwd = socket.handshake.headers["x-forwarded-for"];
  if (typeof fwd === "string") {
    const first = fwd.split(",")[0].trim();
    if (first) return first;
  }
  return socket.handshake.address;
}

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
        : true,
      credentials: true,
    },
    maxHttpBufferSize: 1e6, // 1MB — xabar hajmi cheklovi
    pingTimeout: 20000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
  });

  io.use((socket, next) => {
    const ip = clientIp(socket);
    const count = (ipConnections.get(ip) || 0) + 1;
    if (count > MAX_CONNECTIONS_PER_IP) {
      return next(new Error("too_many_connections"));
    }
    ipConnections.set(ip, count);

    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("unauthorized"));
      const payload = jwt.verify(token, JWT_SECRET);
      socket.userId = payload.id;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const uid = socket.userId;
    const ip = clientIp(socket);

    if (!userSockets.has(uid)) userSockets.set(uid, new Set());
    userSockets.get(uid).add(socket.id);

    socket.on("disconnect", () => {
      const set = userSockets.get(uid);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) userSockets.delete(uid);
      }
      const ipCount = ipConnections.get(ip);
      if (ipCount > 1) ipConnections.set(ip, ipCount - 1);
      else ipConnections.delete(ip);
    });
  });

  return io;
}

// Belgilangan foydalanuvchiga voqea yuborish
function emitToUser(userId, event, payload) {
  if (!io) return;
  const set = userSockets.get(String(userId));
  if (set) {
    set.forEach((sid) => io.to(sid).emit(event, payload));
  }
}

module.exports = { initSocket, emitToUser };
