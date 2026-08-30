const { Server } = require('socket.io');
const config = require('../config');
const { verifyAccessToken } = require('../services/authService');
const { User } = require('../models');
const logger = require('../utils/logger');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
    pingTimeout: 60000,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));
      const { valid, payload } = verifyAccessToken(token);
      if (!valid) return next(new Error('Invalid token'));

      const user = await User.findById(payload.sub).select('name role');
      if (!user) return next(new Error('User not found'));

      socket.user = { id: user._id.toString(), name: user.name, role: user.role };
      next();
    } catch (err) {
      next(err);
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    socket.join(`user:${userId}`);
    logger.info(`Socket connected: user ${userId} (${socket.id})`);

    // Handler registrations (chat/tracking) can be attached here per phase.
    require('./handlers')(io, socket);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: user ${userId}`);
    });
  });

  return io;
}

function getIo() {
  return io;
}

module.exports = { initSocket, getIo };
