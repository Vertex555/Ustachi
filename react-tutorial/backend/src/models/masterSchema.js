const mongoose = require("mongoose");

const masterSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    experience: { type: String, required: true, trim: true },
    devices: { type: [String], default: [] },
    location: {
      lat: { type: Number, default: 41.311081 },
      lng: { type: Number, default: 69.240562 },
      address: { type: String, default: "Toshkent shahar" },
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0, min: 0 },
    // O'rtacha ish haqqi (bazaviy narx — haqiqiy narx model/holatga qarab chatda kelishiladi)
    price: { type: Number, default: 0, min: 0 },
    workingHours: { type: String, default: "" },
    // Bank ma'lumotlari (to'lov uchun shaffoflik)
    bankCard: { type: String, default: "", trim: true },
    cardholderName: { type: String, default: "", trim: true },
    photo: { type: String, default: null },
  },
  { timestamps: true }
);

masterSchema.index({ devices: 1 });
masterSchema.index({ user: 1 }, { unique: true });

module.exports = masterSchema;