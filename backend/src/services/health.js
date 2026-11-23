const HealthLog = require('../models/HealthLog');
const HealthGoal = require('../models/HealthGoal');
const { addDays, ymd } = require('../utils/dates');

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const METRIC_META = {
  water: { unit: 'glasses', label: 'Water' },
  sleep: { unit: 'hours', label: 'Sleep' },
  exercise: { unit: 'minutes', label: 'Exercise' },
  meals: { unit: 'meals', label: 'Meals' },
  mood: { unit: 'avg mood', label: 'Mood' },
};

function mealCount(meals = {}) {
  return [meals.breakfast, meals.lunch, meals.dinner, meals.snacks].filter(Boolean).length;
}

function metricValue(logs, metric) {
  if (!logs.length) return 0;
  if (metric === 'water') return logs.reduce((s, l) => s + (l.water || 0), 0);
  if (metric === 'sleep') return logs.reduce((s, l) => s + (l.sleepHours || 0), 0);
  if (metric === 'exercise') return logs.reduce((s, l) => s + (l.exerciseMinutes || 0), 0);
  if (metric === 'meals') return logs.reduce((s, l) => s + mealCount(l.meals), 0);
  if (metric === 'mood') return logs.reduce((s, l) => s + (l.mood || 0), 0) / logs.length;
  return 0;
}

function buildGoalProgress(goals, logs) {
  const today = ymd();
  return goals.map((goal) => {
    const windowDays = goal.period === 'weekly' ? 7 : goal.period === 'monthly' ? 30 : 1;
    const start = ymd(addDays(new Date(), -(windowDays - 1)));
    const windowLogs = logs.filter((log) => log.date >= start && log.date <= today);
    const value = round2(metricValue(windowLogs, goal.metric));
    const percent = goal.target > 0 ? Math.min(100, Math.round((value / goal.target) * 100)) : 0;
    return {
      id: goal._id,
      title: goal.title,
      metric: goal.metric,
      target: goal.target,
      unit: goal.unit || METRIC_META[goal.metric]?.unit || '',
      period: goal.period,
      active: goal.active,
      current: value,
      percent,
      complete: value >= goal.target,
    };
  });
}

/**
 * Health data for the last N days, plus active goal progress.
 */
async function getHealthOverview(userId, days = 7) {
  const windowDays = Math.min(Math.max(Number(days) || 7, 1), 90);
  const today = ymd();
  const goalStart = ymd(addDays(new Date(), -29));
  const trendStart = ymd(addDays(new Date(), -(windowDays - 1)));
  const start = trendStart < goalStart ? goalStart : trendStart;

  const [logs, goals] = await Promise.all([
    HealthLog.find({ user: userId, date: { $gte: start, $lte: today } })
      .sort({ date: 1 })
      .lean(),
    HealthGoal.find({ user: userId, active: true }).sort({ createdAt: 1 }).lean(),
  ]);

  const logByDate = new Map(logs.map((log) => [log.date, log]));
  const trend = [];
  for (let i = windowDays - 1; i >= 0; i -= 1) {
    const d = addDays(new Date(), -i);
    const key = ymd(d);
    const log = logByDate.get(key);
    trend.push({
      date: key,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      shortDate: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      water: log?.water || 0,
      sleepHours: log?.sleepHours || 0,
      exerciseMinutes: log?.exerciseMinutes || 0,
      mood: log?.mood || null,
      meals: log ? mealCount(log.meals) : 0,
    });
  }

  const windowLogs = logs.filter((log) => log.date >= trendStart && log.date <= today);
  const loggedDays = windowLogs.length;
  const totals = {
    water: round2(metricValue(windowLogs, 'water')),
    sleep: round2(metricValue(windowLogs, 'sleep')),
    exercise: round2(metricValue(windowLogs, 'exercise')),
    meals: round2(metricValue(windowLogs, 'meals')),
  };

  const averages = {
    water: loggedDays ? round1(totals.water / loggedDays) : 0,
    sleep: loggedDays ? round1(totals.sleep / loggedDays) : 0,
    exercise: loggedDays ? Math.round(totals.exercise / loggedDays) : 0,
    meals: loggedDays ? round1(totals.meals / loggedDays) : 0,
    mood: windowLogs.length
      ? round1(windowLogs.reduce((s, l) => s + (l.mood || 0), 0) / windowLogs.length)
      : 0,
  };

  return {
    today: logByDate.get(today) || null,
    logs: logs.filter((log) => log.date >= trendStart).sort((a, b) => (a.date < b.date ? 1 : -1)),
    trend,
    averages,
    totals,
    loggedDays,
    windowDays,
    goals: buildGoalProgress(goals, logs),
  };
}

module.exports = { getHealthOverview, mealCount, METRIC_META };
