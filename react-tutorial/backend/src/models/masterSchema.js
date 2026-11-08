const mongoose = require("mongoose");

const masterSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    // Guest usta uchun bo'sh qoldirilishi mumkin (rol tanlanganda avtomatik yaratiladi)
    experience: { type: String, default: "", trim: true },
    // false => hali ro'yxatdan o'tmagan (guest) usta: katalogda ko'rinmaydi,
    // lekin buyurtma qabul qilishi mumkin. Haqiqiy telefon qo'shilganda true bo'ladi.
    isPublished: { type: Boolean, default: true },
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
    currency: { type: String, enum: ["uzs", "rub", "usd", "eur"], default: "uzs" },
    workingHours: { type: String, default: "" },
    // ---- Usta sozlamalari (Master Settings) ----
    // Xizmat yo'nalishlari (masalan: "Konditsioner", "Kir yuvish mashinasi")
    specialties: { type: [String], default: [] },
    // Xizmat hududi (tuman/shahar nomlari)
    serviceArea: { type: [String], default: [] },
    // Xizmat radiusi (km)
    coverageRadiusKm: { type: Number, default: 15, min: 1, max: 200 },
    // Joriy holat: available | busy | off
    availability: {
      type: String,
      enum: ["available", "busy", "off"],
      default: "available",
    },
    // Verifikatsiya holati — faqat admin o'zgartiradi
    verification: {
      status: {
        type: String,
        enum: ["none", "pending", "approved", "rejected"],
        default: "none",
      },
      note: { type: String, default: "" },
      updatedAt: { type: Date, default: null },
    },
    photo: { type: String, default: null },
    banner: { type: String, default: null },
  },
  { timestamps: true }
);

masterSchema.index({ devices: 1 });
masterSchema.index({ user: 1 }, { unique: true });

module.exports = masterSchema;