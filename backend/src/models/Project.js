const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: {
      type: String,
      enum: ['planning', 'active', 'review', 'completed', 'paused'],
      default: 'planning',
    },
    deadline: { type: Date, default: null },
    color: {
      type: String,
      enum: ['sage', 'clay', 'gold', 'sky', 'plum'],
      default: 'sage',
    },
  },
  { timestamps: true }
);

projectSchema.index({ user: 1, status: 1, deadline: 1 });

module.exports = mongoose.model('Project', projectSchema);
