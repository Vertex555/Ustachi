const mongoose = require("mongoose");

// Har bir (user, master) juftligi uchun bitta chat (thread).
// Ikkala tomon ham shu chat orqali yozishadi; order'lar chatga bog'liq emas.
const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },
    image: { type: String, default: null },
    system: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const chatSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    master: { type: mongoose.Schema.Types.ObjectId, ref: "Master", required: true },
    messages: [messageSchema],
    lastMessage: { type: String, default: "" },
    lastActivity: { type: Date, default: Date.now },
    // Qaysi tomon oxirgi xabarni ko'rgan (badge / o'qilmagan hisoblash uchun)
    userSeenAt: { type: Date, default: null },
    masterSeenAt: { type: Date, default: null },
    // order bilan bog'lash (ixtiyoriy) — buyurtma kontekstini ko'rsatish uchun
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
  },
  { timestamps: true }
);

chatSchema.index({ user: 1, master: 1 }, { unique: true });

// Arxitektura: xabarlarning ASOSIY manbasi — qurilmadagi lokal saqlash (AsyncStorage).
// Bu backend nusxasi faqat "zaxira": yangi qurilmada kirilsa tarix ko'rinishi uchun.
// Shuning uchun: har chatda oxirgi 100 xabar, 30 kundan eskirgan chat avtomatik o'chadi.
const MAX_MESSAGES_PER_CHAT = 100;
const CHAT_TTL_DAYS = 30;

// Eskirgan chatlarni MongoDB o'zi tozalashi uchun TTL indeks
chatSchema.index({ lastActivity: 1 }, { expireAfterSeconds: CHAT_TTL_DAYS * 24 * 60 * 60 });

module.exports = mongoose.model("Chat", chatSchema);
module.exports.MAX_MESSAGES_PER_CHAT = MAX_MESSAGES_PER_CHAT;
