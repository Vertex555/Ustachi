const mongoose = require('mongoose');

const masterSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    title: { type: String, trim: true, maxlength: 120 },
    bio: { type: String, trim: true, maxlength: 1000 },
    yearsOfExperience: { type: Number, min: 0, max: 80, default: 0 },
    skills: [{ type: String, trim: true }],
    devices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Device' }],
    serviceArea: { type: String, trim: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    contact: {
      phone: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
    },
    hourlyRate: { type: Number, min: 0, default: 0 },
    isAvailable: { type: Boolean, default: true },
    verified: { type: Boolean, default: false },

    // Aggregate stats (denormalized for fast filtering)
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
  },
  { timestamps: true }
);

masterSchema.index({ location: '2dsphere' });
masterSchema.index({ rating: -1 });
masterSchema.index({ isAvailable: 1, rating: -1 });

const Master = mongoose.model('Master', masterSchema);
module.exports = Master;
