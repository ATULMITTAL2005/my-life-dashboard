const express = require('express');
const { z } = require('zod');
const Budget = require('../models/Budget');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { getMoneyOverview } = require('../services/money');
const { monthKey } = require('../utils/dates');

const router = express.Router();
router.use(requireAuth);

const budgetSchema = z.object({
  category: z.string().trim().min(1, 'Choose a category.').max(60),
  amount: z.coerce.number().positive('Enter a budget amount greater than zero.').max(100000000),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use a valid month.')
    .optional(),
});

const updateSchema = budgetSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Nothing to update.',
});

// GET /api/budgets?month=YYYY-MM — budgets with live spend + totals
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const month = req.query.month || monthKey();
    const overview = await getMoneyOverview(req.userId, month);
    res.json({
      month,
      budgets: overview.budgets,
      totalBudget: overview.totalBudget,
      budgetSpent: overview.budgetSpent,
      remainingBudget: overview.remainingBudget,
      alerts: overview.alerts,
    });
  })
);

// POST /api/budgets
router.post(
  '/',
  validate(budgetSchema),
  asyncHandler(async (req, res) => {
    const month = req.body.month || monthKey();
    const exists = await Budget.findOne({ user: req.userId, category: req.body.category, month });
    if (exists) {
      return res.status(409).json({
        message: `A budget for ${req.body.category} already exists this month. Edit it instead.`,
      });
    }
    const budget = await Budget.create({ ...req.body, month, user: req.userId });
    return res.status(201).json({ budget, message: 'Budget created.' });
  })
);

// PUT /api/budgets/:id
router.put(
  '/:id',
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const budget = await Budget.findOne({ _id: req.params.id, user: req.userId });
    if (!budget) return res.status(404).json({ message: 'Budget not found.' });

    if (req.body.category || req.body.month) {
      const category = req.body.category || budget.category;
      const month = req.body.month || budget.month;
      const clash = await Budget.findOne({
        user: req.userId,
        category,
        month,
        _id: { $ne: budget._id },
      });
      if (clash) {
        return res.status(409).json({ message: 'Another budget already exists for that category and month.' });
      }
    }

    Object.assign(budget, req.body);
    await budget.save();
    return res.json({ budget, message: 'Budget updated.' });
  })
);

// DELETE /api/budgets/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const deleted = await Budget.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!deleted) return res.status(404).json({ message: 'Budget not found.' });
    return res.json({ message: 'Budget deleted.' });
  })
);

module.exports = router;
