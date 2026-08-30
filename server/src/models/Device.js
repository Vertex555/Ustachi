const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, trim: true },
    model: { type: String, trim: true },
    category: {
      type: String,
      enum: [
        'smartphone',
        'laptop',
        'tablet',
        'tv',
        'refrigerator',
        'washing_machine',
        'microwave',
        'air_conditioner',
        'vacuum',
        'other',
      ],
      default: 'other',
      index: true,
    },
    image: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

deviceSchema.index({ name: 'text', brand: 'text', model: 'text' });

const Device = mongoose.model('Device', deviceSchema);
module.exports = Device;
