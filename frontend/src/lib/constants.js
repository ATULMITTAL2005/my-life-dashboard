export const DASHBOARD_CARDS = [
  {
    id: 'tasks',
    title: 'Today’s tasks',
    description: 'Your personal task progress for today.',
  },
  {
    id: 'deadlines',
    title: 'Work deadlines',
    description: 'Upcoming project deadlines and overdue work.',
  },
  {
    id: 'money',
    title: 'Money this month',
    description: 'Income, spending, and what you kept.',
  },
  {
    id: 'budget',
    title: 'Budget status',
    description: 'How much of this month’s budget is left.',
  },
  {
    id: 'health',
    title: 'Health today',
    description: 'Water, sleep, movement, and mood.',
  },
];

export const PRIORITIES = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };
export const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

export const PROJECT_STATUSES = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'In progress' },
  { value: 'review', label: 'In review' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
];

export const STATUS_LABEL = {
  planning: 'Planning',
  active: 'In progress',
  review: 'In review',
  paused: 'Paused',
  completed: 'Completed',
};

export const STATUS_TONE = {
  planning: 'sky',
  active: 'sage',
  review: 'gold',
  paused: 'neutral',
  completed: 'plum',
};

export const PROJECT_COLORS = [
  { value: 'sage', label: 'Sage' },
  { value: 'clay', label: 'Clay' },
  { value: 'gold', label: 'Honey' },
  { value: 'sky', label: 'Sky' },
  { value: 'plum', label: 'Plum' },
];

export const TASK_STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

export const PAYMENT_METHODS = [
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'other', label: 'Other' },
];

export const PAYMENT_LABEL = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label]));

export const EXPENSE_CATEGORIES = [
  'Groceries',
  'Dining',
  'Transport',
  'Shopping',
  'Utilities',
  'Health',
  'Entertainment',
  'Subscriptions',
  'Rent',
  'Education',
  'Travel',
  'Gifts',
  'Other',
];

export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Interest', 'Gifts', 'Other'];

export const TASK_CATEGORIES = [
  'Personal',
  'Health',
  'Finance',
  'Errands',
  'Home',
  'Learning',
  'Work',
  'Other',
];

export const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
];

export const RECURRENCE_LABEL = {
  none: '',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export const MOODS = [
  { value: 1, label: 'Low', emoji: '😔' },
  { value: 2, label: 'Meh', emoji: '😕' },
  { value: 3, label: 'Okay', emoji: '🙂' },
  { value: 4, label: 'Good', emoji: '😊' },
  { value: 5, label: 'Great', emoji: '😄' },
];

export const MOOD_LABEL = Object.fromEntries(MOODS.map((m) => [m.value, m.label]));

export const MEALS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snacks' },
];

export const HEALTH_METRICS = [
  { value: 'water', label: 'Water', unit: 'glasses' },
  { value: 'sleepHours', label: 'Sleep', unit: 'hours' },
  { value: 'exerciseMinutes', label: 'Exercise', unit: 'min' },
  { value: 'mood', label: 'Mood', unit: '/ 5' },
  { value: 'meals', label: 'Meals', unit: 'meals' },
];

export const GOAL_METRICS = [
  { value: 'water', label: 'Water', unit: 'glasses' },
  { value: 'sleep', label: 'Sleep', unit: 'hours' },
  { value: 'exercise', label: 'Exercise', unit: 'minutes' },
  { value: 'meals', label: 'Meals', unit: 'meals' },
  { value: 'mood', label: 'Mood', unit: 'avg mood' },
];

export const CURRENCIES = [
  { value: 'INR', label: 'Indian rupee (₹)' },
  { value: 'USD', label: 'US dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British pound (£)' },
];

export const CHART_COLORS = ['#4f8f74', '#c1913f', '#557c9b', '#c06b4f', '#7c647d', '#8a9a7b', '#a9a29a'];
