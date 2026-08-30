const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    master: { type: mongoose.Schema.Types.ObjectId, ref: 'Master' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'UZS' },
    provider: { type: String, default: 'manual' }, // stripe | paypal | manual
    providerReference: { type: String }, // external transaction id
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'failed'],
      default: 'pending',
      index: true,
    },
    method: { type: String },
    receivedAt: { type: Date },
  },
  { timestamps: true }
);

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
