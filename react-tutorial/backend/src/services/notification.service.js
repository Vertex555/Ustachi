/**
 * Bildirishnoma xizmati — §11.
 *
 * Qoidalar:
 *  - Idempotency: eventKey orqali bir xil hodisa ikki marta yuborilmaydi.
 *  - "Do not claim a message was delivered unless the provider confirms it."
 *    — push faqat provider qabul qilgan bo'lsa delivered=true qo'yiladi.
 *  - Push/channel sozlamalari tekshiriladi (settings.controller bilan bir xil mantiq).
 */

const Notification = require("../models/Notification");
const { sendToUser } = require("./push.service");
const { emitToUser } = require("./socket");

/**
 * @param {object} p
 * @param {string} p.userId       qabul qiluvchi
 * @param {string} p.type         Notification.NOTIFICATION_TYPES dan
 * @param {string} [p.title]
 * @param {string} [p.body]
 * @param {string} [p.eventKey]   idempotency kaliti
 */
async function notifyUser(p) {
  const {
    userId,
    type,
    title = "",
    body = "",
    order = null,
    chat = null,
    actor = null,
    data = {},
    eventKey = "",
  } = p || {};

  if (!userId || !type) return null;

  // Idempotency: bu hodisa allaqachon yozilganmi?
  if (eventKey) {
    const existing = await Notification.findOne({ user: userId, eventKey }).select("_id");
    if (existing) return existing;
  }

  let doc;
  try {
    doc = await Notification.create({
      user: userId,
      type,
      title,
      body,
      order,
      chat,
      actor,
      data,
      eventKey,
      delivered: { channel: "inapp", at: new Date() },
    });
  } catch (e) {
    // Noyob kalit bilan kelgan ikki so'rov parallel bo'lsa — duplicate key
    if (e.code === 11000) {
      return Notification.findOne({ user: userId, eventKey }).select("_id");
    }
    throw e;
  }

  // Real-time (socket) — bu "yetkazildi" deb hisoblanadi, chunki o'sha kanal haqiqatan yuboriladi
  try {
    emitToUser(userId, "notification:new", {
      id: doc._id.toString(),
      type: doc.type,
      title: doc.title,
      body: doc.body,
      order: order ? String(order) : null,
      createdAt: doc.createdAt,
    });
  } catch {
    /* socket uzilgan bo'lishi mumkin — in-app yozuv baribir saqlangan */
  }

  // Expo push — faqat sozlamada yoqilgan bo'lsa
  try {
    const res = await sendToUser(
      userId,
      {
        title: title || "Ustachi",
        body,
        data: { type, orderId: order ? String(order) : undefined },
      },
      { category: type.startsWith("order") ? "order" : type.startsWith("new_message") ? "chat" : "system" }
    );

    // Faqat provider tasdiqlasa "delivered"
    const delivered = !!res && res.ok === true;
    await Notification.updateOne(
      { _id: doc._id },
      {
        $set: {
          "delivered.channel": delivered ? "push" : "inapp",
          "delivered.at": new Date(),
          "delivered.failed": !delivered,
          "delivered.error": delivered ? "" : String(res?.error || res?.reason || "provider tasdiqlamadi").slice(0, 200),
          ...(res?.data?.id ? { "delivered.providerMessageId": String(res.data.id) } : {}),
        },
      }
    );
  } catch (e) {
    await Notification.updateOne(
      { _id: doc._id },
      { $set: { "delivered.failed": true, "delivered.error": String(e.message).slice(0, 200) } }
    );
  }

  return doc;
}

/** Bir nechta foydalanuvchiga */
async function notifyMany(userIds, payload) {
  const results = [];
  for (const id of userIds) {
    if (!id) continue;
    // eslint-disable-next-line no-await-in-loop
    results.push(await notifyUser({ ...payload, userId: id }));
  }
  return results;
}

/** Ro'yxat + o'qilmagan soni */
async function list(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
  const skip = (Math.max(1, page) - 1) * Math.min(Math.max(1, limit), 100);
  const max = Math.min(Math.max(1, limit), 100);
  const query = { user: userId };
  if (unreadOnly) query.readAt = null;

  const [items, total, unread] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(max).lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ user: userId, readAt: null }),
  ]);

  return { items, total, unread };
}

async function markRead(userId, ids) {
  const filter = { user: userId, readAt: null };
  if (Array.isArray(ids) && ids.length) filter._id = { $in: ids };
  const res = await Notification.updateMany(filter, { $set: { readAt: new Date() } });
  return res.modifiedCount || 0;
}

async function unreadCount(userId) {
  return Notification.countDocuments({ user: userId, readAt: null });
}

module.exports = { notifyUser, notifyMany, list, markRead, unreadCount };
