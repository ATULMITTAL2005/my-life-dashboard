import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { useFetch } from '../lib/useFetch';
import {
  CHART_COLORS,
  DASHBOARD_CARDS,
  MOOD_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
} from '../lib/constants';
import {
  deadlineInfo,
  firstName,
  formatCurrency,
  formatLongToday,
  formatMonth,
  formatShortDate,
  greeting,
} from '../lib/format';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingCard,
  Modal,
  PageHeader,
  ProgressBar,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  Switch,
} from '../components/ui';
import { BarChart, ChartLegend, DonutChart, LineChart } from '../components/charts';
import { Icon } from '../components/Icons';
import TaskModal from '../components/TaskModal';

function SummaryCard({ to, tone, icon, label, value, detail, children }) {
  return (
    <Link to={to} className="summary-card" aria-label={`${label}: ${value}. ${detail}`}>
      <div className="summary-card__top">
        <span className={`icon-tile icon-tile--${tone}`} aria-hidden="true">
          <Icon name={icon} size={18} />
        </span>
        <span className="summary-card__label">{label}</span>
        <Icon name="arrowUpRight" size={16} className="summary-card__arrow" />
      </div>
      <p className="summary-card__value">{value}</p>
      <p className="summary-card__detail">{detail}</p>
      {children}
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <div className="page-header">
        <div className="page-header__text">
          <Skeleton width={180} height={12} />
          <Skeleton width={340} height={38} className="skeleton--gap" radius={12} />
          <Skeleton width={250} height={14} />
        </div>
      </div>
      <div className="summary-grid">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="card" key={index}>
            <LoadingCard rows={3} />
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <div className="chart-duo">
            <div className="card">
              <LoadingCard rows={6} />
            </div>
            <div className="card">
              <LoadingCard rows={6} />
            </div>
          </div>
          <div className="card">
            <LoadingCard rows={5} />
          </div>
        </div>
        <div className="dashboard-side">
          <div className="card">
            <LoadingCard rows={4} />
          </div>
          <div className="card">
            <LoadingCard rows={4} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/dashboard');
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedCards, setSelectedCards] = useState([]);
  const [savingCards, setSavingCards] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [addingQuick, setAddingQuick] = useState(false);
  const [healthMetric, setHealthMetric] = useState('sleepHours');

  const currency = user?.preferences?.currency || 'INR';
  const fmt = (value, options) => formatCurrency(value, currency, options);
  const visibleCards = user?.preferences?.dashboardCards || DASHBOARD_CARDS.map((card) => card.id);

  const openCustomize = () => {
    setSelectedCards(visibleCards);
    setCustomizeOpen(true);
  };

  const saveCards = async () => {
    if (!selectedCards.length) {
      toast.error('Keep at least one summary card visible.');
      return;
    }
    setSavingCards(true);
    try {
      const response = await api('/auth/preferences', {
        method: 'PATCH',
        body: { dashboardCards: selectedCards },
      });
      updateUser(response.user);
      toast.success('Dashboard cards updated.');
      setCustomizeOpen(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingCards(false);
    }
  };

  const handleQuickAdd = async (event) => {
    event.preventDefault();
    if (!quickTitle.trim()) return;
    setAddingQuick(true);
    try {
      const due = new Date();
      due.setHours(23, 59, 0, 0);
      await api('/tasks', {
        method: 'POST',
        body: {
          title: quickTitle.trim(),
          category: 'Personal',
          priority: 'medium',
          dueDate: due.toISOString(),
        },
      });
      setQuickTitle('');
      toast.success('Task added to today.');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddingQuick(false);
    }
  };

  const toggleTask = async (task) => {
    try {
      await api(`/tasks/${task._id}/toggle`, { method: 'PATCH' });
      toast.success(task.completed ? 'Task reopened.' : 'Task completed.');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <>
        <PageHeader
          eyebrow={formatLongToday()}
          title={`${greeting()}, ${firstName(user?.name)}.`}
          description="A calm look at what matters today."
        />
        <ErrorState error={error} onRetry={reload} />
      </>
    );
  }

  const { tasks, deadlines, money, health, taskTrend, reminders } = data;
  const nextDeadline = deadlines.items[0];
  const nextDeadlineInfo = nextDeadline ? deadlineInfo(nextDeadline.deadline) : null;
  const budgetUsed = money.totalBudget
    ? Math.round((money.budgetSpent / money.totalBudget) * 100)
    : 0;
  const todayHealth = health.today;

  const spendingData = (() => {
    const top = money.byCategory.slice(0, 5);
    const rest = money.byCategory.slice(5).reduce((sum, item) => sum + item.total, 0);
    const rows = top.map((item, index) => ({
      label: item.category,
      value: item.total,
      color: CHART_COLORS[index % CHART_COLORS.length],
      formatted: fmt(item.total),
    }));
    if (rest > 0) {
      rows.push({
        label: 'Other',
        value: rest,
        color: CHART_COLORS[5],
        formatted: fmt(rest),
      });
    }
    return rows;
  })();

  const healthMetricConfig = {
    sleepHours: { label: 'Sleep', unit: 'h', color: 'var(--sky)' },
    water: { label: 'Water', unit: 'glasses', color: 'var(--sage)' },
    exerciseMinutes: { label: 'Move', unit: 'min', color: 'var(--clay)' },
  };
  const activeMetric = healthMetricConfig[healthMetric];
  const averageKey =
    healthMetric === 'sleepHours' ? 'sleep' : healthMetric === 'exerciseMinutes' ? 'exercise' : healthMetric;
  const healthTrendData = health.trend.map((day) => ({
    label: day.label,
    value: day[healthMetric],
    title: day.shortDate,
  }));
  const healthHasData = health.trend.some(
    (day) => day.water > 0 || day.sleepHours > 0 || day.exerciseMinutes > 0
  );

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow={formatLongToday()}
        title={`${greeting()}, ${firstName(user?.name)}.`}
        description="A calm look at what matters today. Everything else can wait."
        actions={
          <>
            <Button variant="secondary" icon="sliders" onClick={openCustomize}>
              Customize
            </Button>
            <Button icon="plus" onClick={() => setTaskModalOpen(true)}>
              Add task
            </Button>
          </>
        }
      />

      {reminders.length ? (
        <div className="reminder-banner" role="status">
          <span className="reminder-banner__icon" aria-hidden="true">
            <Icon name="bell" size={18} />
          </span>
          <div className="reminder-banner__text">
            <strong>
              {reminders.length} reminder{reminders.length === 1 ? '' : 's'} need
              {reminders.length === 1 ? 's' : ''} your attention
            </strong>
            <p>{reminders.map((task) => task.title).join(' · ')}</p>
          </div>
          <Link to="/tasks" className="text-link">
            Open tasks <Icon name="arrowRight" size={15} />
          </Link>
        </div>
      ) : null}

      <div className="summary-grid">
        {visibleCards.includes('tasks') ? (
          <SummaryCard
            to="/tasks"
            tone="sage"
            icon="checkSquare"
            label="Today’s tasks"
            value={`${tasks.completedToday} / ${tasks.total}`}
            detail={
              tasks.total
                ? `${tasks.percent}% done · ${tasks.incomplete} left today`
                : 'Nothing scheduled yet'
            }
          >
            <ProgressBar value={tasks.percent} label="Tasks completed today" className="mt-sm" />
          </SummaryCard>
        ) : null}

        {visibleCards.includes('deadlines') ? (
          <SummaryCard
            to="/work"
            tone="gold"
            icon="calendar"
            label="Work deadlines"
            value={nextDeadlineInfo ? nextDeadlineInfo.text : 'All clear'}
            detail={
              nextDeadline
                ? nextDeadline.name
                : `${deadlines.activeProjects} active project${deadlines.activeProjects === 1 ? '' : 's'}`
            }
          >
            {deadlines.overdueCount > 0 ? (
              <Badge tone="danger" className="mt-sm">
                {deadlines.overdueCount} overdue project{deadlines.overdueCount === 1 ? '' : 's'}
              </Badge>
            ) : null}
          </SummaryCard>
        ) : null}

        {visibleCards.includes('money') ? (
          <SummaryCard
            to="/money"
            tone="sky"
            icon="wallet"
            label="Money this month"
            value={fmt(money.expenses)}
            detail={`Income ${fmt(money.income)} · Kept ${fmt(money.savings)}`}
          >
            <span className={`summary-card__delta ${money.savings >= 0 ? 'is-positive' : 'is-negative'}`}>
              <Icon name={money.savings >= 0 ? 'trendUp' : 'trendDown'} size={14} />
              {money.savingsRate}% savings rate
            </span>
          </SummaryCard>
        ) : null}

        {visibleCards.includes('budget') ? (
          <SummaryCard
            to="/money"
            tone="clay"
            icon="target"
            label="Budget left"
            value={money.totalBudget ? fmt(money.remainingBudget) : 'No budgets'}
            detail={
              money.alerts.length
                ? `${money.alerts.length} budget${money.alerts.length === 1 ? '' : 's'} need attention`
                : money.totalBudget
                  ? `Of ${fmt(money.totalBudget)} planned`
                  : 'Set a monthly category budget'
            }
          >
            {money.totalBudget ? (
              <ProgressBar
                value={budgetUsed}
                tone={budgetUsed >= 100 ? 'danger' : budgetUsed >= 80 ? 'gold' : 'sage'}
                label="Budget used"
                className="mt-sm"
              />
            ) : null}
          </SummaryCard>
        ) : null}

        {visibleCards.includes('health') ? (
          <SummaryCard
            to="/health"
            tone="plum"
            icon="heart"
            label="Health today"
            value={todayHealth ? `${todayHealth.water} glasses` : 'Not logged'}
            detail={
              todayHealth
                ? `${todayHealth.sleepHours}h sleep · ${todayHealth.exerciseMinutes} min movement`
                : 'A 30-second check-in is enough'
            }
          >
            {todayHealth ? (
              <span className="summary-card__delta is-muted">
                <Icon name="smile" size={14} />
                Mood: {MOOD_LABEL[todayHealth.mood] || 'Okay'}
              </span>
            ) : null}
          </SummaryCard>
        ) : null}
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <div className="chart-duo">
            <section className="card" aria-labelledby="spending-title">
              <SectionHeader
                title="Where money went"
                description={formatMonth(money.month)}
                action={
                  <Link to="/money" className="text-link">
                    Details <Icon name="arrowRight" size={15} />
                  </Link>
                }
              />
              <h2 id="spending-title" className="sr-only">
                Spending by category
              </h2>
              {spendingData.length ? (
                <div className="donut-layout">
                  <DonutChart
                    data={spendingData}
                    centerValue={fmt(money.expenses, { compact: true })}
                    centerLabel="spent"
                    ariaLabel={`Spending by category for ${formatMonth(money.month)}: ${spendingData
                      .map((item) => `${item.label} ${item.formatted}`)
                      .join(', ')}`}
                  />
                  <ChartLegend items={spendingData} />
                </div>
              ) : (
                <EmptyState
                  icon="wallet"
                  title="No spending yet"
                  description="Add a transaction to see where your money goes."
                  action={
                    <Link to="/money" className="btn btn--secondary btn--sm">
                      Add a transaction
                    </Link>
                  }
                />
              )}
            </section>

            <section className="card" aria-labelledby="momentum-title">
              <SectionHeader
                title="Task momentum"
                description="Completed over the last 7 days"
                action={<Badge tone="sage">{tasks.percent}% today</Badge>}
              />
              <h2 id="momentum-title" className="sr-only">
                Tasks completed over the last seven days
              </h2>
              <BarChart
                data={taskTrend.map((day) => ({ label: day.label, values: [day.count] }))}
                height={186}
                colors={['var(--sage)']}
                showValues
                formatValue={(value) => `${value} task${value === 1 ? '' : 's'}`}
                ariaLabel={`Tasks completed over the last seven days: ${taskTrend
                  .map((day) => `${day.label} ${day.count}`)
                  .join(', ')}`}
              />
              <div className="chart-footnote">
                <span>
                  {tasks.completedToday} of {tasks.total} done today
                </span>
                <ProgressBar value={tasks.percent} label="Tasks completed today" />
              </div>
            </section>
          </div>

          <section className="card" aria-labelledby="focus-title">
            <SectionHeader
              title="Today’s focus"
              description="A short list, not a long one."
              action={
                <Link to="/tasks" className="text-link">
                  All tasks <Icon name="arrowRight" size={15} />
                </Link>
              }
            />
            <h2 id="focus-title" className="sr-only">
              Tasks to focus on today
            </h2>
            <form className="quick-add" onSubmit={handleQuickAdd}>
              <label className="sr-only" htmlFor="dashboard-quick-task">
                Quick add a task for today
              </label>
              <input
                id="dashboard-quick-task"
                className="input"
                placeholder="Quick add a task for today…"
                value={quickTitle}
                onChange={(event) => setQuickTitle(event.target.value)}
                maxLength={200}
              />
              <Button type="submit" icon="plus" loading={addingQuick} disabled={!quickTitle.trim()}>
                Add
              </Button>
            </form>

            {tasks.items.length ? (
              <ul className="focus-list">
                {tasks.items.map((task) => {
                  const due = deadlineInfo(task.dueDate);
                  return (
                    <li key={task._id} className="focus-item">
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={false}
                        onChange={() => toggleTask(task)}
                        aria-label={`Mark ${task.title} as done`}
                      />
                      <div className="focus-item__body">
                        <p className="focus-item__title">{task.title}</p>
                        <div className="meta-row">
                          <Badge tone={due.tone}>{due.text}</Badge>
                          <span className="meta-text">
                            <span className={`priority-dot priority-dot--${task.priority}`} aria-hidden="true" />
                            {PRIORITY_LABEL[task.priority]}
                          </span>
                          <span className="meta-text">{task.category}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon="check"
                title="A clear day"
                description="No tasks are due today. Add one above, or enjoy the breathing room."
              />
            )}
          </section>

          <section className="card" aria-labelledby="health-trend-title">
            <SectionHeader
              title="Health rhythm"
              description="Your last seven days, without judgement"
              action={
                <SegmentedControl
                  label="Health metric"
                  size="sm"
                  options={[
                    { value: 'sleepHours', label: 'Sleep' },
                    { value: 'water', label: 'Water' },
                    { value: 'exerciseMinutes', label: 'Move' },
                  ]}
                  value={healthMetric}
                  onChange={setHealthMetric}
                />
              }
            />
            <h2 id="health-trend-title" className="sr-only">
              Health trend for the last seven days
            </h2>
            {healthHasData ? (
              <>
                <LineChart
                  data={healthTrendData}
                  height={200}
                  color={activeMetric.color}
                  formatValue={(value) => `${value} ${activeMetric.unit}`}
                  ariaLabel={`${activeMetric.label} trend for the last seven days: ${healthTrendData
                    .map((day) => `${day.title} ${day.value} ${activeMetric.unit}`)
                    .join(', ')}`}
                />
                <div className="chart-footnote">
                  <span>
                    Average {health.averages[averageKey]} {activeMetric.unit} per logged day
                  </span>
                  <Link to="/health" className="text-link">
                    Health details <Icon name="arrowRight" size={15} />
                  </Link>
                </div>
              </>
            ) : (
              <EmptyState
                icon="activity"
                title="No check-ins this week"
                description="Log water, sleep, or movement to start seeing your rhythm."
                action={
                  <Link to="/health" className="btn btn--secondary btn--sm">
                    Log today’s check-in
                  </Link>
                }
              />
            )}
          </section>
        </div>

        <aside className="dashboard-side" aria-label="Upcoming and at-a-glance details">
          <section className="card" aria-labelledby="deadlines-title">
            <SectionHeader
              title="Coming up"
              description="Work deadlines"
              action={
                <Link to="/work" className="text-link">
                  Work <Icon name="arrowRight" size={15} />
                </Link>
              }
            />
            <h2 id="deadlines-title" className="sr-only">
              Upcoming work deadlines
            </h2>
            {deadlines.overdueCount > 0 ? (
              <div className="inline-alert inline-alert--danger">
                <Icon name="alert" size={17} />
                <span>
                  {deadlines.overdueCount} project{deadlines.overdueCount === 1 ? '' : 's'} past
                  deadline
                </span>
              </div>
            ) : null}
            {deadlines.items.length ? (
              <ul className="deadline-list">
                {deadlines.items.map((project) => {
                  const info = deadlineInfo(project.deadline);
                  return (
                    <li key={project.id} className="deadline-item">
                      <span className={`project-dot project-dot--${project.color}`} aria-hidden="true" />
                      <div className="deadline-item__body">
                        <p>{project.name}</p>
                        <span>
                          {formatShortDate(project.deadline)} · {STATUS_LABEL[project.status]}
                        </span>
                      </div>
                      <Badge tone={info.tone}>{info.text}</Badge>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon="calendar"
                title="No deadlines ahead"
                description="Your work projects have room to breathe."
              />
            )}
          </section>

          <section className="card" aria-labelledby="budget-watch-title">
            <SectionHeader
              title="Budget watch"
              description={formatMonth(money.month, { short: true })}
              action={
                <Link to="/money" className="text-link">
                  Manage <Icon name="arrowRight" size={15} />
                </Link>
              }
            />
            <h2 id="budget-watch-title" className="sr-only">
              Budget watch
            </h2>
            {money.budgets.length ? (
              <ul className="budget-mini-list">
                {[...money.budgets]
                  .sort((a, b) => b.percent - a.percent)
                  .slice(0, 4)
                  .map((budget) => (
                    <li key={budget.id}>
                      <div className="budget-mini__row">
                        <span>{budget.category}</span>
                        <span className={budget.status === 'over' ? 'text-danger' : ''}>
                          {fmt(budget.spent)} <span className="muted">/ {fmt(budget.amount)}</span>
                        </span>
                      </div>
                      <ProgressBar
                        value={budget.percent}
                        tone={budget.status === 'over' ? 'danger' : budget.status === 'near' ? 'gold' : 'sage'}
                        label={`${budget.category} budget used`}
                        size="sm"
                      />
                    </li>
                  ))}
              </ul>
            ) : (
              <EmptyState
                icon="target"
                title="No budgets set"
                description="Give each spending category a gentle monthly limit."
                action={
                  <Link to="/money" className="btn btn--secondary btn--sm">
                    Create a budget
                  </Link>
                }
              />
            )}
          </section>

          <section className="card" aria-labelledby="health-today-title">
            <SectionHeader
              title="Health today"
              description={todayHealth ? 'Today’s check-in' : 'Not logged yet'}
              action={
                <Link to="/health" className="text-link">
                  Open <Icon name="arrowRight" size={15} />
                </Link>
              }
            />
            <h2 id="health-today-title" className="sr-only">
              Today’s health
            </h2>
            {todayHealth ? (
              <div className="health-snapshot">
                <div className="water-row">
                  <div className="water-dots" aria-hidden="true">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <span key={index} className={index < todayHealth.water ? 'is-filled' : ''} />
                    ))}
                  </div>
                  <span>{todayHealth.water} / 8 glasses</span>
                </div>
                <div className="snapshot-grid">
                  <div>
                    <span className="snapshot-label">
                      <Icon name="moon" size={14} /> Sleep
                    </span>
                    <strong>{todayHealth.sleepHours}h</strong>
                  </div>
                  <div>
                    <span className="snapshot-label">
                      <Icon name="activity" size={14} /> Move
                    </span>
                    <strong>{todayHealth.exerciseMinutes} min</strong>
                  </div>
                  <div>
                    <span className="snapshot-label">
                      <Icon name="smile" size={14} /> Mood
                    </span>
                    <strong>{MOOD_LABEL[todayHealth.mood] || 'Okay'}</strong>
                  </div>
                </div>
                {health.goals.length ? (
                  <div className="goal-mini-list">
                    {health.goals.slice(0, 2).map((goal) => (
                      <div key={goal.id} className="goal-mini">
                        <div className="goal-mini__row">
                          <span>{goal.title}</span>
                          <span>{goal.percent}%</span>
                        </div>
                        <ProgressBar
                          value={goal.percent}
                          tone={goal.complete ? 'sage' : 'gold'}
                          label={goal.title}
                          size="sm"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState
                icon="heart"
                title="A small check-in"
                description="How did you sleep? Did you drink water? It only takes a moment."
                action={
                  <Link to="/health" className="btn btn--secondary btn--sm">
                    Log today
                  </Link>
                }
              />
            )}
          </section>
        </aside>
      </div>

      <Modal
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="Customize your dashboard"
        description="Choose which summary cards appear at the top. Charts and quick actions stay visible."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCustomizeOpen(false)} disabled={savingCards}>
              Cancel
            </Button>
            <Button onClick={saveCards} loading={savingCards}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="switch-list">
          {DASHBOARD_CARDS.map((card) => (
            <Switch
              key={card.id}
              label={card.title}
              description={card.description}
              checked={selectedCards.includes(card.id)}
              onChange={(checked) =>
                setSelectedCards((current) =>
                  checked ? [...current, card.id] : current.filter((id) => id !== card.id)
                )
              }
            />
          ))}
        </div>
      </Modal>

      <TaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSaved={reload}
        defaultDueDate={new Date()}
      />
    </div>
  );
}
