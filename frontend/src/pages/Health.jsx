import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { useFetch } from '../lib/useFetch';
import { GOAL_METRICS, MEALS, MOODS, MOOD_LABEL } from '../lib/constants';
import { formatDate, formatLongToday, todayInput } from '../lib/format';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FormAlert,
  IconButton,
  InsetNote,
  LoadingCard,
  Modal,
  PageHeader,
  ProgressBar,
  SectionHeader,
  SegmentedControl,
  SelectField,
  TextField,
  TextareaField,
} from '../components/ui';
import { BarChart, LineChart, ProgressRing } from '../components/charts';
import { Icon } from '../components/Icons';

const EMPTY_MEALS = { breakfast: false, lunch: false, dinner: false, snacks: false };
const EMPTY_FORM = {
  water: 0,
  sleepHours: 0,
  exerciseMinutes: 0,
  mood: 3,
  meals: { ...EMPTY_MEALS },
  notes: '',
};

const TREND_METRICS = [
  { value: 'water', label: 'Water', unit: 'glasses', color: 'var(--sage)', chart: 'bar' },
  { value: 'sleepHours', label: 'Sleep', unit: 'hours', color: 'var(--sky)', chart: 'line' },
  { value: 'exerciseMinutes', label: 'Exercise', unit: 'min', color: 'var(--clay)', chart: 'bar' },
  { value: 'mood', label: 'Mood', unit: '/ 5', color: 'var(--plum)', chart: 'line' },
  { value: 'meals', label: 'Meals', unit: 'meals', color: 'var(--gold)', chart: 'bar' },
];

function mealCount(meals = {}) {
  return [meals.breakfast, meals.lunch, meals.dinner, meals.snacks].filter(Boolean).length;
}

function logDate(value) {
  return new Date(`${value}T12:00:00`);
}

function GoalModal({ open, onClose, goal, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ title: '', metric: 'water', target: '8', period: 'daily' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      title: goal?.title || '',
      metric: goal?.metric || 'water',
      target: goal ? String(goal.target) : '8',
      period: goal?.period || 'daily',
    });
    setErrors({});
    setServerError('');
  }, [open, goal]);

  const metricMeta = GOAL_METRICS.find((metric) => metric.value === form.metric) || GOAL_METRICS[0];

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const next = {};
    if (form.title.trim().length < 2) next.title = 'Give the goal a title.';
    if (!form.target || Number(form.target) <= 0) next.target = 'Set a target greater than zero.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setServerError('');
    try {
      const payload = {
        title: form.title.trim(),
        metric: form.metric,
        target: Number(form.target),
        unit: metricMeta.unit,
        period: form.period,
      };
      if (goal?._id || goal?.id) {
        await api(`/health/goals/${goal.id || goal._id}`, { method: 'PUT', body: payload });
        toast.success('Goal updated.');
      } else {
        await api('/health/goals', { method: 'POST', body: payload });
        toast.success('Goal created.');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setServerError(err.message);
      if (err.errors) setErrors(err.errors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={goal ? 'Edit health goal' : 'Set a health goal'}
      description="Choose a target that feels kind, not punishing."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="goal-form" loading={saving}>
            {goal ? 'Save goal' : 'Create goal'}
          </Button>
        </>
      }
    >
      <form id="goal-form" className="form-stack" onSubmit={handleSubmit} noValidate>
        <FormAlert>{serverError}</FormAlert>

        <TextField
          label="Goal title"
          placeholder="e.g. Drink more water"
          value={form.title}
          onChange={update('title')}
          error={errors.title}
          maxLength={120}
          required
        />

        <div className="form-grid">
          <SelectField
            label="Metric"
            options={GOAL_METRICS}
            value={form.metric}
            onChange={update('metric')}
          />
          <TextField
            label="Target"
            type="number"
            min="0.1"
            step="0.1"
            value={form.target}
            onChange={update('target')}
            error={errors.target}
            hint={`Measured in ${metricMeta.unit}`}
            required
          />
        </div>

        <SelectField
          label="Period"
          options={[
            { value: 'daily', label: 'Every day' },
            { value: 'weekly', label: 'Every week' },
            { value: 'monthly', label: 'Every month' },
          ]}
          value={form.period}
          onChange={update('period')}
        />
      </form>
    </Modal>
  );
}

function HealthLogModal({ open, onClose, log, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ ...EMPTY_FORM, date: todayInput() });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      date: log?.date || todayInput(),
      water: log?.water ?? 0,
      sleepHours: log?.sleepHours ?? 0,
      exerciseMinutes: log?.exerciseMinutes ?? 0,
      mood: log?.mood ?? 3,
      meals: { ...EMPTY_MEALS, ...(log?.meals || {}) },
      notes: log?.notes || '',
    });
    setErrors({});
    setServerError('');
  }, [open, log]);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setServerError('');
  };

  const toggleMeal = (key) => {
    setForm((current) => ({
      ...current,
      meals: { ...current.meals, [key]: !current.meals[key] },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.date) {
      setErrors({ date: 'Choose a date.' });
      return;
    }
    setSaving(true);
    setServerError('');
    try {
      const payload = {
        date: form.date,
        water: Number(form.water) || 0,
        sleepHours: Number(form.sleepHours) || 0,
        exerciseMinutes: Number(form.exerciseMinutes) || 0,
        mood: Number(form.mood) || 3,
        meals: form.meals,
        notes: form.notes.trim(),
      };
      if (log?._id) {
        await api(`/health/logs/${log._id}`, { method: 'PUT', body: payload });
        toast.success('Health entry updated.');
      } else {
        await api('/health/logs', { method: 'POST', body: payload });
        toast.success('Health entry saved.');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setServerError(err.message);
      if (err.errors) setErrors(err.errors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={log ? 'Edit health entry' : 'Log a health entry'}
      description="Update any day — your history should stay honest and flexible."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="health-log-form" loading={saving}>
            Save entry
          </Button>
        </>
      }
    >
      <form id="health-log-form" className="form-stack" onSubmit={handleSubmit} noValidate>
        <FormAlert>{serverError}</FormAlert>

        <TextField
          label="Date"
          type="date"
          value={form.date}
          onChange={update('date')}
          error={errors.date}
          max={todayInput()}
          required
        />

        <div className="form-grid form-grid--three">
          <TextField
            label="Water"
            type="number"
            min="0"
            max="30"
            value={form.water}
            onChange={update('water')}
            error={errors.water}
            hint="Glasses"
          />
          <TextField
            label="Sleep"
            type="number"
            min="0"
            max="24"
            step="0.1"
            value={form.sleepHours}
            onChange={update('sleepHours')}
            error={errors.sleepHours}
            hint="Hours"
          />
          <TextField
            label="Exercise"
            type="number"
            min="0"
            max="600"
            step="1"
            value={form.exerciseMinutes}
            onChange={update('exerciseMinutes')}
            error={errors.exerciseMinutes}
            hint="Minutes"
          />
        </div>

        <fieldset className="field">
          <legend>Mood</legend>
          <div className="mood-grid">
            {MOODS.map((mood) => (
              <label
                key={mood.value}
                className={`mood-option ${Number(form.mood) === mood.value ? 'is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="log-mood"
                  value={mood.value}
                  checked={Number(form.mood) === mood.value}
                  onChange={update('mood')}
                  className="sr-only"
                />
                <span aria-hidden="true">{mood.emoji}</span>
                <span>{mood.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Meals</legend>
          <div className="check-chip-row">
            {MEALS.map((meal) => (
              <label key={meal.key} className="check-chip">
                <input
                  type="checkbox"
                  className="checkbox checkbox--sm"
                  checked={Boolean(form.meals[meal.key])}
                  onChange={() => toggleMeal(meal.key)}
                />
                {meal.label}
              </label>
            ))}
          </div>
        </fieldset>

        <TextareaField
          label="Notes"
          rows={2}
          placeholder="Anything worth remembering?"
          value={form.notes}
          onChange={update('notes')}
          maxLength={500}
        />
      </form>
    </Modal>
  );
}

export default function Health() {
  const toast = useToast();
  const [range, setRange] = useState(7);
  const [metric, setMetric] = useState('water');
  const [form, setForm] = useState({ ...EMPTY_FORM, meals: { ...EMPTY_MEALS } });
  const [savingToday, setSavingToday] = useState(false);
  const [goalModal, setGoalModal] = useState({ open: false, goal: null });
  const [logModal, setLogModal] = useState({ open: false, log: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { data, loading, error, reload } = useFetch(`/health/overview?days=${range}`);

  useEffect(() => {
    if (!data) return;
    const today = data.today;
    setForm({
      water: today?.water ?? 0,
      sleepHours: today?.sleepHours ?? 0,
      exerciseMinutes: today?.exerciseMinutes ?? 0,
      mood: today?.mood ?? 3,
      meals: { ...EMPTY_MEALS, ...(today?.meals || {}) },
      notes: today?.notes || '',
    });
  }, [data?.today]);

  const activeMetric = TREND_METRICS.find((item) => item.value === metric) || TREND_METRICS[0];
  const logs = data?.logs || [];
  const goals = data?.goals || [];

  const trendChart = useMemo(() => {
    if (!data) return { data: [], empty: true };
    if (metric === 'mood') {
      const rows = data.trend
        .filter((day) => day.mood != null)
        .map((day) => ({
          label: range === 7 ? day.label : day.shortDate,
          value: day.mood,
          title: day.shortDate,
        }));
      return { data: rows, empty: rows.length === 0 };
    }
    if (metric === 'meals') {
      const rows = data.trend.map((day) => ({
        label: range === 7 ? day.label : day.shortDate,
        values: [day.meals],
        title: day.shortDate,
      }));
      return { data: rows, empty: rows.every((row) => row.values[0] === 0) };
    }
    const rows = data.trend.map((day) => ({
      label: range === 7 ? day.label : day.shortDate,
      value: day[metric],
      title: day.shortDate,
    }));
    return { data: rows, empty: rows.every((row) => !row.value) };
  }, [data, metric, range]);

  const handleTodaySave = async (event) => {
    event.preventDefault();
    setSavingToday(true);
    try {
      await api('/health/logs', {
        method: 'POST',
        body: {
          date: todayInput(),
          water: Number(form.water) || 0,
          sleepHours: Number(form.sleepHours) || 0,
          exerciseMinutes: Number(form.exerciseMinutes) || 0,
          mood: Number(form.mood) || 3,
          meals: form.meals,
          notes: form.notes.trim(),
        },
      });
      toast.success(data?.today ? 'Today’s check-in updated.' : 'Today’s check-in saved.');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingToday(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === 'goal') {
        await api(`/health/goals/${deleteTarget.item.id || deleteTarget.item._id}`, {
          method: 'DELETE',
        });
        toast.success('Goal deleted.');
      } else {
        await api(`/health/logs/${deleteTarget.item._id}`, { method: 'DELETE' });
        toast.success('Health entry deleted.');
      }
      setDeleteTarget(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const updateField = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const toggleMeal = (key) => {
    setForm((current) => ({
      ...current,
      meals: { ...current.meals, [key]: !current.meals[key] },
    }));
  };

  const adjustWater = (delta) => {
    setForm((current) => ({
      ...current,
      water: Math.max(0, Math.min(30, Number(current.water) + delta)),
    }));
  };

  const periodLabel = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

  if (loading && !data) {
    return (
      <div className="health-page" aria-busy="true">
        <PageHeader eyebrow="Health" title="Your body, in a kinder light" />
        <div className="health-top-grid">
          <div className="card">
            <LoadingCard rows={7} />
          </div>
          <div className="card">
            <LoadingCard rows={7} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="health-page">
        <PageHeader
          eyebrow="Health"
          title="Your body, in a kinder light"
          description="Small daily signals, private to you."
        />
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="health-page">
      <PageHeader
        eyebrow="Health"
        title="Your body, in a kinder light"
        description="Notice the pattern, not the perfection. Every entry is private to your account."
        actions={
          <Button icon="plus" onClick={() => setGoalModal({ open: true, goal: null })}>
            Set a goal
          </Button>
        }
      />

      <div className="health-top-grid">
        <section className="card" aria-labelledby="checkin-title">
          <SectionHeader
            title="Today’s check-in"
            description={formatLongToday()}
            action={
              data.today ? <Badge tone="sage">Saved</Badge> : <Badge tone="neutral">Not logged</Badge>
            }
          />
          <h2 id="checkin-title" className="sr-only">
            Today’s health check-in
          </h2>

          <form className="health-form" onSubmit={handleTodaySave}>
            <div className="water-block">
              <div className="water-block__header">
                <span className="field__label">
                  <Icon name="droplet" size={16} /> Water
                </span>
                <div className="water-stepper">
                  <button
                    type="button"
                    className="icon-btn icon-btn--soft"
                    onClick={() => adjustWater(-1)}
                    aria-label="Remove one glass of water"
                    disabled={Number(form.water) <= 0}
                  >
                    <Icon name="minus" size={16} />
                  </button>
                  <span className="water-stepper__value" aria-live="polite">
                    {form.water} <small>glasses</small>
                  </span>
                  <button
                    type="button"
                    className="icon-btn icon-btn--soft"
                    onClick={() => adjustWater(1)}
                    aria-label="Add one glass of water"
                  >
                    <Icon name="plus" size={16} />
                  </button>
                </div>
              </div>
              <div className="water-dots water-dots--lg" aria-hidden="true">
                {Array.from({ length: 8 }).map((_, index) => (
                  <span key={index} className={index < Number(form.water) ? 'is-filled' : ''} />
                ))}
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="sleep-hours">Sleep</label>
                <div className="input-suffix">
                  <input
                    id="sleep-hours"
                    className="input"
                    type="number"
                    min="0"
                    max="24"
                    step="0.1"
                    value={form.sleepHours}
                    onChange={updateField('sleepHours')}
                  />
                  <span>hours</span>
                </div>
              </div>
              <div className="field">
                <label htmlFor="exercise-minutes">Movement</label>
                <div className="input-suffix">
                  <input
                    id="exercise-minutes"
                    className="input"
                    type="number"
                    min="0"
                    max="600"
                    step="1"
                    value={form.exerciseMinutes}
                    onChange={updateField('exerciseMinutes')}
                  />
                  <span>min</span>
                </div>
              </div>
            </div>

            <fieldset className="field">
              <legend>Mood</legend>
              <div className="mood-grid">
                {MOODS.map((mood) => (
                  <label
                    key={mood.value}
                    className={`mood-option ${Number(form.mood) === mood.value ? 'is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="today-mood"
                      value={mood.value}
                      checked={Number(form.mood) === mood.value}
                      onChange={updateField('mood')}
                      className="sr-only"
                    />
                    <span aria-hidden="true">{mood.emoji}</span>
                    <span>{mood.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="field">
              <legend>Meals</legend>
              <div className="check-chip-row">
                {MEALS.map((meal) => (
                  <label key={meal.key} className="check-chip">
                    <input
                      type="checkbox"
                      className="checkbox checkbox--sm"
                      checked={Boolean(form.meals[meal.key])}
                      onChange={() => toggleMeal(meal.key)}
                    />
                    {meal.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="field">
              <label htmlFor="health-notes">Notes</label>
              <textarea
                id="health-notes"
                className="input textarea"
                rows={2}
                placeholder="Optional — how did the day feel?"
                value={form.notes}
                onChange={updateField('notes')}
                maxLength={500}
              />
            </div>

            <Button type="submit" loading={savingToday} className="btn--block">
              {data.today ? 'Update today’s check-in' : 'Save today’s check-in'}
            </Button>
          </form>

          <InsetNote icon="lock" title="Private by design" tone="sage">
            Your health entries are stored against your account only. No one else can see or edit them.
          </InsetNote>
        </section>

        <section className="card" aria-labelledby="goals-title">
          <SectionHeader
            title="Your goals"
            description="Daily, weekly, and monthly progress"
            action={
              <Button
                variant="secondary"
                size="sm"
                icon="plus"
                onClick={() => setGoalModal({ open: true, goal: null })}
              >
                Add
              </Button>
            }
          />
          <h2 id="goals-title" className="sr-only">
            Health goals
          </h2>

          {goals.length ? (
            <ul className="goal-list">
              {goals.map((goal) => (
                <li key={goal.id} className="goal-card">
                  <ProgressRing
                    value={goal.percent}
                    size={66}
                    stroke={7}
                    color={goal.complete ? 'var(--sage)' : 'var(--gold)'}
                    label={`${goal.title}: ${goal.percent}% complete`}
                  >
                    <strong>{goal.percent}%</strong>
                  </ProgressRing>
                  <div className="goal-card__body">
                    <div className="goal-card__top">
                      <p>{goal.title}</p>
                      <div className="row-actions">
                        <IconButton
                          label={`Edit ${goal.title}`}
                          icon="pencil"
                          size="sm"
                          onClick={() => setGoalModal({ open: true, goal })}
                        />
                        <IconButton
                          label={`Delete ${goal.title}`}
                          icon="trash"
                          size="sm"
                          variant="danger"
                          onClick={() => setDeleteTarget({ kind: 'goal', item: goal })}
                        />
                      </div>
                    </div>
                    <span className="meta-text">
                      {periodLabel[goal.period]} · {goal.current} of {goal.target} {goal.unit}
                    </span>
                    <ProgressBar
                      value={goal.percent}
                      tone={goal.complete ? 'sage' : 'gold'}
                      label={`${goal.title} progress`}
                      size="sm"
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon="target"
              title="No goals yet"
              description="Set one gentle target — water, sleep, movement, meals, or mood."
              action={
                <Button
                  size="sm"
                  icon="plus"
                  onClick={() => setGoalModal({ open: true, goal: null })}
                >
                  Set a goal
                </Button>
              }
            />
          )}
        </section>
      </div>

      <section className="card" aria-labelledby="trends-title">
        <SectionHeader
          title="Trends"
          description={`Your last ${range} days`}
          action={
            <div className="trend-actions">
              <SegmentedControl
                label="Health metric"
                size="sm"
                value={metric}
                onChange={setMetric}
                options={TREND_METRICS.map((item) => ({ value: item.value, label: item.label }))}
              />
              <SegmentedControl
                label="Date range"
                size="sm"
                value={range}
                onChange={setRange}
                options={[
                  { value: 7, label: '7 days' },
                  { value: 30, label: '30 days' },
                ]}
              />
            </div>
          }
        />
        <h2 id="trends-title" className="sr-only">
          Health trends
        </h2>

        <div className="health-averages">
          <div>
            <span className="snapshot-label">
              <Icon name="droplet" size={14} /> Water
            </span>
            <strong>{data.averages.water}</strong>
            <span>glasses / day</span>
          </div>
          <div>
            <span className="snapshot-label">
              <Icon name="moon" size={14} /> Sleep
            </span>
            <strong>{data.averages.sleep}</strong>
            <span>hours / day</span>
          </div>
          <div>
            <span className="snapshot-label">
              <Icon name="activity" size={14} /> Movement
            </span>
            <strong>{data.averages.exercise}</strong>
            <span>min / day</span>
          </div>
          <div>
            <span className="snapshot-label">
              <Icon name="smile" size={14} /> Mood
            </span>
            <strong>{data.averages.mood || '—'}</strong>
            <span>out of 5</span>
          </div>
        </div>

        {trendChart.empty ? (
          <EmptyState
            icon="activity"
            title="Not enough entries yet"
            description={`Log ${activeMetric.label.toLowerCase()} for a few days and the pattern will appear here.`}
          />
        ) : activeMetric.chart === 'line' ? (
          <LineChart
            data={trendChart.data}
            height={220}
            color={activeMetric.color}
            formatValue={(value) => `${value} ${activeMetric.unit}`}
            ariaLabel={`${activeMetric.label} trend over the last ${range} days`}
          />
        ) : (
          <BarChart
            data={trendChart.data}
            height={220}
            colors={[activeMetric.color]}
            showValues={range === 7}
            formatValue={(value) => `${value} ${activeMetric.unit}`}
            ariaLabel={`${activeMetric.label} over the last ${range} days`}
          />
        )}
      </section>

      <section className="card" aria-labelledby="history-title">
        <SectionHeader
          title="Your history"
          description={`${logs.length} check-in${logs.length === 1 ? '' : 's'} in this view`}
          action={
            <Button
              variant="secondary"
              size="sm"
              icon="plus"
              onClick={() => setLogModal({ open: true, log: null })}
            >
              Log another day
            </Button>
          }
        />
        <h2 id="history-title" className="sr-only">
          Health history
        </h2>

        {logs.length ? (
          <ul className="health-history">
            {logs.map((log) => (
              <li key={log._id} className="health-history__row">
                <div className="health-history__date">
                  <strong>{formatDate(logDate(log.date), { weekday: true, short: true })}</strong>
                  <span>{log.notes || 'No notes'}</span>
                </div>
                <div className="health-history__metrics">
                  <span title="Water">
                    <Icon name="droplet" size={14} /> {log.water}
                  </span>
                  <span title="Sleep">
                    <Icon name="moon" size={14} /> {log.sleepHours}h
                  </span>
                  <span title="Exercise">
                    <Icon name="activity" size={14} /> {log.exerciseMinutes}m
                  </span>
                  <span title="Mood">
                    <Icon name="smile" size={14} /> {MOOD_LABEL[log.mood]}
                  </span>
                  <span title="Meals">
                    <Icon name="utensils" size={14} /> {mealCount(log.meals)}/4
                  </span>
                </div>
                <div className="row-actions">
                  <IconButton
                    label={`Edit health entry for ${log.date}`}
                    icon="pencil"
                    size="sm"
                    onClick={() => setLogModal({ open: true, log })}
                  />
                  <IconButton
                    label={`Delete health entry for ${log.date}`}
                    icon="trash"
                    size="sm"
                    variant="danger"
                    onClick={() => setDeleteTarget({ kind: 'log', item: log })}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon="heart"
            title="No entries yet"
            description="Start with today’s check-in above, or add an earlier day."
            action={
              <Button
                size="sm"
                icon="plus"
                onClick={() => setLogModal({ open: true, log: null })}
              >
                Log an entry
              </Button>
            }
          />
        )}
      </section>

      <GoalModal
        open={goalModal.open}
        goal={goalModal.goal}
        onClose={() => setGoalModal({ open: false, goal: null })}
        onSaved={reload}
      />

      <HealthLogModal
        open={logModal.open}
        log={logModal.log}
        onClose={() => setLogModal({ open: false, log: null })}
        onSaved={reload}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={
          deleteTarget?.kind === 'goal' ? 'Delete this goal?' : 'Delete this health entry?'
        }
        description={
          deleteTarget?.kind === 'goal'
            ? deleteTarget.item.title
            : deleteTarget?.item
              ? `${formatDate(logDate(deleteTarget.item.date), { short: true })} · water, sleep, mood, and meals`
              : ''
        }
        confirmLabel={deleteTarget?.kind === 'goal' ? 'Delete goal' : 'Delete entry'}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
