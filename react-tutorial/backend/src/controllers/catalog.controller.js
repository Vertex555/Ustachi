/**
 * Xizmat katalogi — §6.2
 *
 * Kategoriyalar DB dan o'qiladi. Agar DB hali seeded bo'lmasa,
 * birinchi chaqiruvda seed qilinadi (lazy seed).
 */

const Category = require("../models/Category");
const { formatMajor } = require("../utils/money");

let seedPromise = null;

/** Katalog bo'sh bo'lsa bir marta yuklaydi (parallel so'rovlar uchun bitta promise) */
async function ensureSeeded() {
  const count = await Category.estimatedDocumentCount();
  if (count > 0) return;
  if (!seedPromise) {
    seedPromise = Category.seed().finally(() => {
      seedPromise = null;
    });
  }
  await seedPromise;
}

function serialize(c) {
  return {
    key: c.key,
    title: c.title,
    titleKey: c.titleKey || "",
    icon: c.icon,
    color: c.color,
    description: c.description || "",
    order: c.order,
    services: (c.services || [])
      .filter((s) => s.active !== false)
      .map((s) => ({
        key: s.key,
        title: s.title,
        titleKey: s.titleKey || "",
        requiresBrand: !!s.requiresBrand,
        requiresModel: !!s.requiresModel,
        hintKey: s.hintKey || "",
      })),
    // §6.4 "Do not fabricate prices" — null bo'lsa UI narx ko'rsatmaydi
    indicativePrice:
      c.indicativePriceMinor && (c.indicativePriceMinor.min != null || c.indicativePriceMinor.max != null)
        ? {
            min: c.indicativePriceMinor.min != null ? formatMajor(c.indicativePriceMinor.min) : null,
            max: c.indicativePriceMinor.max != null ? formatMajor(c.indicativePriceMinor.max) : null,
            note: c.indicativePriceMinor.note || "",
          }
        : null,
  };
}

exports.listCategories = async (req, res) => {
  try {
    await ensureSeeded();
    const cats = await Category.listPublic();
    res.json({ success: true, data: cats.map(serialize) });
  } catch (e) {
    res.status(500).json({ success: false, message: "Katalogni yuklab bo'lmadi" });
  }
};

exports.getCategory = async (req, res) => {
  try {
    await ensureSeeded();
    const c = await Category.findOne({ key: String(req.params.key).toLowerCase(), active: true }).lean();
    if (!c) return res.status(404).json({ success: false, message: "Kategoriya topilmadi" });
    res.json({ success: true, data: serialize(c) });
  } catch (e) {
    res.status(500).json({ success: false, message: "Kategoriyani yuklab bo'lmadi" });
  }
};

exports.ensureSeeded = ensureSeeded;
