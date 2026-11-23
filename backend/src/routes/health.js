const express = require('express');
const { z } = require('zod');
const HealthLog = require('../models/HealthLog');
const HealthGoal = require('../models/HealthGoal');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { getHealthOverview, METRIC_META } = require('../services/health');
const { addDays, ymd } = require('../utils/dates');

const router = express.Router();
router.use(requireAuth);

const mealsSchema = z.object({
  breakfast: z.boolean().optional(),
  lunch: z.boolean().optional(),
  dinner: z.boolean().optional(),
  snacks: z.boolean().optional(),
});

const logSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date.').optional(),
  water: z.coerce.number().min(0, 'Water cannot be negative.').max(30).optional(),
  sleepHours: z.coerce.number().min(0, 'Sleep cannot be negative.').max(24).optional(),
  exerciseMinutes: z.coerce.number().min(0, 'Exercise cannot be negative.').max(600).optional(),
  mood: z.coerce.number().int().min(1).max(5).optional(),
  meals: mealsSchema.optional(),
  notes: z.string().trim().max(500).optional(),
});

const updateLogSchema = logSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Nothing to update.',
});

const goalSchema = z.object({
  title: z.string().trim().min(2, 'Give the goal a title.').max(120),
  metric: z.enum(['water', 'sleep', 'exercise', 'meals', 'mood']),
  target: z.coerce.number().positive('Set a target greater than zero.').max(100000),
  unit: z.string().trim().max(30).optional(),
  period: z.enum(['daily', 'weekly', 'monthly']).optional(),
  active: z.boolean().optional(),
});

const updateGoalSchema = goalSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Nothing to update.',
});

function mergeMeals(existing, incoming) {
  return {
    breakfast: false,
    lunch: false,
    dinner: false,
    snacks: false,
    ...(existing || {}),
    ...(incoming || {}),
  };
}

// GET /api/health/overview?days=7
router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const days = Number(req.query.days) || 7;
    res.json(await getHealthOverview(req.userId, days));
  })
);

// GET /api/health/logs?days=30
router.get(
  '/logs',
  asyncHandler(async (req, res) => {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const start = ymd(addDays(new Date(), -(days - 1)));
    const logs = await HealthLog.find({ user: req.userId, date: { $gte: start } })
      .sort({ date: -1 })
      .lean();
    res.json({ logs });
  })
);

// POST /api/health/logs — creates or updates the check-in for a date
router.post(
  '/logs',
  validate(logSchema),
  asyncHandler(async (req, res) => {
    const date = req.body.date || ymd();
    const existing = await HealthLog.findOne({ user: req.userId, date });

    if (existing) {
      const { meals, ...rest } = req.body;
      Object.assign(existing, rest);
      if (meals) existing.meals = mergeMeals(existing.meals, meals);
      await existing.save();
      return res.json({ log: existing, message: 'Check-in updated.' });
    }

    const log = await HealthLog.create({
      ...req.body,
      date,
      meals: mergeMeals(null, req.body.meals),
      user: req.userId,
    });
    return res.status(201).json({ log, message: 'Check-in saved.' });
  })
);

// PUT /api/health/logs/:id
router.put(
  '/logs/:id',
  validate(updateLogSchema),
  asyncHandler(async (req, res) => {
    const log = await HealthLog.findOne({ _id: req.params.id, user: req.userId });
    if (!log) return res.status(404).json({ message: 'Health entry not found.' });

    const { meals, ...rest } = req.body;
    Object.assign(log, rest);
    if (meals) log.meals = mergeMeals(log.meals, meals);
    await log.save();
    return res.json({ log, message: 'Health entry updated.' });
  })
);

// DELETE /api/health/logs/:id
router.delete(
  '/logs/:id',
  asyncHandler(async (req, res) => {
    const deleted = await HealthLog.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!deleted) return res.status(404).json({ message: 'Health entry not found.' });
    return res.json({ message: 'Health entry deleted.' });
  })
);

// GET /api/health/goals
router.get(
  '/goals',
  asyncHandler(async (req, res) => {
    const goals = await HealthGoal.find({ user: req.userId }).sort({ active: -1, createdAt: 1 }).lean();
    res.json({ goals });
  })
);

// POST /api/health/goals
router.post(
  '/goals',
  validate(goalSchema),
  asyncHandler(async (req, res) => {
    const goal = await HealthGoal.create({
      ...req.body,
      unit: req.body.unit || METRIC_META[req.body.metric]?.unit || '',
      period: req.body.period || 'daily',
      user: req.userId,
    });
    res.status(201).json({ goal, message: 'Goal created.' });
  })
);

// PUT /api/health/goals/:id
router.put(
  '/goals/:id',
  validate(updateGoalSchema),
  asyncHandler(async (req, res) => {
    const goal = await HealthGoal.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!goal) return res.status(404).json({ message: 'Goal not found.' });
    return res.json({ goal, message: 'Goal updated.' });
  })
);

// DELETE /api/health/goals/:id
router.delete(
  '/goals/:id',
  asyncHandler(async (req, res) => {
    const deleted = await HealthGoal.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!deleted) return res.status(404).json({ message: 'Goal not found.' });
    return res.json({ message: 'Goal deleted.' });
  })
);

module.exports = router;
