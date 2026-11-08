const Notification = require("../models/Notification");
const service = require("../services/notification.service");

/** Bildirishnomalar ro'yxati + o'qilmagan soni */
exports.list = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const unreadOnly = req.query.unread === "1" || req.query.unread === "true";

  const { items, total, unread } = await service.list(req.user._id, { page, limit, unreadOnly });

  res.json({
    success: true,
    data: items.map((n) => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      body: n.body,
      orderId: n.order ? String(n.order) : null,
      chatId: n.chat ? String(n.chat) : null,
      read: !!n.readAt,
      readAt: n.readAt,
      createdAt: n.createdAt,
      // Yetkazilganmi — provider tasdiqlaganmi
      delivery: n.delivered || null,
    })),
    unread,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

exports.unreadCount = async (req, res) => {
  const unread = await service.unreadCount(req.user._id);
  res.json({ success: true, data: { unread } });
};

/** Tanlangan bildirishnomalarni o'qilgan deb belgilash */
exports.markRead = async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.slice(0, 200) : null;
  const n = await service.markRead(req.user._id, ids);
  res.json({ success: true, data: { updated: n } });
};

exports.markAllRead = async (req, res) => {
  const n = await service.markRead(req.user._id, null);
  res.json({ success: true, data: { updated: n } });
};

/** O'chirish — faqat o'z bildirishnomalarini */
exports.remove = async (req, res) => {
  const deleted = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  }).select("_id");
  if (!deleted) {
    return res.status(404).json({ success: false, message: "Bildirishnoma topilmadi" });
  }
  res.json({ success: true });
};
