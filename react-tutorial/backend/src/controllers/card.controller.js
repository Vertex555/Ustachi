const CardAccount = require("../models/CardAccount");
const { luhnCheck, detectCardBrand, detectCardNetwork } = require("../utils/helpers");

function serializeCard(card) {
  return {
    id: card._id.toString(),
    last4: card.last4,
    brand: card.brand,
    network: card.network,
    cardName: card.cardName,
    holderName: card.holderName,
    expMonth: card.expMonth,
    expYear: card.expYear,
    isDefault: card.isDefault,
    createdAt: card.createdAt,
  };
}

// Ro'yxat (faqat oxirgi 4 xona ko'rinadi)
exports.list = async (req, res) => {
  let cards = await CardAccount.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 }).lean();
  res.json({ success: true, data: cards.map(serializeCard) });
};

// Yangi karta qo'shish.
// XAVFSIZLIK: to'liq karta raqami va CVV HECH QACHON saqlanmaydi.
// Raqam serverga kelgach darhol tekshiriladi (Luhn) va undan faqat brend,
// tarmoq va oxirgi 4 ta raqam olinadi. `cvv` maydoni butunlay rad etiladi.
exports.create = async (req, res) => {
  const body = req.body || {};
  const { holderName, expMonth, expYear, cardName } = body;
  const number = String(body.cardNumber || body.number || "").replace(/\D/g, "");

  if (number.length < 15 || number.length > 19) {
    return res.status(400).json({ success: false, message: "Karta raqami noto'g'ri" });
  }
  if (!luhnCheck(number)) {
    return res.status(400).json({ success: false, message: "Karta raqami yaroqsiz (Luhn tekshiruvi o'tmadi)" });
  }
  const holder = String(holderName || "").trim();
  if (!holder) {
    return res.status(400).json({ success: false, message: "Karta egasining ismini kiriting" });
  }
  if (holder.length > 80) {
    return res.status(400).json({ success: false, message: "Karta egasining ismi juda uzun" });
  }
  const m = Math.round(Number(expMonth));
  const y = Math.round(Number(expYear));
  if (!m || m < 1 || m > 12 || !y || y < 2000 || y > 2100) {
    return res.status(400).json({ success: false, message: "Karta muddati noto'g'ri" });
  }
  const now = new Date();
  const cardExpiry = new Date(y, m, 1); // oyning 1-kuniga tenglash
  if (cardExpiry.getTime() < now.getTime()) {
    return res.status(400).json({ success: false, message: "Karta muddati o'tgan" });
  }

  const last4 = number.slice(-4);
  const existing = await CardAccount.findOne({ user: req.user._id, last4 });
  if (existing) {
    await CardAccount.deleteOne({ _id: existing._id });
  }

  const count = await CardAccount.countDocuments({ user: req.user._id });
  const card = await CardAccount.create({
    user: req.user._id,
    last4,
    brand: detectCardBrand(number),
    network: detectCardNetwork(number),
    cardName: String(cardName || "").trim().slice(0, 40),
    holderName: holder,
    expMonth: m,
    expYear: y,
    isDefault: count === 0,
  });

  res.status(201).json({ success: true, data: serializeCard(card) });
};

// O'chirish
exports.remove = async (req, res) => {
  const card = await CardAccount.findOne({ _id: req.params.id, user: req.user._id });
  if (!card) {
    return res.status(404).json({ success: false, message: "Karta topilmadi" });
  }
  await CardAccount.deleteOne({ _id: card._id });
  // Default o'chgan bo'lsa — qolgan kartalardan bitasini default qilamiz
  if (card.isDefault) {
    const next = await CardAccount.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }
  res.json({ success: true });
};

// Default qilib belgilash
exports.setDefault = async (req, res) => {
  const card = await CardAccount.findOne({ _id: req.params.id, user: req.user._id });
  if (!card) {
    return res.status(404).json({ success: false, message: "Karta topilmadi" });
  }
  await CardAccount.updateMany({ user: req.user._id }, { $set: { isDefault: false } });
  card.isDefault = true;
  await card.save();
  res.json({ success: true });
};

exports.serializeCard = serializeCard;