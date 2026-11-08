const mongoose = require("mongoose");

const {
  defaultPreferences,
  defaultNotifications,
  clampFontScale,
  normalizeTheme,
  normalizeLanguage,
  ADDRESS_MAX,
} = require("../utils/validation");

// Sozlamalar bo'limi (ko'rinish / til / shrift / harakat)
const preferencesSchema = new mongoose.Schema(
  {
    theme: { type: String, enum: ["system", "light", "dark"], default: "system" },
    language: { type: String, enum: ["uz", "ru", "en"], default: "uz" },
    fontScale: { type: Number, default: 1 },
    reduceMotion: { type: Boolean, default: false },
  },
  { _id: false }
);

// Bildirishnoma pref'lari — kategoriya bo'yicha
const notificationChannelsSchema = new mongoose.Schema(
  { push: { type: Boolean, default: true } },
  { _id: false }
);

const notificationsSchema = new mongoose.Schema(
  {
    orders: { type: Boolean, default: true },
    chat: { type: Boolean, default: true },
    masters: { type: Boolean, default: true },
    payments: { type: Boolean, default: true },
    promo: { type: Boolean, default: false },
    channels: { type: notificationChannelsSchema, default: () => ({ push: true }) },
  },
  { _id: false }
);

// Saqlangan manzillar (yetkazib berish / xizmat ko'rsatish nuqtasi)
const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: ADDRESS_MAX.label, default: "" },
    line: { type: String, trim: true, maxlength: ADDRESS_MAX.line, required: true },
    city: { type: String, trim: true, maxlength: ADDRESS_MAX.city, default: "" },
    note: { type: String, trim: true, maxlength: ADDRESS_MAX.note, default: "" },
    lat: { type: Number, default: null, min: -90, max: 90 },
    lng: { type: Number, default: null, min: -180, max: 180 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, trim: true, unique: true, sparse: true },
    name: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    photo: { type: String, default: null },
    banner: { type: String, default: null },
    savedMasters: [{ type: mongoose.Schema.Types.ObjectId, ref: "Master" }],
    role: {
      type: String,
      enum: ["user", "master", "guest", "admin"],
      default: null,
    },
    // Sozlamalar: boshqa qurilmada kirganda ham saqlanadi
    preferences: { type: preferencesSchema, default: () => defaultPreferences() },
    notifications: { type: notificationsSchema, default: () => defaultNotifications() },
    addresses: { type: [addressSchema], default: [] },
    // Sessiya inkori: "barcha qurilmalardan chiqish" bunda oshiriladi
    sessionVersion: { type: Number, default: 0 },
    // Qora ro'yxat (admin tomonidan bloklanganlar)
    banned: { type: Boolean, default: false },
    bannedReason: { type: String, default: "" },
    bannedAt: { type: Date, default: null },
    verificationCode: { type: String, select: false },
    codeExpiresAt: { type: Date, select: false },
    pendingPhone: { type: String, trim: true },
    // Hisobni o'chirish uchun qayta tasdiqlash kodi
    deleteCode: { type: String, select: false },
    deleteCodeExpiresAt: { type: Date, select: false },
    deleteRequestedAt: { type: Date, default: null },
    telegramChatId: { type: String },
    telegramLinkedAt: { type: Date },
    telegramLinkToken: { type: String, select: false },
    telegramLinkTokenExpiresAt: { type: Date, select: false },
    // Expo push token'lari (mobil ilova bildirishnomalari)
    pushTokens: { type: [String], default: [] },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

// default() funksiya bo'lgani uchun eski hujjatlar uchun "backfill" qilamiz:
// bo'sh/null qiymatlar default'ga qaytadi (eski kontent buzilmaydi).
userSchema.pre("validate", function normalizeSettings(next) {
  if (!this.preferences) {
    this.preferences = defaultPreferences();
  } else {
    this.preferences.theme = normalizeTheme(this.preferences.theme, "system");
    this.preferences.language = normalizeLanguage(this.preferences.language, "uz");
    this.preferences.fontScale = clampFontScale(this.preferences.fontScale == null ? 1 : this.preferences.fontScale);
    this.preferences.reduceMotion = this.preferences.reduceMotion === true;
  }
  if (!this.notifications) {
    this.notifications = defaultNotifications();
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
