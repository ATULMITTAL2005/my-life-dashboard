const mongoose = require('mongoose');

const healthLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Local calendar date YYYY-MM-DD — one entry per day per user.
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    water: { type: Number, min: 0, max: 30, default: 0 }, // glasses
    sleepHours: { type: Number, min: 0, max: 24, default: 0 },
    exerciseMinutes: { type: Number, min: 0, max: 600, default: 0 },
    mood: { type: Number, min: 1, max: 5, default: 3 },
    meals: {
      breakfast: { type: Boolean, default: false },
      lunch: { type: Boolean, default: false },
      dinner: { type: Boolean, default: false },
      snacks: { type: Boolean, default: false },
    },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

healthLogSchema.index({ user: 1, date: 1 }, { unique: true });

healthLogSchema.virtual('mealCount').get(function mealCount() {
  const m = this.meals || {};
  return [m.breakfast, m.lunch, m.dinner, m.snacks].filter(Boolean).length;
});

healthLogSchema.set('toJSON', { virtuals: true });
healthLogSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('HealthLog', healthLogSchema);
