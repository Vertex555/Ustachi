const crypto = require('crypto');

function generateOtp(length = 6) {
  const max = Math.pow(10, length);
  const code = crypto.randomInt(0, max).toString().padStart(length, '0');
  return code;
}

function hashOtp(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function safeCompare(a, b) {
  const left = String(a);
  const right = String(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

module.exports = { generateOtp, hashOtp, safeCompare };
