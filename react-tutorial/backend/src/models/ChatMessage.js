const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },
    image: { type: String, default: null }, // avtomatik yuborilgan rasm
    system: { type: Boolean, default: false }, // tizim xabari
  },
  { timestamps: true }
);

chatMessageSchema.index({ order: 1, createdAt: 1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);