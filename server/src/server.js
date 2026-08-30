const http = require('http');
const config = require('./config');
const logger = require('./utils/logger');
const app = require('./app');
const { connectDB } = require('./config/db');
const { initSocket } = require('./sockets');
const { startJobs } = require('./jobs');

const server = http.createServer(app);

async function bootstrap() {
  try {
    await connectDB();

    // Attach Socket.IO to the HTTP server.
    initSocket(server);

    // Start scheduled jobs.
    startJobs();

    server.listen(config.port, () => {
      logger.info(`Ustachi server listening on port ${config.port} (${config.env})`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

// Graceful shutdown
function shutdown(signal) {
  logger.info(`${signal} received, shutting down...`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  // Force-exit if connections linger
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

bootstrap();
