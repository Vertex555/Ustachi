const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

async function connectDB() {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.db.uri);
    logger.info(`MongoDB connected: ${config.db.uri}`);
  } catch (err) {
    logger.error('MongoDB connection error:', err.message);
    throw err;
  }
}

module.exports = { connectDB };
