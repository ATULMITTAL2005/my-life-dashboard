const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Local YYYY-MM-DD (avoids UTC shifting the day). */
function ymd(date = new Date()) {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Local YYYY-MM */
function monthKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function parseMonthKey(value) {
  if (typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    const [year, month] = value.split('-').map(Number);
    return { start: new Date(year, month - 1, 1), end: new Date(year, month, 0, 23, 59, 59, 999) };
  }
  return { start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: endOfDay(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)) };
}

function monthLabel(value) {
  const { start } = parseMonthKey(value);
  return start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

module.exports = { DAY_MS, startOfDay, endOfDay, addDays, addMonths, ymd, monthKey, parseMonthKey, monthLabel };
