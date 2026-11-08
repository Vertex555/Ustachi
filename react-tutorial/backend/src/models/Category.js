/**
 * Xizmat katalogi — §6.2
 *
 * "Store categories in the database or an appropriate configurable source
 * rather than hardcoding the entire catalog into the UI."
 *
 * `seed()` — boshlang'ich katalog. Ishlab chiqishda bir marta chaqiriladi.
 * Ishlab chiqarishda admin paneldan boshqariladi.
 */

const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // i18n kaliti (mobile translations da) yoki to'g'ridan-to'g'ri matn
    titleKey: { type: String, default: "" },
    title: { type: String, required: true, trim: true, maxlength: 120 },

    icon: { type: String, default: "wrench" },
    color: { type: String, default: "#2e7d32" },

    description: { type: String, default: "", maxlength: 1000 },

    order: { type: Number, default: 0, index: true },
    active: { type: Boolean, default: true, index: true },

    // Qurilma / ta'mirlash turlari
    services: [
      {
        key: { type: String, required: true, trim: true },
        titleKey: { type: String, default: "" },
        title: { type: String, required: true, trim: true, maxlength: 120 },
        // "brand_required" — bu xizmat uchun brend/model majburiy
        requiresBrand: { type: Boolean, default: false },
        requiresModel: { type: Boolean, default: false },
        // Ko'rsatma (i18n kaliti)
        hintKey: { type: String, default: "" },
        order: { type: Number, default: 0 },
        active: { type: Boolean, default: true },
      },
    ],

    // Taxminiy narx oralig'i (majburiy emas — FAQAT ma'lum bo'lsa)
    // §6.4 "Do not fabricate ... prices"
    indicativePriceMinor: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      note: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

categorySchema.index({ active: 1, order: 1 });

/** Boshlang'ich katalog — DB ga seed qilinadi */
const SEED = [
  {
    key: "smartphone_tablet",
    title: "Smartfon va planshet",
    icon: "phone",
    order: 10,
    services: [
      { key: "screen_repair", title: "Ekran ta'miri", requiresBrand: true, requiresModel: true, order: 1 },
      { key: "battery_repair", title: "Batareya almashtirish", requiresBrand: true, requiresModel: true, order: 2 },
      { key: "charging_port", title: "Zaryad porti ta'miri", requiresBrand: true, order: 3 },
      { key: "software", title: "Dasturiy ta'mirlash", order: 4 },
      { key: "water_damage", title: "Suvdan shikastlanish", requiresBrand: true, requiresModel: true, order: 5 },
      { key: "camera_repair", title: "Kamera ta'miri", requiresBrand: true, requiresModel: true, order: 6 },
      { key: "other", title: "Boshqa", order: 99 },
    ],
  },
  {
    key: "laptop_computer",
    title: "Noutbuk va kompyuter",
    icon: "laptop",
    order: 20,
    services: [
      { key: "screen_repair", title: "Ekran ta'miri", requiresBrand: true, requiresModel: true, order: 1 },
      { key: "motherboard", title: "Plata ta'miri", requiresBrand: true, requiresModel: true, order: 2 },
      { key: "keyboard", title: "Klaviatura ta'miri", requiresBrand: true, order: 3 },
      { key: "cooling", title: "Sovutish tizimi (s zalping)", requiresBrand: true, order: 4 },
      { key: "software", title: "Dasturiy ta'mirlash", order: 5 },
      { key: "upgrade", title: "Apgreyd (RAM/SSD)", requiresBrand: true, requiresModel: true, order: 6 },
      { key: "other", title: "Boshqa", order: 99 },
    ],
  },
  {
    key: "tv_monitor",
    title: "Televizor va monitor",
    icon: "tv",
    order: 30,
    services: [
      { key: "panel_repair", title: "Matritsa ta'miri", requiresBrand: true, requiresModel: true, order: 1 },
      { key: "backlight", title: "Podsvetka ta'miri", requiresBrand: true, requiresModel: true, order: 2 },
      { key: "ports", title: "Portlar va razyemalar", requiresBrand: true, order: 3 },
      { key: "power_supply", title: "Ta'minot bloki", requiresBrand: true, requiresModel: true, order: 4 },
      { key: "other", title: "Boshqa", order: 99 },
    ],
  },
  {
    key: "refrigerator_washing",
    title: "Muzlatgich va kirish mashinasi",
    icon: "washing",
    order: 40,
    services: [
      { key: "compressor", title: "Kompressor ta'miri", requiresBrand: true, order: 1 },
      { key: "leak", title: "Oqish va muzlatish", requiresBrand: true, requiresModel: true, order: 2 },
      { key: "pump", title: "Nasos va uzatgich", requiresBrand: true, requiresModel: true, order: 3 },
      { key: "door_seal", title: "Eshik va rezinka", requiresBrand: true, order: 4 },
      { key: "other", title: "Boshqa", order: 99 },
    ],
  },
  {
    key: "air_conditioner",
    title: "Konditsioner",
    icon: "snowflake",
    order: 50,
    services: [
      { key: "service", title: "Mavsumiy xizmat ko'rsatish", requiresBrand: true, order: 1 },
      { key: "refrigerant", title: "Freon to'ldirish", requiresBrand: true, requiresModel: true, order: 2 },
      { key: "leak", title: "Oqishni bartaraf etish", requiresBrand: true, order: 3 },
      { key: "install", title: "O'rnatish va demontaj", requiresBrand: true, order: 4 },
      { key: "other", title: "Boshqa", order: 99 },
    ],
  },
  {
    key: "electrical",
    title: "Elektr va elektronika",
    icon: "bolt",
    order: 60,
    services: [
      { key: "wiring", title: "Simlarni o'tkazish", order: 1 },
      { key: "socket", title: "Rozetka va kalit", order: 2 },
      { key: "board_repair", title: "Taxtalar ta'miri", order: 3 },
      { key: "lighting", title: "Yoritish tizimi", order: 4 },
      { key: "other", title: "Boshqa", order: 99 },
    ],
  },
  {
    key: "plumbing",
    title: "Suv va kanalizatsiya",
    icon: "drop",
    order: 70,
    services: [
      { key: "leak", title: "Oqishni bartaraf etish", order: 1 },
      { key: "mixer", title: "Aralashtirgich", order: 2 },
      { key: "pipe_replacement", title: "Quvur almashtirish", order: 3 },
      { key: "boiler", title: "Kotlovka", order: 4 },
      { key: "other", title: "Boshqa", order: 99 },
    ],
  },
  {
    key: "furniture",
    title: "Mebel va uy ro'g'ozlari",
    icon: "sofa",
    order: 80,
    services: [
      { key: "assembly", title: "Yig'ish va montaj", order: 1 },
      { key: "repair", title: "Ta'mirlash", order: 2 },
      { key: "upholstery", title: "Qoplama tikish", order: 3 },
      { key: "other", title: "Boshqa", order: 99 },
    ],
  },
  {
    key: "appliances_other",
    title: "Boshqa texnika",
    icon: "wrench",
    order: 90,
    services: [
      { key: "diagnostics", title: "Diagnostika", order: 1 },
      { key: "repair", title: "Ta'mirlash", order: 2 },
      { key: "maintenance", title: "Texnik xizmat", order: 3 },
      { key: "other", title: "Boshqa", order: 99 },
    ],
  },
  {
    key: "other",
    title: "Boshqa",
    icon: "help",
    order: 999,
    services: [{ key: "other", title: "Boshqa", order: 99 }],
  },
];

/** Katalogni DB ga yuklaydi (mavjudlariga tegmaydi) */
categorySchema.statics.seed = async function seed() {
  let created = 0;
  for (const c of SEED) {
    const exists = await this.findOne({ key: c.key }).select("_id");
    if (exists) continue;
    await this.create(c);
    created++;
  }
  return created;
};

categorySchema.statics.listPublic = async function listPublic() {
  return this.find({ active: true }).sort({ order: 1 }).lean();
};

module.exports = mongoose.model("Category", categorySchema);
module.exports.SEED = SEED;
