const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { parseMonthKey, monthKey, monthLabel } = require('../utils/dates');

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

async function getMoneyOverview(userId, month = monthKey()) {
  const { start, end } = parseMonthKey(month);

  const [totalsAgg, byCategoryAgg, budgets, recent] = await Promise.all([
    Transaction.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { user: userId, type: 'expense', date: { $gte: start, $lte: end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]),
    Budget.find({ user: userId, month }).sort({ category: 1 }).lean(),
    Transaction.find({ user: userId }).sort({ date: -1, createdAt: -1 }).limit(5).lean(),
  ]);

  const income = round2(totalsAgg.find((t) => t._id === 'income')?.total || 0);
  const expenses = round2(totalsAgg.find((t) => t._id === 'expense')?.total || 0);
  const savings = round2(income - expenses);

  const byCategory = byCategoryAgg.map((row) => ({
    category: row._id,
    total: round2(row.total),
  }));
  const spentByCategory = new Map(byCategory.map((row) => [row.category, row.total]));

  const budgetRows = budgets.map((budget) => {
    const spent = spentByCategory.get(budget.category) || 0;
    const percent = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
    return {
      id: budget._id,
      category: budget.category,
      amount: round2(budget.amount),
      month: budget.month,
      spent: round2(spent),
      remaining: round2(budget.amount - spent),
      percent,
      status: percent >= 100 ? 'over' : percent >= 80 ? 'near' : 'ok',
    };
  });

  const totalBudget = round2(budgetRows.reduce((sum, b) => sum + b.amount, 0));
  const budgetSpent = round2(budgetRows.reduce((sum, b) => sum + b.spent, 0));
  const remainingBudget = round2(totalBudget - budgetSpent);

  const alerts = budgetRows
    .filter((b) => b.status !== 'ok')
    .map((b) => ({
      category: b.category,
      percent: b.percent,
      spent: b.spent,
      amount: b.amount,
      status: b.status,
    }));

  // Six-month income vs expense trend (oldest first).
  const now = new Date();
  const trendMonths = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const range = parseMonthKey(key);
    trendMonths.push({ key, range });
  }

  const trendAgg = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        date: { $gte: trendMonths[0].range.start, $lte: trendMonths[trendMonths.length - 1].range.end },
      },
    },
    {
      $group: {
        _id: {
          month: { $dateToString: { format: '%Y-%m', date: '$date' } },
          type: '$type',
        },
        total: { $sum: '$amount' },
      },
    },
  ]);

  const trend = trendMonths.map(({ key }) => {
    const incomeRow = trendAgg.find((r) => r._id.month === key && r._id.type === 'income');
    const expenseRow = trendAgg.find((r) => r._id.month === key && r._id.type === 'expense');
    return {
      month: key,
      label: monthLabel(key),
      income: round2(incomeRow?.total || 0),
      expenses: round2(expenseRow?.total || 0),
    };
  });

  return {
    month,
    income,
    expenses,
    savings,
    savingsRate: income > 0 ? Math.round((savings / income) * 100) : 0,
    totalBudget,
    budgetSpent,
    remainingBudget,
    byCategory,
    budgets: budgetRows,
    alerts,
    trend,
    recent,
  };
}

module.exports = { getMoneyOverview, round2 };
