const pad = (value) => String(value).padStart(2, '0');

export function toDateInput(value = new Date()) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toDateTimeInput(value = new Date()) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export function fromDateInput(value) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toISOString();
}

export function fromDateTimeInput(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function todayInput() {
  return toDateInput(new Date());
}

export function monthInput(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function shiftMonth(month, delta) {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(year, m - 1 + delta, 1);
  return monthInput(d);
}

export function monthRange(month) {
  const [year, m] = month.split('-').map(Number);
  const first = new Date(year, m - 1, 1);
  const last = new Date(year, m, 0);
  return { from: toDateInput(first), to: toDateInput(last) };
}

export function formatMonth(month, { short = false } = {}) {
  if (!month) return '';
  const [year, m] = month.split('-').map(Number);
  const d = new Date(year, m - 1, 1);
  return d.toLocaleDateString('en-US', {
    month: short ? 'short' : 'long',
    year: 'numeric',
  });
}

export function formatDate(value, { weekday = false, year = false, short = false } = {}) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    weekday: weekday ? 'short' : undefined,
    day: 'numeric',
    month: short ? 'short' : 'long',
    year: year ? 'numeric' : undefined,
  });
}

export function formatShortDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

export function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function startOfDay(value = new Date()) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysBetween(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / 86400000);
}

/** Human-friendly due date + tone for badges. */
export function dueInfo(value, { completed = false } = {}) {
  if (!value) return { text: 'No due date', tone: 'neutral', days: null };
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return { text: 'No due date', tone: 'neutral', days: null };
  const diff = daysBetween(new Date(), due);

  if (diff < 0) {
    return {
      text: completed ? formatShortDate(due) : `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} overdue`,
      tone: completed ? 'neutral' : 'danger',
      days: diff,
    };
  }
  if (diff === 0) return { text: 'Today', tone: 'gold', days: 0 };
  if (diff === 1) return { text: 'Tomorrow', tone: 'sky', days: 1 };
  if (diff <= 7) return { text: `In ${diff} days`, tone: 'sky', days: diff };
  return { text: formatShortDate(due), tone: 'neutral', days: diff };
}

export function deadlineInfo(value) {
  if (!value) return { text: 'No deadline', tone: 'neutral', days: null };
  const diff = daysBetween(new Date(), new Date(value));
  if (diff < 0) {
    return {
      text: `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} overdue`,
      tone: 'danger',
      days: diff,
    };
  }
  if (diff === 0) return { text: 'Due today', tone: 'gold', days: 0 };
  if (diff === 1) return { text: 'Due tomorrow', tone: 'gold', days: 1 };
  if (diff <= 7) return { text: `${diff} days left`, tone: 'sky', days: diff };
  return { text: formatShortDate(value), tone: 'neutral', days: diff };
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatLongToday(date = new Date()) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

const CURRENCY_LOCALE = { INR: 'en-IN', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB' };

export function formatCurrency(value, currency = 'INR', { compact = false, decimals } = {}) {
  const number = Number(value) || 0;
  const maximumFractionDigits = decimals ?? (compact ? 1 : 0);
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[currency] || 'en-US', {
      style: 'currency',
      currency,
      notation: compact ? 'compact' : 'standard',
      maximumFractionDigits,
      minimumFractionDigits: 0,
    }).format(number);
  } catch {
    return `₹${number.toFixed(0)}`;
  }
}

export function formatNumber(value, options = {}) {
  return new Intl.NumberFormat('en-US', options).format(Number(value) || 0);
}

export function firstName(name = '') {
  return name.trim().split(/\s+/)[0] || 'there';
}
