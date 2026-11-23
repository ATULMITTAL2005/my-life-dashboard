const express = require('express');
const { z } = require('zod');
const Task = require('../models/Task');
const Project = require('../models/Project');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { addDays, addMonths, endOfDay, startOfDay } = require('../utils/dates');

const router = express.Router();
router.use(requireAuth);

const optionalDate = z.union([z.null(), z.coerce.date()]).optional();
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid project.');

const taskSchema = z.object({
  title: z.string().trim().min(1, 'Add a task title.').max(200),
  notes: z.string().trim().max(1000).optional(),
  category: z.string().trim().max(60).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  dueDate: optionalDate,
  reminderAt: optionalDate,
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
  project: z.union([z.null(), objectId]).optional(),
  completed: z.boolean().optional(),
});

const updateSchema = taskSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Nothing to update.',
});

const statusSchema = z.object({ status: z.enum(['todo', 'in_progress', 'done']) });

const priorityRank = { high: 0, medium: 1, low: 2 };

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function syncCompletion(payload) {
  if (payload.completed !== undefined) {
    payload.status = payload.completed ? 'done' : 'todo';
    payload.completedAt = payload.completed ? new Date() : null;
  } else if (payload.status !== undefined) {
    payload.completed = payload.status === 'done';
    payload.completedAt = payload.completed ? new Date() : null;
  }
  return payload;
}

function advanceDate(date, recurrence) {
  if (recurrence === 'daily') return addDays(date, 1);
  if (recurrence === 'weekly') return addDays(date, 7);
  if (recurrence === 'monthly') return addMonths(date, 1);
  return date;
}

async function assertProjectOwned(projectId, userId) {
  if (!projectId) return true;
  const exists = await Project.exists({ _id: projectId, user: userId });
  return Boolean(exists);
}

// GET /api/tasks?view=today|upcoming|completed|all&project=personal|<id>&q=&category=&priority=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { view = 'all', project, q, category, priority } = req.query;
    const filter = { user: req.userId };

    if (project === 'personal') filter.project = null;
    else if (project === 'work') filter.project = { $ne: null };
    else if (project && /^[a-f\d]{24}$/i.test(project)) filter.project = project;

    if (view === 'today') {
      filter.completed = false;
      filter.$or = [{ dueDate: null }, { dueDate: { $lte: endOfDay() } }];
    } else if (view === 'upcoming') {
      filter.completed = false;
      filter.dueDate = { $gt: endOfDay() };
    } else if (view === 'overdue') {
      filter.completed = false;
      filter.dueDate = { $lt: startOfDay() };
    } else if (view === 'completed') {
      filter.completed = true;
    }

    if (category) filter.category = category;
    if (priority && ['low', 'medium', 'high'].includes(priority)) filter.priority = priority;
    if (q && String(q).trim()) {
      const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
      filter.$and = [{ $or: [{ title: rx }, { notes: rx }, { category: rx }] }];
    }

    let tasks = await Task.find(filter).limit(500).lean();

    if (view === 'completed') {
      tasks.sort((a, b) => new Date(b.completedAt || b.updatedAt) - new Date(a.completedAt || a.updatedAt));
    } else if (view === 'upcoming') {
      tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    } else {
      tasks.sort((a, b) => {
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        if (aDue !== bDue) return aDue - bDue;
        return priorityRank[a.priority] - priorityRank[b.priority];
      });
    }

    const todayStart = startOfDay();
    const todayEnd = endOfDay();
    const stats = {
      total: tasks.length,
      completed: tasks.filter((t) => t.completed).length,
      dueToday: tasks.filter(
        (t) => !t.completed && t.dueDate && new Date(t.dueDate) >= todayStart && new Date(t.dueDate) <= todayEnd
      ).length,
      overdue: tasks.filter((t) => !t.completed && t.dueDate && new Date(t.dueDate) < todayStart).length,
    };

    res.json({ tasks, stats });
  })
);

// POST /api/tasks
router.post(
  '/',
  validate(taskSchema),
  asyncHandler(async (req, res) => {
    if (req.body.project && !(await assertProjectOwned(req.body.project, req.userId))) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const payload = syncCompletion({ ...req.body });
    if (!payload.category) payload.category = payload.project ? 'Work' : 'Personal';
    const task = await Task.create({ ...payload, user: req.userId });
    return res.status(201).json({ task, message: 'Task added.' });
  })
);

// PUT /api/tasks/:id
router.put(
  '/:id',
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    if (req.body.project && !(await assertProjectOwned(req.body.project, req.userId))) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const payload = syncCompletion({ ...req.body });
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: payload },
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    return res.json({ task, message: 'Task updated.' });
  })
);

// PATCH /api/tasks/:id/toggle — complete / reopen, creating the next recurrence
router.patch(
  '/:id/toggle',
  asyncHandler(async (req, res) => {
    const task = await Task.findOne({ _id: req.params.id, user: req.userId });
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    let nextTask = null;

    if (!task.completed) {
      task.completed = true;
      task.status = 'done';
      task.completedAt = new Date();
      await task.save();

      if (task.recurrence && task.recurrence !== 'none') {
        const baseDue = task.dueDate || new Date();
        const baseReminder = task.reminderAt || null;
        nextTask = await Task.create({
          user: req.userId,
          project: task.project,
          title: task.title,
          notes: task.notes,
          category: task.category,
          priority: task.priority,
          status: 'todo',
          dueDate: advanceDate(baseDue, task.recurrence),
          reminderAt: baseReminder ? advanceDate(baseReminder, task.recurrence) : null,
          recurrence: task.recurrence,
          completed: false,
        });
      }
    } else {
      task.completed = false;
      task.status = 'todo';
      task.completedAt = null;
      await task.save();
    }

    return res.json({
      task,
      nextTask,
      message: task.completed ? 'Task completed.' : 'Task reopened.',
    });
  })
);

// PATCH /api/tasks/:id/status — used by the Kanban board
router.patch(
  '/:id/status',
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const completed = req.body.status === 'done';
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      {
        $set: {
          status: req.body.status,
          completed,
          completedAt: completed ? new Date() : null,
        },
      },
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    return res.json({ task, message: 'Task moved.' });
  })
);

// DELETE /api/tasks/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const deleted = await Task.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!deleted) return res.status(404).json({ message: 'Task not found.' });
    return res.json({ message: 'Task deleted.' });
  })
);

module.exports = router;
