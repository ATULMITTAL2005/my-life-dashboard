const express = require('express');
const { z } = require('zod');
const Transaction = require('../models/Transaction');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { getMoneyOverview } = require('../services/money');
const { monthKey } = require('../utils/dates');

const router = express.Router();
router.use(requireAuth);

const optionalDate = z.union([z.null(), z.coerce.date()]).optional();

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('Enter an amount greater than zero.').max(100000000),
  category: z.string().trim().min(1, 'Choose a category.').max(60),
  date: optionalDate,
  paymentMethod: z.enum(['cash', 'card', 'upi', 'bank_transfer', 'other']).optional(),
  notes: z.string().trim().max(500).optional(),
});

const updateSchema = transactionSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Nothing to update.',
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/transactions?type=&category=&from=&to=&q=&page=&limit=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { type, category, from, to, q } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));

    const filter = { user: req.userId };
    if (type === 'income' || type === 'expense') filter.type = type;
    if (category) filter.category = category;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(`${from}T00:00:00.000`);
      if (to) filter.date.$lte = new Date(`${to}T23:59:59.999`);
      if (Number.isNaN(filter.date.$gte?.getTime()) || Number.isNaN(filter.date.$lte?.getTime())) {
        delete filter.date;
      }
    }
    if (q && String(q).trim()) {
      const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
      filter.$or = [{ notes: rx }, { category: rx }];
    }

    const [items, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  })
);

// GET /api/transactions/summary?month=YYYY-MM
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const month = req.query.month || monthKey();
    const overview = await getMoneyOverview(req.userId, month);
    res.json(overview);
  })
);

// GET /api/transactions/categories — distinct categories used by this user
router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const categories = await Transaction.distinct('category', { user: req.userId });
    res.json({ categories: categories.sort((a, b) => a.localeCompare(b)) });
  })
);

// POST /api/transactions
router.post(
  '/',
  validate(transactionSchema),
  asyncHandler(async (req, res) => {
    const transaction = await Transaction.create({
      ...req.body,
      user: req.userId,
      date: req.body.date || new Date(),
    });
    res.status(201).json({ transaction, message: 'Transaction added.' });
  })
);

// PUT /api/transactions/:id
router.put(
  '/:id',
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });
    return res.json({ transaction, message: 'Transaction updated.' });
  })
);

// DELETE /api/transactions/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const deleted = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!deleted) return res.status(404).json({ message: 'Transaction not found.' });
    return res.json({ message: 'Transaction deleted.' });
  })
);

module.exports = router;
