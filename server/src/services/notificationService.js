const { Notification } = require('../models');
const { getIo } = require('../sockets');

/**
 * Create a notification for a user and push it over socket.io in real time.
 */
async function notify(userId, { type = 'system', title, message, data } = {}) {
  const notification = await Notification.create({
    recipient: userId,
    type,
    title,
    message,
    data,
  });

  const io = getIo();
  if (io) {
    io.to(`user:${userId}`).emit('notification:new', notification);
  }
  return notification;
}

/**
 * Mark one/all of a user's notifications as read.
 */
async function markRead(userId, notificationId = null) {
  const filter = { recipient: userId, read: false };
  if (notificationId) filter._id = notificationId;

  const res = await Notification.updateMany(filter, {
    $set: { read: true, readAt: new Date() },
  });
  return res;
}

module.exports = { notify, markRead };
