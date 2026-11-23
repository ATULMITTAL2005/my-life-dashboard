const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Personal daily tasks leave this empty; work tasks reference a project.
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    category: { type: String, trim: true, maxlength: 60, default: 'Personal' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'done'],
      default: 'todo',
    },
    dueDate: { type: Date, default: null },
    reminderAt: { type: Date, default: null },
    recurrence: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

taskSchema.index({ user: 1, completed: 1, dueDate: 1 });
taskSchema.index({ user: 1, project: 1, status: 1 });
taskSchema.index({ user: 1, reminderAt: 1 });

module.exports = mongoose.model('Task', taskSchema);
