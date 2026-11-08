// Xavfsizlik: karta orqali to'lov FAQAT haqiqiy to'lov provayderi (Click / Payme)
// orqali amalga oshiriladi. Oldingi "sandbox"cha yozilgan chargeCard() funksiyasi
// soxta `paid` natija qaytarardi — bu ishonchli to'lov tizimi talabiga zid edi va
// butunlay olib tashlandi. Endi hech qanday soxta tranzaksiya yaratilmaydi.
//
// Karta qo'shishda faqat brend va oxirgi 4 ta raqam saqlanadi; to'liq karta
// raqami, CVV va boshqa maxfiy ma'lumotlar HECH QACHON saqlanmaydi.

// Sozlamalar ekrani shu ro'yxatdan foydalanadi — mavjud bo'lmagan
// to'lov usuli hech qachon ko'rsatilmaydi.
const SUPPORTED_METHODS = [
  { key: "click", label: "Click", kind: "redirect" },
  { key: "payme", label: "Payme", kind: "redirect" },
];

function isSupportedMethod(method) {
  return SUPPORTED_METHODS.some((m) => m.key === String(method || "").trim().toLowerCase());
}

module.exports = { SUPPORTED_METHODS, isSupportedMethod };
