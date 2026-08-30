const cron = require('node-cron');
const { VerificationCode } = require('../models');
const logger = require('../utils/logger');

/**
 * Scheduled cleanup of consumed/expired verification codes.
 * The TTL index also auto-removes expired docs; this runs as a safeguard
 * for consumed records.
 */
function cleanupVerificationCodes() {
  return cron.schedule('0 * * * *', async () => {
    try {
      const res = await VerificationCode.deleteMany({
        $or: [{ consumed: true }, { valid: false }],
      });
      if (res.deletedCount) {
        logger.info(`Cleaned ${res.deletedCount} stale verification codes`);
      }
    } catch (err) {
      logger.error('Verification cleanup job failed:', err.message);
    }
  });
}

module.exports = { cleanupVerificationCodes };
