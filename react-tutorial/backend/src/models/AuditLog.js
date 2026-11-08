/**
 * Audit log — §16.7 "Log sensitive administrative actions with actor,
 * action, timestamp, and relevant record reference."
 *
 * MOLIYAVIY: "Never allow administrators to change transaction records
 * silently." — har bir moliyaviy o'zgarish shu yerda qoladi.
 */

const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    // Kim
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    actorRole: { type: String, default: "" },
    actorPhone: { type: String, default: "" }, // hisob yoki audit uchun

    // Nima
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String, default: "", index: true },

    // O'zgarishlar
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },

    // Nima uchun
    reason: { type: String, default: "", maxlength: 500 },

    // Qo'shimcha
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });

/**
 * Audit yozuvini yaratish (xato tushsa asosiy operatsiyani buzmaydi).
 * Maxfiy maydonlar (token, kalit, CVV) loglanMAYDI.
 */
const REDACT = /password|token|secret|key|cvv|pan|cardNumber|authorization/i;

function redact(obj, depth = 0) {
  if (!obj || depth > 3) return obj;
  if (Array.isArray(obj)) return obj.slice(0, 20).map((v) => redact(v, depth + 1));
  if (typeof obj !== "object" || obj instanceof Date) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (REDACT.test(k)) {
      out[k] = "[redacted]";
    } else if (typeof v === "object" && v !== null) {
      out[k] = redact(v, depth + 1);
    } else {
      out[k] = v;
    }
  }
  return out;
}

auditLogSchema.statics.write = async function write(entry) {
  try {
    return await this.create({
      ...entry,
      before: redact(entry.before),
      after: redact(entry.after),
    });
  } catch (e) {
    // Audit yozilmasa ham asosiy operatsiya to'xtamasin,
    // lekin bu xato konsolda ko'rinadi.
    // eslint-disable-next-line no-console
    console.error("[audit] yozib bo'lmadi:", entry?.action, e.message);
    return null;
  }
};

module.exports = mongoose.model("AuditLog", auditLogSchema);
module.exports.redact = redact;
