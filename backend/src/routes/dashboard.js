const express = require('express');
const Task = require('../models/Task');
const Project = require('../models/Project');
const requireAuth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { getMoneyOverview } = require('../services/money');
const { getHealthOverview } = require('../services/health');
const { addDays, endOfDay, monthKey, startOfDay, ymd } = require('../utils/dates');

const router = express.Router();
router.use(requireAuth);

// GET /api/dashboard — one call for every dashboard widget
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const now = new Date();
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);
    const trendStart = startOfDay(addDays(now, -6));

    const [
      todayTasks,
      incompleteTodayCount,
      completedToday,
      upcomingDeadlines,
      overdueProjectCount,
      money,
      health,
      taskTrendAgg,
      reminders,
      projectCount,
    ] = await Promise.all([
      Task.find({
        user: req.userId,
        project: null,
        completed: false,
        $or: [{ dueDate: null }, { dueDate: { $lte: dayEnd } }],
      })
        .sort({ dueDate: 1, priority: 1 })
        .limit(6)
        .lean(),
      Task.countDocuments({
        user: req.userId,
        project: null,
        completed: false,
        $or: [{ dueDate: null }, { dueDate: { $lte: dayEnd } }],
      }),
      Task.countDocuments({
        user: req.userId,
        project: null,
        completed: true,
        completedAt: { $gte: dayStart, $lte: dayEnd },
      }),
      Project.find({ user: req.userId, status: { $ne: 'completed' }, deadline: { $gte: dayStart } })
        .sort({ deadline: 1 })
        .limit(5)
        .lean(),
      Project.countDocuments({ user: req.userId, status: { $ne: 'completed' }, deadline: { $lt: dayStart } }),
      getMoneyOverview(req.userId, monthKey()),
      getHealthOverview(req.userId, 7),
      Task.aggregate([
        {
          $match: {
            user: req.userId,
            completed: true,
            completedAt: { $gte: trendStart, $lte: dayEnd },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
            count: { $sum: 1 },
          },
        },
      ]),
      Task.find({
        user: req.userId,
        completed: false,
        reminderAt: { $ne: null, $lte: now },
      })
        .sort({ reminderAt: 1 })
        .limit(5)
        .lean(),
      Project.countDocuments({ user: req.userId, status: { $ne: 'completed' } }),
    ]);

    const taskTrend = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = addDays(now, -i);
      const key = ymd(d);
      const row = taskTrendAgg.find((r) => r._id === key);
      taskTrend.push({
        date: key,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        count: row?.count || 0,
      });
    }

    const totalToday = incompleteTodayCount + completedToday;
    const moneySummary = {
      month: money.month,
      income: money.income,
      expenses: money.expenses,
      savings: money.savings,
      savingsRate: money.savingsRate,
      totalBudget: money.totalBudget,
      budgetSpent: money.budgetSpent,
      remainingBudget: money.remainingBudget,
      byCategory: money.byCategory.slice(0, 6),
      budgets: money.budgets,
      alerts: money.alerts,
      trend: money.trend,
    };

    const healthSummary = {
      today: health.today,
      averages: health.averages,
      trend: health.trend,
      goals: health.goals,
      loggedDays: health.loggedDays,
    };

    res.json({
      today: ymd(now),
      tasks: {
        items: todayTasks,
        total: totalToday,
        incomplete: incompleteTodayCount,
        completedToday,
        percent: totalToday ? Math.round((completedToday / totalToday) * 100) : 0,
      },
      deadlines: {
        items: upcomingDeadlines.map((p) => ({
          id: p._id,
          name: p.name,
          deadline: p.deadline,
          priority: p.priority,
          status: p.status,
          color: p.color,
        })),
        overdueCount: overdueProjectCount,
        activeProjects: projectCount,
      },
      money: moneySummary,
      health: healthSummary,
      taskTrend,
      reminders,
    });
  })
);

module.exports = router;
