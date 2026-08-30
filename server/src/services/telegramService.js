const config = require('../config');
const { generateOtp, hashOtp } = require('../utils/otp');
const logger = require('../utils/logger');

/**
 * Send a 6-digit verification code via Telegram bot.
 * Credentials live ONLY in server config/env — never in frontend code.
 */
async function sendVerificationCode(phone, code) {
  const { botToken, chatId } = config.telegram;

  if (!botToken || !chatId) {
    logger.warn('Telegram not configured; OTP code (dev only):', code);
    return { delivered: false, code };
  }

  const text = `🔐 Ustachi verification code: ${code}\nIt expires in ${config.otp.expiresMinutes} minutes.`;

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      logger.error('Telegram send failed', res.status, await res.text());
      return { delivered: false, code };
    }
    return { delivered: true };
  } catch (err) {
    logger.error('Telegram request error:', err.message);
    return { delivered: false, code };
  }
}

function generateCode() {
  const raw = generateOtp(config.otp.length);
  return { raw, hash: hashOtp(raw) };
}

module.exports = { sendVerificationCode, generateCode };
