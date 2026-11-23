const mongoose = require('mongoose');

const healthGoalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    metric: {
      type: String,
      enum: ['water', 'sleep', 'exercise', 'meals', 'mood'],
      required: true,
    },
    target: { type: Number, required: true, min: 0.1 },
    unit: { type: String, trim: true, maxlength: 30, default: '' },
    period: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HealthGoal', healthGoalSchema);
