const { VerificationCode } = require('../models');
const config = require('../config');
const { hashOtp, safeCompare } = require('../utils/otp');
const { ApiError } = require('../utils/ApiError');
const telegramService = require('./telegramService');

/**
 * Create + send an OTP for a given phone/type.
 * Returns raw code only in dev when delivery fails (for testing).
 */
async function issue(phone, type, userId = null) {
  await VerificationCode.updateMany(
    { phone, type, valid: true, consumed: false },
    { $set: { valid: false } }
  );

  const { raw, hash } = telegramService.generateCode();
  const expiresAt = new Date(Date.now() + config.otp.expiresMinutes * 60 * 1000);

  await VerificationCode.create({
    user: userId || undefined,
    phone,
    type,
    codeHash: hash,
    expiresAt,
  });

  const result = await telegramService.sendVerificationCode(phone, raw);
  return result;
}

async function verify(phone, type, code) {
  const record = await VerificationCode.findOne({
    phone,
    type,
    valid: true,
    consumed: false,
  }).sort({ createdAt: -1 });

  if (!record) {
    throw new ApiError(400, 'No active verification code', 'OTP_NOT_FOUND');
  }
  if (record.expiresAt < new Date()) {
    record.valid = false;
    await record.save();
    throw new ApiError(400, 'Verification code expired', 'OTP_EXPIRED');
  }
  if (record.attempts >= config.otp.maxAttempts) {
    record.valid = false;
    await record.save();
    throw new ApiError(400, 'Too many attempts', 'OTP_MAX_ATTEMPTS');
  }

  record.attempts += 1;
  await record.save();

  if (!safeCompare(record.codeHash, hashOtp(code))) {
    throw new ApiError(400, 'Incorrect verification code', 'OTP_INVALID');
  }

  record.consumed = true;
  record.valid = false;
  await record.save();

  return { phone, type };
}

module.exports = { issue, verify };
