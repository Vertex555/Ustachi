const mongoose = require('mongoose');

const mediaItemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['image', 'video'], required: true },
    url: { type: String, required: true },
    size: { type: Number },
    mimeType: { type: String },
  },
  { _id: false }
);

const problemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    media: [mediaItemSchema],
    symptoms: [{ type: String, trim: true }],
    analysis: {
      // populated by the analysis service (stub for now)
      category: { type: String },
      suggestedSkills: [{ type: String }],
      confidence: { type: Number, min: 0, max: 1 },
      summary: { type: String },
    },
    status: {
      type: String,
      enum: ['draft', 'open', 'matching', 'assigned', 'closed'],
      default: 'open',
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
  },
  { timestamps: true }
);

problemSchema.index({ location: '2dsphere' });
problemSchema.index({ status: 1, createdAt: -1 });

const Problem = mongoose.model('Problem', problemSchema);
module.exports = Problem;
