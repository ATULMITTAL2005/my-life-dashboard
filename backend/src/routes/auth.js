const express = require('express');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const { User, DASHBOARD_CARDS } = require('../models/User');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { signToken } = require('../utils/jwt');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
});

const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(72, 'Password must be 72 characters or fewer.')
  .regex(/[A-Za-z]/, 'Include at least one letter.')
  .regex(/[0-9]/, 'Include at least one number.');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(160),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

const profileSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your name.').max(80).optional(),
    email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(160).optional(),
  })
  .refine((data) => data.name || data.email, { message: 'Nothing to update.' });

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: passwordSchema,
});

const preferencesSchema = z.object({
  dashboardCards: z
    .array(z.enum(DASHBOARD_CARDS))
    .max(DASHBOARD_CARDS.length, 'Unknown dashboard card.')
    .optional(),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP']).optional(),
});

// POST /api/auth/register
router.post('/register', authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        message: 'An account with this email already exists. Try signing in instead.',
        errors: { email: 'This email is already registered.' },
      });
    }

    const user = await User.create({ name, email, passwordHash: password });
    return res.status(201).json({ token: signToken(user._id), user: user.toSafeJSON() });
  } catch (err) {
    return next(err);
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    return res.json({ token: signToken(user._id), user: user.toSafeJSON() });
  } catch (err) {
    return next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

// PATCH /api/auth/profile
router.patch('/profile', requireAuth, validate(profileSchema), async (req, res, next) => {
  try {
    const { name, email } = req.body;
    if (email && email !== req.user.email) {
      const taken = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (taken) {
        return res.status(409).json({
          message: 'That email is already in use.',
          errors: { email: 'This email is already registered.' },
        });
      }
      req.user.email = email;
    }
    if (name) req.user.name = name;
    await req.user.save();
    return res.json({ user: req.user.toSafeJSON(), message: 'Profile updated.' });
  } catch (err) {
    return next(err);
  }
});

// PUT /api/auth/password
router.put('/password', requireAuth, validate(passwordChangeSchema), async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+passwordHash');
    const ok = await user.comparePassword(req.body.currentPassword);
    if (!ok) {
      return res.status(400).json({
        message: 'Your current password is incorrect.',
        errors: { currentPassword: 'Incorrect password.' },
      });
    }
    user.passwordHash = req.body.newPassword;
    await user.save();
    return res.json({ message: 'Password updated. Use it the next time you sign in.' });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/auth/preferences
router.patch('/preferences', requireAuth, validate(preferencesSchema), async (req, res, next) => {
  try {
    const { dashboardCards, currency } = req.body;
    if (dashboardCards) {
      req.user.preferences.dashboardCards = [...new Set(dashboardCards)];
    }
    if (currency) req.user.preferences.currency = currency;
    await req.user.save();
    return res.json({ user: req.user.toSafeJSON(), message: 'Preferences saved.' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
