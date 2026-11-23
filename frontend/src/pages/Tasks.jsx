import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { useDebounced, useFetch } from '../lib/useFetch';
import {
  PRIORITIES,
  PRIORITY_LABEL,
  RECURRENCE_LABEL,
  TASK_CATEGORIES,
} from '../lib/constants';
import {
  dueInfo,
  formatDateTime,
  formatShortDate,
  fromDateInput,
  toDateInput,
  todayInput,
} from '../lib/format';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingCard,
  PageHeader,
  SectionHeader,
  SegmentedControl,
  SelectField,
  TextField,
} from '../components/ui';
import { Icon } from '../components/Icons';
import TaskModal from '../components/TaskModal';

const priorityTone = { high: 'danger', medium: 'gold', low: 'neutral' };

const VIEW_COPY = {
  today: {
    title: 'Today',
    emptyTitle: 'A clear day',
    emptyText: 'Nothing is due today. Add one small thing, or enjoy the breathing room.',
  },
  upcoming: {
    title: 'Upcoming',
    emptyTitle: 'Nothing scheduled ahead',
    emptyText: 'When you add a task with a future date, it will wait for you here.',
  },
  completed: {
    title: 'Completed',
    emptyTitle: 'No completed tasks yet',
    emptyText: 'Finish a task and it will land here — a quiet record of your progress.',
  },
};

export default function Tasks() {
  const toast = useToast();
  const [tab, setTab] = useState('today');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDate, setQuickDate] = useState(todayInput());
  const [addingQuick, setAddingQuick] = useState(false);
  const [taskModal, setTaskModal] = useState({ open: false, task: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setQuickDate(tab === 'upcoming' ? toDateInput(new Date(Date.now() + 86400000)) : todayInput());
  }, [tab]);

  const taskPath = useMemo(() => {
    const params = new URLSearchParams({ project: 'personal', view: tab });
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    if (priority) params.set('priority', priority);
    if (category) params.set('category', category);
    return `/tasks?${params.toString()}`;
  }, [tab, debouncedSearch, priority, category]);

  const { data, loading, error, reload } = useFetch(taskPath);
  const tasks = data?.tasks || [];
  const stats = data?.stats || { total: 0, completed: 0, dueToday: 0, overdue: 0 };
  const copy = VIEW_COPY[tab];
  const hasFilters = Boolean(search.trim() || priority || category);

  const clearFilters = () => {
    setSearch('');
    setPriority('');
    setCategory('');
  };

  const handleQuickAdd = async (event) => {
    event.preventDefault();
    if (!quickTitle.trim()) return;
    setAddingQuick(true);
    try {
      await api('/tasks', {
        method: 'POST',
        body: {
          title: quickTitle.trim(),
          category: 'Personal',
          priority: 'medium',
          dueDate: fromDateInput(quickDate) || new Date().toISOString(),
        },
      });
      setQuickTitle('');
      toast.success('Task added.');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddingQuick(false);
    }
  };

  const toggleTask = async (task) => {
    try {
      const result = await api(`/tasks/${task._id}/toggle`, { method: 'PATCH' });
      if (result.nextTask) {
        toast.success('Task completed. The next one is scheduled.');
      } else {
        toast.success(task.completed ? 'Task reopened.' : 'Task completed.');
      }
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/tasks/${deleteTarget._id}`, { method: 'DELETE' });
      toast.success('Task deleted.');
      setDeleteTarget(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const summaryText =
    tab === 'completed'
      ? `${stats.total} completed`
      : tab === 'upcoming'
        ? `${stats.total} scheduled`
        : `${stats.total} open${stats.overdue ? ` · ${stats.overdue} overdue` : ''}`;

  return (
    <div className="tasks-page">
      <PageHeader
        eyebrow="Daily tasks"
        title="Small steps, one at a time"
        description="A short list you can actually finish. Recurring tasks will resurface on their own."
        actions={
          <Button icon="plus" onClick={() => setTaskModal({ open: true, task: null })}>
            Add task
          </Button>
        }
      />

      <section className="card tasks-card" aria-labelledby="task-list-title">
        <div className="tasks-toolbar">
          <SegmentedControl
            label="Task view"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'completed', label: 'Completed' },
            ]}
          />
          <div className="tasks-filters">
            <TextField
              label="Search tasks"
              type="search"
              placeholder="Search title, notes, or category…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="tasks-filters__search"
            />
            <SelectField
              label="Priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              options={[
                { value: '', label: 'All priorities' },
                ...PRIORITIES,
              ]}
            />
            <SelectField
              label="Category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              options={[
                { value: '', label: 'All categories' },
                ...TASK_CATEGORIES.map((item) => ({ value: item, label: item })),
              ]}
            />
            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        <form className="quick-add quick-add--prominent" onSubmit={handleQuickAdd}>
          <span className="quick-add__icon" aria-hidden="true">
            <Icon name="sparkles" size={18} />
          </span>
          <label className="sr-only" htmlFor="task-quick-title">
            Quick add a task
          </label>
          <input
            id="task-quick-title"
            className="input quick-add__input"
            placeholder="Get it out of your head — add a task…"
            value={quickTitle}
            onChange={(event) => setQuickTitle(event.target.value)}
            maxLength={200}
          />
          <label className="sr-only" htmlFor="task-quick-date">
            Due date for the new task
          </label>
          <input
            id="task-quick-date"
            className="input quick-add__date"
            type="date"
            value={quickDate}
            onChange={(event) => setQuickDate(event.target.value)}
          />
          <Button type="submit" loading={addingQuick} disabled={!quickTitle.trim()}>
            Add task
          </Button>
        </form>

        <SectionHeader
          title={copy.title}
          description={summaryText}
          action={
            tab === 'completed' && stats.overdue ? (
              <Badge tone="danger">{stats.overdue} overdue</Badge>
            ) : null
          }
        />
        <h2 id="task-list-title" className="sr-only">
          {copy.title} tasks
        </h2>

        {loading ? (
          <LoadingCard rows={6} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : tasks.length ? (
          <ul className="task-list">
            {tasks.map((task) => {
              const due = dueInfo(task.dueDate, { completed: task.completed });
              return (
                <li key={task._id} className={`task-row ${task.completed ? 'is-done' : ''}`}>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task)}
                    aria-label={`Mark ${task.title} as ${task.completed ? 'not done' : 'done'}`}
                  />
                  <div className="task-row__body">
                    <p className="task-row__title">{task.title}</p>
                    <div className="meta-row">
                      <Badge tone={priorityTone[task.priority]}>
                        {PRIORITY_LABEL[task.priority]}
                      </Badge>
                      <span className="meta-text">{task.category}</span>
                      {task.recurrence !== 'none' ? (
                        <span className="meta-text">
                          <Icon name="repeat" size={13} /> {RECURRENCE_LABEL[task.recurrence]}
                        </span>
                      ) : null}
                      {task.reminderAt ? (
                        <span className="meta-text">
                          <Icon name="bell" size={13} /> {formatDateTime(task.reminderAt)}
                        </span>
                      ) : null}
                    </div>
                    {task.notes ? <p className="task-row__notes">{task.notes}</p> : null}
                  </div>
                  <div className="task-row__due">
                    <Badge tone={due.tone}>{due.text}</Badge>
                    {task.completed && task.completedAt ? (
                      <span className="meta-text">Done {formatShortDate(task.completedAt)}</span>
                    ) : null}
                  </div>
                  <div className="row-actions">
                    <IconButton
                      label={`Edit ${task.title}`}
                      icon="pencil"
                      size="sm"
                      onClick={() => setTaskModal({ open: true, task })}
                    />
                    <IconButton
                      label={`Delete ${task.title}`}
                      icon="trash"
                      size="sm"
                      variant="danger"
                      onClick={() => setDeleteTarget(task)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={hasFilters ? 'search' : tab === 'completed' ? 'check' : 'checkSquare'}
            title={hasFilters ? 'No matching tasks' : copy.emptyTitle}
            description={hasFilters ? 'Try a different search or clear the filters.' : copy.emptyText}
            action={
              hasFilters ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : tab !== 'completed' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  icon="plus"
                  onClick={() => setTaskModal({ open: true, task: null })}
                >
                  Add a task
                </Button>
              ) : null
            }
          />
        )}
      </section>

      <TaskModal
        open={taskModal.open}
        task={taskModal.task}
        onClose={() => setTaskModal({ open: false, task: null })}
        onSaved={reload}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this task?"
        description={deleteTarget?.title}
        confirmLabel="Delete task"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
