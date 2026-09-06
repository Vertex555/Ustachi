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

module.exports = mongoose.model("Chat", chatSchema);
