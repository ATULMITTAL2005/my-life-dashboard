const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const DASHBOARD_CARDS = ['tasks', 'deadlines', 'money', 'budget', 'health'];

const preferencesSchema = new mongoose.Schema(
  {
    dashboardCards: {
      type: [String],
      default: () => [...DASHBOARD_CARDS],
      validate: {
        validator: (cards) => cards.every((card) => DASHBOARD_CARDS.includes(card)),
        message: 'Unknown dashboard card',
      },
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP'],
      default: 'INR',
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 160,
    },
    passwordHash: { type: String, required: true, select: false },
    preferences: { type: preferencesSchema, default: () => ({}) },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    preferences: {
      dashboardCards: this.preferences?.dashboardCards?.length
        ? this.preferences.dashboardCards
        : [...DASHBOARD_CARDS],
      currency: this.preferences?.currency || 'INR',
    },
    createdAt: this.createdAt,
  };
};

const User = mongoose.model('User', userSchema);

module.exports = { User, DASHBOARD_CARDS };
