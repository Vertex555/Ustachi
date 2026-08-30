const rateLimit = require('express-rate-limit');
const { ApiError } = require('../utils/ApiError');

/**
 * Reusable rate limiter for public/sensitive endpoints.
 */
function createLimiter({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests' } = {}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
      next(new ApiError(429, message, 'RATE_LIMITED'));
    },
  });
}

const authLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many auth attempts' });
const apiLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 300, message: 'Too many requests' });

module.exports = { createLimiter, authLimiter, apiLimiter };
