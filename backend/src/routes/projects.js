const express = require('express');
const { z } = require('zod');
const Project = require('../models/Project');
const Task = require('../models/Task');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.use(requireAuth);

const optionalDate = z.union([z.null(), z.coerce.date()]).optional();

const projectSchema = z.object({
  name: z.string().trim().min(2, 'Give the project a name.').max(120),
  description: z.string().trim().max(1000).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['planning', 'active', 'review', 'completed', 'paused']).optional(),
  deadline: optionalDate,
  color: z.enum(['sage', 'clay', 'gold', 'sky', 'plum']).optional(),
});

const updateSchema = projectSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Nothing to update.',
});

/** Attach task totals/progress to project documents. */
async function withProgress(userId, projects) {
  const ids = projects.map((p) => p._id);
  if (!ids.length) return [];
  const now = new Date();
  const rows = await Task.aggregate([
    { $match: { user: userId, project: { $in: ids } } },
    {
      $group: {
        _id: '$project',
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $or: ['$completed', { $eq: ['$status', 'done'] }] }, 1, 0] },
        },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$dueDate', null] },
                  { $lt: ['$dueDate', now] },
                  { $eq: ['$completed', false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const byProject = new Map(rows.map((row) => [String(row._id), row]));
  return projects.map((project) => {
    const stats = byProject.get(String(project._id)) || { total: 0, completed: 0, overdue: 0 };
    return {
      ...project,
      totalTasks: stats.total,
      completedTasks: stats.completed,
      overdueTasks: stats.overdue,
      progress: stats.total ? Math.round((stats.completed / stats.total) * 100) : 0,
    };
  });
}

// GET /api/projects
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const projects = await Project.find({ user: req.userId }).lean();
    const decorated = await withProgress(req.userId, projects);

    const statusRank = { active: 0, review: 1, planning: 2, paused: 3, completed: 4 };
    decorated.sort((a, b) => {
      if (statusRank[a.status] !== statusRank[b.status]) return statusRank[a.status] - statusRank[b.status];
      if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const counts = { all: decorated.length, overdue: 0 };
    for (const p of decorated) {
      counts[p.status] = (counts[p.status] || 0) + 1;
      if (p.status !== 'completed' && p.deadline && new Date(p.deadline) < new Date()) counts.overdue += 1;
    }

    res.json({ projects: decorated, counts });
  })
);

// GET /api/projects/:id — project + its tasks
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const project = await Project.findOne({ _id: req.params.id, user: req.userId }).lean();
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const [decorated] = await withProgress(req.userId, [project]);
    const tasks = await Task.find({ user: req.userId, project: project._id })
      .sort({ completed: 1, dueDate: 1, createdAt: 1 })
      .lean();

    return res.json({ project: decorated, tasks });
  })
);

// POST /api/projects
router.post(
  '/',
  validate(projectSchema),
  asyncHandler(async (req, res) => {
    const project = await Project.create({ ...req.body, user: req.userId });
    res.status(201).json({ project: { ...project.toObject(), progress: 0, totalTasks: 0, completedTasks: 0, overdueTasks: 0 }, message: 'Project created.' });
  })
);

// PUT /api/projects/:id
router.put(
  '/:id',
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean();
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    const [decorated] = await withProgress(req.userId, [project]);
    return res.json({ project: decorated, message: 'Project updated.' });
  })
);

// DELETE /api/projects/:id — also removes its tasks
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const project = await Project.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    await Task.deleteMany({ user: req.userId, project: project._id });
    return res.json({ message: 'Project and its tasks deleted.' });
  })
);

module.exports = router;
