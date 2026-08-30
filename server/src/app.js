const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const config = require('./config');
const logger = require('./utils/logger');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');
const { apiLimiter } = require('./middleware/rateLimiter');
const { ensureUploadDir } = require('./services/uploadService');

const app = express();

// Trust proxy if behind a reverse proxy (nginx etc.)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS — allow the client origin with credentials (cookies).
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookies
app.use(cookieParser());

// Request logging
app.use(morgan(config.isProd ? 'combined' : 'dev', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Ensure upload dir exists and serve uploaded media statically
ensureUploadDir();
app.use('/uploads', express.static(config.upload.dir));

// Global rate limit for the API
app.use('/api', apiLimiter);

// Versioned API routes
app.use('/api/v1', routes);

// Simple root check
app.get('/', (req, res) => res.json({ name: 'Ustachi API', version: 'v1', status: 'running' }));

// 404 + centralized error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
