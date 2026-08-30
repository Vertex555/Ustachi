const cron = require('node-cron');
const logger = require('../utils/logger');

function startJobs() {
  const jobs = [];
  try {
    const { cleanupVerificationCodes } = require('./cleanup.job');
    jobs.push(cleanupVerificationCodes());
  } catch (err) {
    logger.warn('Some jobs failed to start:', err.message);
  }
  logger.info(`Scheduled ${jobs.length} cron job(s)`);
}

module.exports = { startJobs };
