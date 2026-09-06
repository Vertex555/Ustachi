const mongoose = require("mongoose");
const masterSchema = require("../models/masterSchema");

// Foydalanuvchi id'sidan xavfsiz baza nomi hosil qilish.
// ObjectId faqat [0-9a-f] dan iborat, lekin himoya uchun tozalaymiz.
function sanitizeDbName(userId) {
  const s = String(userId || "").replace(/[^A-Za-z0-9_-]/g, "");
  return `ustachi_${s}`;
}

// Foydalanuvchining shaxsiy bazasiga ulanish (kash bilan saqlanadi).
function getUserDb(userId) {
  return mongoose.connection.useDb(sanitizeDbName(userId), {
    useCache: true,
  });
}

// Foydalanuvchi bazasidagi Master modeli (bir marta ro'yxatdan o'tkaziladi).
function getMasterModel(userId) {
  const conn = getUserDb(userId);
  return conn.models.Master || conn.model("Master", masterSchema);
}

module.exports = { getUserDb, getMasterModel, sanitizeDbName };