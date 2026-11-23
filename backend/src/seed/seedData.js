/* eslint-disable no-console */
const { User } = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Project = require('../models/Project');
const Task = require('../models/Task');
const HealthLog = require('../models/HealthLog');
const HealthGoal = require('../models/HealthGoal');
const { ymd } = require('../utils/dates');

const DEMO_USER = {
  name: 'Atul Sharma',
  email: 'demo@mylifedashboard.app',
  password: 'Demo1234!',
};

const now = new Date();

function daysFromNow(offset, hour = 10, minute = 0) {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function thisMonthDay(day, hour = 10) {
  return new Date(now.getFullYear(), now.getMonth(), Math.min(day, now.getDate()), hour, 0, 0, 0);
}

function monthsAgo(months, day, hour = 10) {
  return new Date(now.getFullYear(), now.getMonth() - months, day, hour, 0, 0, 0);
}

const tx = (type, amount, category, date, paymentMethod, notes = '') => ({
  type,
  amount,
  category,
  date,
  paymentMethod,
  notes,
});

function buildTransactions() {
  const current = [
    tx('income', 85000, 'Salary', thisMonthDay(1, 9), 'bank_transfer', 'Monthly salary'),
    tx('income', 12000, 'Freelance', thisMonthDay(12, 15), 'bank_transfer', 'Landing page project'),
    tx('expense', 18000, 'Rent', thisMonthDay(2, 10), 'bank_transfer', 'Apartment rent'),
    tx('expense', 2450, 'Groceries', thisMonthDay(3, 18), 'card', 'Weekly groceries'),
    tx('expense', 1800, 'Groceries', thisMonthDay(8, 11), 'upi', 'Local market'),
    tx('expense', 1950, 'Groceries', thisMonthDay(15, 19), 'card', 'Supermarket run'),
    tx('expense', 450, 'Dining', thisMonthDay(4, 9), 'upi', 'Coffee and breakfast'),
    tx('expense', 1650, 'Dining', thisMonthDay(9, 20), 'card', 'Dinner with friends'),
    tx('expense', 800, 'Dining', thisMonthDay(16, 13), 'upi', 'Team lunch'),
    tx('expense', 700, 'Dining', thisMonthDay(20, 17), 'cash', 'Weekend cafe'),
    tx('expense', 800, 'Transport', thisMonthDay(5, 8), 'upi', 'Metro card recharge'),
    tx('expense', 550, 'Transport', thisMonthDay(11, 19), 'upi', 'Cab ride home'),
    tx('expense', 450, 'Transport', thisMonthDay(18, 8), 'cash', 'Fuel'),
    tx('expense', 3200, 'Shopping', thisMonthDay(6, 16), 'card', 'Wireless headphones'),
    tx('expense', 2400, 'Shopping', thisMonthDay(17, 14), 'card', 'Running shoes'),
    tx('expense', 1850, 'Utilities', thisMonthDay(7, 10), 'bank_transfer', 'Electricity bill'),
    tx('expense', 1050, 'Utilities', thisMonthDay(10, 10), 'card', 'Internet bill'),
    tx('expense', 450, 'Health', thisMonthDay(13, 12), 'upi', 'Pharmacy'),
    tx('expense', 750, 'Health', thisMonthDay(14, 7), 'card', 'Gym membership'),
    tx('expense', 1200, 'Entertainment', thisMonthDay(19, 20), 'card', 'Concert tickets'),
    tx('expense', 699, 'Subscriptions', thisMonthDay(2, 12), 'card', 'Streaming and music'),
    tx('expense', 900, 'Education', thisMonthDay(21, 15), 'card', 'Design course'),
  ];

  const previous = [];
  for (let m = 1; m <= 5; m += 1) {
    const groceries = 4800 + ((m * 137) % 1800);
    const dining = 2200 + ((m * 211) % 2000);
    const transport = 1400 + ((m * 91) % 900);
    const shopping = 1600 + ((m * 331) % 2600);
    const utilities = 2300 + ((m * 77) % 800);
    const health = 500 + ((m * 53) % 1000);
    const entertainment = 700 + ((m * 97) % 900);

    previous.push(
      tx('income', 85000, 'Salary', monthsAgo(m, 1, 9), 'bank_transfer', 'Monthly salary'),
      tx('income', 4000 + ((m * 61) % 8000), 'Freelance', monthsAgo(m, 14, 16), 'bank_transfer', 'Side project'),
      tx('expense', 18000, 'Rent', monthsAgo(m, 2, 10), 'bank_transfer', 'Apartment rent'),
      tx('expense', groceries, 'Groceries', monthsAgo(m, 6, 18), 'card', 'Monthly groceries'),
      tx('expense', dining, 'Dining', monthsAgo(m, 12, 20), 'card', 'Eating out'),
      tx('expense', transport, 'Transport', monthsAgo(m, 9, 9), 'upi', 'Commute and fuel'),
      tx('expense', shopping, 'Shopping', monthsAgo(m, 17, 15), 'card', 'Household and personal'),
      tx('expense', utilities, 'Utilities', monthsAgo(m, 8, 11), 'bank_transfer', 'Bills'),
      tx('expense', health, 'Health', monthsAgo(m, 19, 12), 'upi', 'Health and wellness'),
      tx('expense', entertainment, 'Entertainment', monthsAgo(m, 22, 19), 'card', 'Leisure')
    );
  }

  return [...current, ...previous];
}

const projectSeeds = [
  {
    name: 'Website redesign',
    description:
      'Refresh the marketing site with a clearer story, faster pages, and a responsive layout for every screen size.',
    priority: 'high',
    status: 'active',
    deadline: daysFromNow(6, 18),
    color: 'sage',
    tasks: [
      { title: 'Audit current site pages', status: 'done', priority: 'medium', dueOffset: -8 },
      { title: 'Wireframe the new dashboard', status: 'done', priority: 'high', dueOffset: -4 },
      { title: 'Build responsive homepage', status: 'in_progress', priority: 'high', dueOffset: 2 },
      { title: 'QA on mobile breakpoints', status: 'todo', priority: 'medium', dueOffset: 5 },
      { title: 'Prepare launch checklist', status: 'todo', priority: 'low', dueOffset: 6 },
    ],
  },
  {
    name: 'Q4 client report',
    description: 'Pull the quarter’s numbers into a concise story for the client review on Friday.',
    priority: 'medium',
    status: 'review',
    deadline: daysFromNow(2, 17),
    color: 'gold',
    tasks: [
      { title: 'Collect Q4 metrics', status: 'done', priority: 'high', dueOffset: -5 },
      { title: 'Draft executive summary', status: 'done', priority: 'medium', dueOffset: -2 },
      { title: 'Design the data slides', status: 'in_progress', priority: 'high', dueOffset: 1 },
      { title: 'Send for client review', status: 'todo', priority: 'high', dueOffset: 2 },
    ],
  },
  {
    name: 'Mobile app launch',
    description: 'Shape the MVP scope and line up the launch plan for the companion mobile app.',
    priority: 'high',
    status: 'planning',
    deadline: daysFromNow(21, 18),
    color: 'sky',
    tasks: [
      { title: 'Define MVP scope', status: 'done', priority: 'high', dueOffset: -3 },
      { title: 'Create launch timeline', status: 'todo', priority: 'medium', dueOffset: 7 },
      { title: 'Brief the design team', status: 'todo', priority: 'medium', dueOffset: 10 },
      { title: 'Set up beta testing', status: 'todo', priority: 'low', dueOffset: 16 },
    ],
  },
  {
    name: 'Portfolio refresh',
    description: 'Update case studies, screenshots, and the résumé before the next round of applications.',
    priority: 'low',
    status: 'completed',
    deadline: daysFromNow(-10, 18),
    color: 'plum',
    tasks: [
      { title: 'Rewrite case study intros', status: 'done', priority: 'medium', dueOffset: -16 },
      { title: 'Export new screenshots', status: 'done', priority: 'low', dueOffset: -14 },
      { title: 'Publish and proofread', status: 'done', priority: 'medium', dueOffset: -11 },
    ],
  },
  {
    name: 'Newsletter series',
    description: 'A short weekly series about calm productivity. Paused until the website launch wraps up.',
    priority: 'medium',
    status: 'paused',
    deadline: daysFromNow(14, 18),
    color: 'clay',
    tasks: [
      { title: 'Outline six issues', status: 'done', priority: 'medium', dueOffset: -6 },
      { title: 'Write issue one', status: 'todo', priority: 'medium', dueOffset: 9 },
      { title: 'Set up the signup page', status: 'todo', priority: 'low', dueOffset: 12 },
    ],
  },
  {
    name: 'Invoice cleanup',
    description: 'Reconcile last month’s invoices and follow up on two outstanding payments.',
    priority: 'medium',
    status: 'active',
    deadline: daysFromNow(-3, 18),
    color: 'clay',
    tasks: [
      { title: 'Reconcile October invoices', status: 'todo', priority: 'high', dueOffset: -3 },
      { title: 'Follow up on pending payments', status: 'todo', priority: 'medium', dueOffset: -1 },
    ],
  },
];

const personalTasks = [
  {
    title: 'Morning walk',
    category: 'Health',
    priority: 'medium',
    dueOffset: 0,
    dueHour: 7,
    completed: true,
    completedHour: 7,
  },
  { title: 'Finish monthly expense review', category: 'Finance', priority: 'high', dueOffset: 0, dueHour: 11 },
  { title: 'Call the dentist', category: 'Health', priority: 'medium', dueOffset: 0, dueHour: 15 },
  { title: 'Buy groceries for the week', category: 'Errands', priority: 'low', dueOffset: 0, dueHour: 18 },
  {
    title: 'Read 20 pages',
    category: 'Learning',
    priority: 'medium',
    dueOffset: 0,
    dueHour: 20,
    reminderHour: 19,
  },
  {
    title: 'Renew gym membership',
    category: 'Health',
    priority: 'high',
    dueOffset: -1,
    dueHour: 9,
    reminderOffset: -1,
    reminderHour: 9,
  },
  { title: 'Plan the weekend trip', category: 'Personal', priority: 'low', dueOffset: 3, dueHour: 17 },
  { title: 'Submit tax documents', category: 'Finance', priority: 'high', dueOffset: 5, dueHour: 12 },
  { title: 'Book laptop service', category: 'Errands', priority: 'medium', dueOffset: 8, dueHour: 16 },
  {
    title: 'Pay electricity bill',
    category: 'Finance',
    priority: 'medium',
    dueOffset: -2,
    dueHour: 10,
    completed: true,
    completedOffset: -2,
  },
  {
    title: 'Weekly review',
    category: 'Personal',
    priority: 'medium',
    dueOffset: -1,
    dueHour: 18,
    completed: true,
    completedOffset: -1,
    recurrence: 'weekly',
  },
  {
    title: 'Water the plants',
    category: 'Home',
    priority: 'low',
    dueOffset: -3,
    dueHour: 8,
    completed: true,
    completedOffset: -3,
  },
  { title: 'Evening stretch', category: 'Health', priority: 'low', dueOffset: 0, dueHour: 20, recurrence: 'daily' },
  {
    title: 'Weekly review and planning',
    category: 'Personal',
    priority: 'medium',
    dueOffset: 4,
    dueHour: 17,
    recurrence: 'weekly',
    reminderHour: 16,
  },
  {
    title: 'Pay rent',
    category: 'Finance',
    priority: 'high',
    dueOffset: 8,
    dueHour: 9,
    recurrence: 'monthly',
    reminderHour: 8,
  },
];

function buildHealthLogs() {
  const logs = [];
  for (let i = 20; i >= 0; i -= 1) {
    const isToday = i === 0;
    const water = isToday ? 6 : 5 + ((i * 3) % 5);
    const sleepHours = isToday ? 7.4 : Math.round((6.4 + ((i * 7) % 20) / 10) * 10) / 10;
    const exerciseMinutes = isToday ? 25 : [0, 25, 15, 40, 0, 30, 20][i % 7];
    const mood = isToday ? 4 : 3 + (i % 3);
    logs.push({
      date: ymd(daysFromNow(-i, 8)),
      water,
      sleepHours,
      exerciseMinutes,
      mood,
      meals: {
        breakfast: true,
        lunch: true,
        dinner: isToday ? true : i % 5 !== 0,
        snacks: isToday ? true : i % 2 === 0,
      },
      notes: i % 6 === 0 ? 'Felt steady and focused today.' : '',
    });
  }
  return logs;
}

async function seedDemoData({ quiet = false } = {}) {
  const log = (...args) => {
    if (!quiet) console.log(...args);
  };

  log('🌱 Seeding demo data…');

  const existing = await User.findOne({ email: DEMO_USER.email });
  if (existing) {
    await Promise.all([
      Transaction.deleteMany({ user: existing._id }),
      Budget.deleteMany({ user: existing._id }),
      Task.deleteMany({ user: existing._id }),
      Project.deleteMany({ user: existing._id }),
      HealthLog.deleteMany({ user: existing._id }),
      HealthGoal.deleteMany({ user: existing._id }),
    ]);
    await User.deleteOne({ _id: existing._id });
    log('   Removed previous demo account and its data.');
  }

  const user = await User.create({
    name: DEMO_USER.name,
    email: DEMO_USER.email,
    passwordHash: DEMO_USER.password,
    preferences: {
      dashboardCards: ['tasks', 'deadlines', 'money', 'budget', 'health'],
      currency: 'INR',
    },
  });

  const transactions = buildTransactions().map((item) => ({ ...item, user: user._id }));
  await Transaction.insertMany(transactions);

  await Budget.insertMany([
    { user: user._id, category: 'Groceries', amount: 8000, month: ymd(now).slice(0, 7) },
    { user: user._id, category: 'Dining', amount: 4000, month: ymd(now).slice(0, 7) },
    { user: user._id, category: 'Transport', amount: 3000, month: ymd(now).slice(0, 7) },
    { user: user._id, category: 'Shopping', amount: 5000, month: ymd(now).slice(0, 7) },
    { user: user._id, category: 'Utilities', amount: 3500, month: ymd(now).slice(0, 7) },
    { user: user._id, category: 'Health', amount: 2500, month: ymd(now).slice(0, 7) },
  ]);

  let taskCount = 0;
  for (const seed of projectSeeds) {
    const project = await Project.create({
      user: user._id,
      name: seed.name,
      description: seed.description,
      priority: seed.priority,
      status: seed.status,
      deadline: seed.deadline,
      color: seed.color,
    });

    const tasks = seed.tasks.map((task) => {
      const completed = task.status === 'done';
      return {
        user: user._id,
        project: project._id,
        title: task.title,
        category: 'Work',
        priority: task.priority,
        status: task.status,
        dueDate: daysFromNow(task.dueOffset, 17),
        completed,
        completedAt: completed ? daysFromNow(Math.min(task.dueOffset, -1), 15) : null,
        recurrence: 'none',
      };
    });
    await Task.insertMany(tasks);
    taskCount += tasks.length;
  }

  const personal = personalTasks.map((task) => ({
    user: user._id,
    project: null,
    title: task.title,
    category: task.category,
    priority: task.priority,
    status: task.completed ? 'done' : 'todo',
    dueDate: daysFromNow(task.dueOffset, task.dueHour ?? 12),
    reminderAt: task.reminderHour !== undefined ? daysFromNow(task.reminderOffset ?? task.dueOffset, task.reminderHour) : null,
    recurrence: task.recurrence || 'none',
    completed: Boolean(task.completed),
    completedAt: task.completed ? daysFromNow(task.completedOffset ?? 0, task.completedHour ?? 12) : null,
  }));
  await Task.insertMany(personal);
  taskCount += personal.length;

  await HealthLog.insertMany(buildHealthLogs().map((entry) => ({ ...entry, user: user._id })));

  await HealthGoal.insertMany([
    { user: user._id, title: 'Drink 8 glasses of water', metric: 'water', target: 8, unit: 'glasses', period: 'daily' },
    { user: user._id, title: 'Sleep 7.5 hours', metric: 'sleep', target: 7.5, unit: 'hours', period: 'daily' },
    { user: user._id, title: 'Move 150 minutes a week', metric: 'exercise', target: 150, unit: 'minutes', period: 'weekly' },
    { user: user._id, title: 'Eat 3 balanced meals', metric: 'meals', target: 3, unit: 'meals', period: 'daily' },
    { user: user._id, title: 'Keep a steady mood', metric: 'mood', target: 4, unit: 'avg mood', period: 'daily' },
  ]);

  log(`   Demo user: ${DEMO_USER.email} / ${DEMO_USER.password}`);
  log(`   ${transactions.length} transactions, 6 budgets, ${projectSeeds.length} projects, ${taskCount} tasks`);
  log(`   ${buildHealthLogs().length} health check-ins, 5 health goals`);
  log('🌿 Seed data ready.');

  return { user, email: DEMO_USER.email, password: DEMO_USER.password };
}

module.exports = { seedDemoData, DEMO_USER };
