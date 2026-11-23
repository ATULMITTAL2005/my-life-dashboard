import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import {
  PRIORITIES,
  RECURRENCE_OPTIONS,
  TASK_CATEGORIES,
  TASK_STATUSES,
} from '../lib/constants';
import { fromDateInput, fromDateTimeInput, toDateInput, toDateTimeInput } from '../lib/format';
import {
  Button,
  FormAlert,
  Modal,
  SelectField,
  TextField,
  TextareaField,
} from './ui';

export default function TaskModal({
  open,
  onClose,
  task = null,
  projects = null,
  defaultProjectId = '',
  context = 'personal',
  defaultDueDate = '',
  defaultStatus = 'todo',
  onSaved,
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: '',
    notes: '',
    category: 'Personal',
    priority: 'medium',
    status: 'todo',
    dueDate: '',
    reminderAt: '',
    recurrence: 'none',
    project: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const showProject = Array.isArray(projects);
  const showStatus = context === 'work' || Boolean(task?.project) || showProject;

  useEffect(() => {
    if (!open) return;
    setForm({
      title: task?.title || '',
      notes: task?.notes || '',
      category: task?.category || (context === 'work' ? 'Work' : 'Personal'),
      priority: task?.priority || 'medium',
      status: task?.status || defaultStatus,
      dueDate: toDateInput(task?.dueDate || defaultDueDate || new Date()),
      reminderAt: toDateTimeInput(task?.reminderAt || ''),
      recurrence: task?.recurrence || 'none',
      project: task?.project || defaultProjectId || '',
    });
    setErrors({});
    setServerError('');
  }, [open, task, defaultProjectId, context, defaultDueDate, defaultStatus]);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setErrors({ title: 'Add a task title.' });
      return;
    }
    if (showProject && context === 'work' && !form.project) {
      setErrors({ project: 'Choose a project for this work task.' });
      return;
    }

    const payload = {
      title: form.title.trim(),
      notes: form.notes.trim(),
      category: form.category.trim() || 'Personal',
      priority: form.priority,
      dueDate: fromDateInput(form.dueDate),
      reminderAt: fromDateTimeInput(form.reminderAt),
      recurrence: form.recurrence,
    };
    if (showProject) payload.project = form.project || null;
    if (showStatus) payload.status = form.status;

    setSaving(true);
    setServerError('');
    try {
      if (task?._id) {
        await api(`/tasks/${task._id}`, { method: 'PUT', body: payload });
        toast.success('Task updated.');
      } else {
        await api('/tasks', { method: 'POST', body: payload });
        toast.success('Task added.');
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
      title={task ? 'Edit task' : 'Add a task'}
      description={
        showProject
          ? 'Work tasks live inside a project so progress stays accurate.'
          : 'Keep it small and specific — small steps are easier to start.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="task-form" loading={saving}>
            {task ? 'Save task' : 'Add task'}
          </Button>
        </>
      }
    >
      <form id="task-form" className="form-stack" onSubmit={handleSubmit} noValidate>
        <FormAlert>{serverError}</FormAlert>

        <TextField
          label="Task title"
          placeholder="e.g. Finish the monthly expense review"
          value={form.title}
          onChange={update('title')}
          error={errors.title}
          maxLength={200}
          required
        />

        {showProject ? (
          <SelectField
            label="Project"
            placeholder="No project (personal task)"
            options={(projects || []).map((project) => ({ value: project._id, label: project.name }))}
            value={form.project}
            onChange={update('project')}
            error={errors.project}
          />
        ) : null}

        <div className="form-grid">
          <SelectField
            label="Priority"
            options={PRIORITIES}
            value={form.priority}
            onChange={update('priority')}
          />
          <SelectField
            label="Category"
            options={TASK_CATEGORIES}
            value={form.category}
            onChange={update('category')}
            error={errors.category}
          />
        </div>

        {showStatus ? (
          <SelectField
            label="Status"
            options={TASK_STATUSES}
            value={form.status}
            onChange={update('status')}
          />
        ) : null}

        <div className="form-grid">
          <TextField
            label="Due date"
            type="date"
            value={form.dueDate}
            onChange={update('dueDate')}
            error={errors.dueDate}
          />
          <TextField
            label="Reminder"
            type="datetime-local"
            value={form.reminderAt}
            onChange={update('reminderAt')}
            error={errors.reminderAt}
            hint="Optional"
          />
        </div>

        <SelectField
          label="Repeat"
          options={RECURRENCE_OPTIONS}
          value={form.recurrence}
          onChange={update('recurrence')}
          hint="Completing a repeating task creates the next occurrence automatically."
        />

        <TextareaField
          label="Notes"
          placeholder="Any details worth remembering…"
          rows={3}
          value={form.notes}
          onChange={update('notes')}
          maxLength={1000}
          error={errors.notes}
        />
      </form>
    </Modal>
  );
}
