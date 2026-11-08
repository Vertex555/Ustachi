/**
 * Eski karta maxfiy ma'lumotlarini tozalash (bir martalik migratsiya).
 *
 * Ilova avval karta raqamini shifrlab SAQLARDI (numberEnc / cvvEnc).
 * Endi karta raqami va CVV umuman saqlanmaydi — shuning uchun mavjud
 * yozuvlardagi shifrlangan qiymatlar ham darhol o'chirilishi kerak.
 *
 * Ishga tushirish:  node scripts/purge-card-secrets.js
 * (faqat numberEnc/cvvEnc maydonlarini o'chiradi — boshqa ma'lumotga tegilmaydi)
 */
require("dotenv").config();

const mongoose = require("mongoose");
const CardAccount = require("../src/models/CardAccount");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await CardAccount.updateMany(
    { $or: [{ numberEnc: { $ne: "" } }, { cvvEnc: { $ne: "" } }] },
    { $unset: { numberEnc: "", cvvEnc: "" } }
  );
  console.log(`Tozalangan kartalar: ${result.modifiedCount}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Xato:", err.message);
  process.exit(1);
});
