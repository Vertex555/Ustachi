const jwt = require("jsonwebtoken");

const { JWT_SECRET } = require("../middleware/auth");
const {
  ORDER_STATUSES,
  DELIVERY_METHODS,
  PAYMENT_METHODS,
} = require("../models/Order");

const JWT_EXPIRES_IN = "7d";

function signToken(user) {
  return jwt.sign({ id: user._id.toString() }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

function serializeUser(user) {
  const saved = (user.savedMasters || []).map((s) =>
    s && s._id ? s._id.toString() : String(s)
  );
  return {
    id: user._id.toString(),
    phone: user.phone,
    name: user.name || "",
    email: user.email || "",
    photo: user.photo || null,
    savedMasters: saved,
    role: user.role,
  };
}

function serializeMaster(m) {
  return {
    id: m._id.toString(),
    name: m.name,
    phone: m.phone,
    experience: m.experience,
    devices: m.devices || [],
    location: m.location || null,
    rating: m.rating ?? 0,
    reviewsCount: m.reviewsCount || 0,
    price: m.price ?? 0,
    workingHours: m.workingHours || "",
    bankCard: m.bankCard || "",
    cardholderName: m.cardholderName || "",
    photo: m.photo,
  };
}

function serializeOrder(o) {
  const master =
    o.master && typeof o.master === "object" && o.master.name
      ? o.master
      : null;
  const user =
    o.user && typeof o.user === "object" && o.user.phone ? o.user : null;

  return {
    id: o._id.toString(),
    orderNumber: o.orderNumber,
    device: o.device,
    deviceModel: o.deviceModel,
    issue: o.issue,
    description: o.description,
    comment: o.comment,
    price: o.price,
    commission: o.commission,
    total: o.total,
    deliveryFee: o.deliveryFee || 0,
    deliveryMethod: o.deliveryMethod || "master_pickup",
    paymentMethod: o.paymentMethod || "cash_on_delivery",
    location: o.location || null,
    masterLocation: o.masterLocation || null,
    photos: o.photos || [],
    status: o.status,
    rejectionReason: o.rejectionReason || "",
    rating: o.rating || 0,
    review: o.review || "",
    ratedAt: o.ratedAt || null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    contactPhone: master ? master.phone : undefined,
    master: master
      ? {
          id: master._id ? master._id.toString() : o.master.toString(),
          name: master.name,
          phone: master.phone,
          rating: master.rating ?? 0,
          price: master.price ?? 0,
          location: master.location || null,
          lat: master.location?.lat ?? null,
          lng: master.location?.lng ?? null,
          photo: master.photo || null,
          avatarCh: (master.name || "M").charAt(0),
        }
      : undefined,
    user: user
      ? {
          id: user._id.toString(),
          phone: user.phone,
          name: user.name || "",
          photo: user.photo || null,
          avatarCh: (user.name || user.phone || "?").charAt(0),
        }
      : undefined,
  };
}

function isValidOrderStatus(s) {
  return ORDER_STATUSES.includes(s);
}

function isValidDeliveryMethod(m) {
  return DELIVERY_METHODS.includes(m);
}

function isValidPaymentMethod(m) {
  return PAYMENT_METHODS.includes(m);
}

module.exports = {
  signToken,
  serializeUser,
  serializeMaster,
  serializeOrder,
  isValidOrderStatus,
  isValidDeliveryMethod,
  isValidPaymentMethod,
  ORDER_STATUSES,
  DELIVERY_METHODS,
  PAYMENT_METHODS,
};