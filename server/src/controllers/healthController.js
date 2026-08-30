const { success } = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { connectDB } = require('../config/db');
const mongoose = require('mongoose');

const health = asyncHandler(async (req, res) => {
  const dbState = mongoose.connection.readyState;
  return success(res, {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: dbState === 1 ? 'connected' : 'disconnected',
    env: process.env.NODE_ENV,
  });
});

module.exports = { health };
