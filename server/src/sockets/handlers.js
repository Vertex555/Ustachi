const logger = require('../utils/logger');

/**
 * Register per-socket event handlers.
 * Feature handlers (chat, order tracking) will be expanded in later phases.
 */
module.exports = function registerHandlers(io, socket) {
  socket.on('chat:subscribe', (conversationId) => {
    socket.join(`conversation:${conversationId}`);
    logger.info(`user ${socket.user.id} subscribed to conversation ${conversationId}`);
  });

  socket.on('chat:unsubscribe', (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on('order:track:subscribe', (orderId) => {
    socket.join(`order:${orderId}`);
  });

  socket.on('order:track:unsubscribe', (orderId) => {
    socket.leave(`order:${orderId}`);
  });
};
