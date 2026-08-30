const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    master: { type: mongoose.Schema.Types.ObjectId, ref: 'Master', required: true, index: true },
    problem: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },

    description: { type: String, trim: true, maxlength: 5000 },
    media: [{ type: String }],

    address: {
      label: { type: String, trim: true },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },

    schedule: {
      preferredDate: { type: Date },
      preferredTimeSlot: { type: String },
    },

    quote: {
      amount: { type: Number, min: 0, default: 0 },
      currency: { type: String, default: 'UZS' },
      estimatedDuration: { type: Number }, // minutes
    },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },

    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    review: { type: mongoose.Schema.Types.ObjectId, ref: 'Review' },

    history: [
      {
        status: { type: String },
        at: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
  },
  { timestamps: true }
);

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ master: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
