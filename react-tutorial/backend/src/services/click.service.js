// Click to'lov provayderi bilan ishlash.
// Hujjatlar: https://docs.click.uz/click-api/
const crypto = require("crypto");

const CLICK_MERCHANT_ID = process.env.CLICK_MERCHANT_ID || "";
const CLICK_SERVICE_ID = process.env.CLICK_SERVICE_ID || "";
const CLICK_SECRET_KEY = process.env.CLICK_SECRET_KEY || "";

function sha1(str) {
  return crypto.createHash("sha1").update(String(str), "utf8").digest("hex");
}

// CLICK yon paneldagi ish so'rovlari uchun satr.
// action=0 (prepare):  click_trans_id*service_id*secret*merchant_trans_id*amount*action*sign_time
// action=1 (complete): click_trans_id*service_id*secret*merchant_prepare_id*amount*action*sign_time
function signature(params, action) {
  const { click_trans_id, service_id, merchant_trans_id, merchant_prepare_id, amount, sign_time } = params;
  if (action === 1) {
    return sha1(
      String(click_trans_id) +
      "*" + String(service_id) +
      "*" + CLICK_SECRET_KEY +
      "*" + String(merchant_prepare_id) +
      "*" + String(amount) +
      "*1*" + String(sign_time)
    );
  }
  return sha1(
    String(click_trans_id) +
    "*" + String(service_id) +
    "*" + CLICK_SECRET_KEY +
    "*" + String(merchant_trans_id) +
    "*" + String(amount) +
    "*0*" + String(sign_time)
  );
}

function verify(params, action, provided) {
  if (!provided) return false;
  const expect = signature(params, action);
  return String(provided).toLowerCase() === String(expect).toLowerCase();
}

function isConfigured() {
  return Boolean(CLICK_MERCHANT_ID && CLICK_SERVICE_ID && CLICK_SECRET_KEY);
}

// Foydalanuvchi to'lov oynasini ochishi uchun to'lov sahifasi URL'i
function paymentUrl(orderRef, amount) {
  const params = new URLSearchParams({
    service_id: CLICK_SERVICE_ID,
    merchant_id: CLICK_MERCHANT_ID,
    amount: String(Math.round(Number(amount) || 0)),
    transaction_param: String(orderRef),
  });
  return `https://my.click.uz/services/pay?${params.toString()}`;
}

module.exports = { signature, verify, isConfigured, paymentUrl, CLICK_MERCHANT_ID, CLICK_SERVICE_ID };