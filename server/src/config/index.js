const dotenv = require('dotenv');

dotenv.config();

const env = (key, fallback = '') => process.env[key] ?? fallback;

const config = {
  env: env('NODE_ENV', 'development'),
  isProd: env('NODE_ENV', 'development') === 'production',

  port: Number(env('PORT', 5000)),

  db: {
    uri: env('MONGO_URI', 'mongodb://127.0.0.1:27017/ustachi'),
  },

  cors: {
    origin: env('CLIENT_ORIGIN', 'http://localhost:5173'),
  },

  jwt: {
    accessSecret: env('JWT_ACCESS_SECRET', 'access_secret'),
    refreshSecret: env('JWT_REFRESH_SECRET', 'refresh_secret'),
    accessExpires: env('JWT_ACCESS_EXPIRES', '15m'),
    refreshExpires: env('JWT_REFRESH_EXPIRES', '7d'),
  },

  cookies: {
    secure: env('COOKIE_SECURE', 'false') === 'true',
    sameSite: env('COOKIE_SAME_SITE', 'lax'),
    accessMaxAge: 15 * 60 * 1000, // 15m
    refreshMaxAge: 7 * 24 * 60 * 60 * 1000, // 7d
  },

  upload: {
    dir: env('UPLOAD_DIR', 'uploads'),
    maxSize: Number(env('UPLOAD_MAX_SIZE', 10 * 1024 * 1024)),
  },

  telegram: {
    botToken: env('TELEGRAM_BOT_TOKEN', ''),
    chatId: env('TELEGRAM_CHAT_ID', ''),
  },

  otp: {
    length: 6,
    expiresMinutes: 10,
    maxAttempts: 5,
  },
};

module.exports = config;
