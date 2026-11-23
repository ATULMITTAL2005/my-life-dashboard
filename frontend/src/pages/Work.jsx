import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { useFetch } from '../lib/useFetch';
import {
  PRIORITIES,
  PRIORITY_LABEL,
  PROJECT_COLORS,
  PROJECT_STATUSES,
  STATUS_LABEL,
  STATUS_TONE,
  TASK_STATUSES,
} from '../lib/constants';
import {
  deadlineInfo,
  dueInfo,
  formatDate,
  fromDateInput,
  toDateInput,
} from '../lib/format';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FormAlert,
  IconButton,
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
import { Icon } from '../components/Icons';
import TaskModal from '../components/TaskModal';

const priorityTone = { high: 'danger', medium: 'gold', low: 'neutral' };
const taskStatusTone = { todo: 'neutral', in_progress: 'sky', done: 'sage' };
const taskStatusLabel = { todo: 'To do', in_progress: 'In progress', done: 'Done' };

function ProjectModal({ open, onClose, project, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: '',
    description: '',
    priority: 'medium',
    status: 'planning',
    deadline: '',
    color: 'sage',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: project?.name || '',
      description: project?.description || '',
      priority: project?.priority || 'medium',
      status: project?.status || 'planning',
      deadline: toDateInput(project?.deadline || ''),
      color: project?.color || 'sage',
    });
    setErrors({});
    setServerError('');
  }, [open, project]);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.name.trim().length < 2) {
      setErrors({ name: 'Give the project a name.' });
      return;
    }
    setSaving(true);
    setServerError('');
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        priority: form.priority,
        status: form.status,
        deadline: fromDateInput(form.deadline),
        color: form.color,
      };
      if (project?._id) {
        await api(`/projects/${project._id}`, { method: 'PUT', body: payload });
        toast.success('Project updated.');
      } else {
        await api('/projects', { method: 'POST', body: payload });
        toast.success('Project created.');
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
      title={project ? 'Edit project' : 'New project'}
      description="Give the work a clear shape, then break it into small tasks."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="project-form" loading={saving}>
            {project ? 'Save project' : 'Create project'}
          </Button>
        </>
      }
    >
      <form id="project-form" className="form-stack" onSubmit={handleSubmit} noValidate>
        <FormAlert>{serverError}</FormAlert>

        <TextField
          label="Project name"
          placeholder="e.g. Website redesign"
          value={form.name}
          onChange={update('name')}
          error={errors.name}
          maxLength={120}
          required
        />

        <TextareaField
          label="Description"
          placeholder="What does done look like?"
          rows={3}
          value={form.description}
          onChange={update('description')}
          error={errors.description}
          maxLength={1000}
        />

        <div className="form-grid">
          <SelectField
            label="Status"
            options={PROJECT_STATUSES}
            value={form.status}
            onChange={update('status')}
          />
          <SelectField
            label="Priority"
            options={PRIORITIES}
            value={form.priority}
            onChange={update('priority')}
          />
        </div>

        <div className="form-grid">
          <TextField
            label="Deadline"
            type="date"
            value={form.deadline}
            onChange={update('deadline')}
            error={errors.deadline}
          />
          <SelectField
            label="Accent colour"
            options={PROJECT_COLORS}
            value={form.color}
            onChange={update('color')}
          />
        </div>
      </form>
    </Modal>
  );
}

export default function Work() {
  const toast = useToast();
  const [view, setView] = useState('list');
  const [projectModal, setProjectModal] = useState({ open: false, project: null });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState('');
  const [taskModal, setTaskModal] = useState({ open: false, task: null, projectId: '', status: 'todo' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const {
    data: projectData,
    loading: projectsLoading,
    error: projectsError,
    reload: reloadProjects,
  } = useFetch('/projects');

  const {
    data: boardData,
    loading: boardLoading,
    error: boardError,
    reload: reloadBoard,
  } = useFetch('/tasks?project=work&view=all', { enabled: view === 'board' });

  const {
    data: detailData,
    loading: detailLoading,
    error: detailError,
    reload: reloadDetail,
  } = useFetch(detailOpen && detailId ? `/projects/${detailId}` : '', {
    enabled: detailOpen && Boolean(detailId),
  });

  const projects = projectData?.projects || [];
  const counts = projectData?.counts || {};
  const boardTasks = boardData?.tasks || [];
  const detailProject = detailData?.project || null;
  const detailTasks = detailData?.tasks || [];
  const projectMap = useMemo(
    () => new Map(projects.map((project) => [String(project._id), project])),
    [projects]
  );

  const radarProjects = projects
    .filter((project) => project.status !== 'completed' && project.deadline)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);

  const reloadWork = ({ detail = false } = {}) => {
    reloadProjects();
    if (view === 'board') reloadBoard();
    if (detail) reloadDetail();
  };

  const openDetail = (project) => {
    setDetailId(project._id);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailId('');
  };

  const openEditProject = (project) => {
    closeDetail();
    setProjectModal({ open: true, project });
  };

  const openTaskModal = ({ task = null, projectId = '', status = 'todo' } = {}) => {
    setTaskModal({ open: true, task, projectId, status });
  };

  const toggleTask = async (task) => {
    try {
      await api(`/tasks/${task._id}/toggle`, { method: 'PATCH' });
      toast.success(task.completed ? 'Task reopened.' : 'Task completed.');
      reloadWork({ detail: true });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const moveTask = async (task, status) => {
    try {
      await api(`/tasks/${task._id}/status`, { method: 'PATCH', body: { status } });
      toast.success('Task moved.');
      reloadWork({ detail: detailOpen });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === 'project') {
        await api(`/projects/${deleteTarget.item._id}`, { method: 'DELETE' });
        toast.success('Project and its tasks deleted.');
        closeDetail();
      } else {
        await api(`/tasks/${deleteTarget.item._id}`, { method: 'DELETE' });
        toast.success('Task deleted.');
      }
      setDeleteTarget(null);
      reloadWork({ detail: deleteTarget.kind !== 'project' && detailOpen });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="work-page">
      <PageHeader
        eyebrow="Work"
        title="Projects with room to breathe"
        description="Keep the deadlines visible, the tasks small, and the progress honest."
        actions={
          <>
            <SegmentedControl
              label="Work view"
              value={view}
              onChange={setView}
              options={[
                { value: 'list', label: 'List', icon: 'list' },
                { value: 'board', label: 'Board', icon: 'columns' },
              ]}
            />
            <Button
              icon="plus"
              onClick={() => setProjectModal({ open: true, project: null })}
            >
              New project
            </Button>
          </>
        }
      />

      {projectsLoading ? (
        <div aria-busy="true">
          <div className="work-stats">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="card" key={index}>
                <LoadingCard rows={2} />
              </div>
            ))}
          </div>
          <div className="project-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="card" key={index}>
                <LoadingCard rows={5} />
              </div>
            ))}
          </div>
        </div>
      ) : projectsError ? (
        <ErrorState error={projectsError} onRetry={reloadProjects} />
      ) : (
        <>
          <div className="work-stats">
            <div className="stat-card">
              <div className="stat-card__top">
                <span className="icon-tile icon-tile--sage" aria-hidden="true">
                  <Icon name="briefcase" size={18} />
                </span>
                <span className="stat-card__label">Active projects</span>
              </div>
              <p className="stat-card__value">{counts.active || 0}</p>
              <p className="stat-card__detail">{counts.review || 0} waiting for review</p>
            </div>
            <div className="stat-card">
              <div className="stat-card__top">
                <span className="icon-tile icon-tile--clay" aria-hidden="true">
                  <Icon name="alert" size={18} />
                </span>
                <span className="stat-card__label">Overdue</span>
              </div>
              <p className="stat-card__value">{counts.overdue || 0}</p>
              <p className="stat-card__detail">
                {counts.overdue ? 'Needs a gentle reset' : 'Everything is on time'}
              </p>
            </div>
            <div className="stat-card">
              <div className="stat-card__top">
                <span className="icon-tile icon-tile--plum" aria-hidden="true">
                  <Icon name="checkSquare" size={18} />
                </span>
                <span className="stat-card__label">Completed</span>
              </div>
              <p className="stat-card__value">{counts.completed || 0}</p>
              <p className="stat-card__detail">{counts.all || 0} projects in total</p>
            </div>
          </div>

          {radarProjects.length ? (
            <section className="card deadline-radar" aria-labelledby="radar-title">
              <SectionHeader
                title="Deadline radar"
                description="The next few dates that matter"
                action={
                  counts.overdue ? (
                    <Badge tone="danger">
                      {counts.overdue} overdue
                    </Badge>
                  ) : (
                    <Badge tone="sage">On track</Badge>
                  )
                }
              />
              <h2 id="radar-title" className="sr-only">
                Upcoming and overdue project deadlines
              </h2>
              <ul className="radar-list">
                {radarProjects.map((project) => {
                  const info = deadlineInfo(project.deadline);
                  return (
                    <li key={project._id}>
                      <button
                        type="button"
                        className="radar-chip"
                        onClick={() => openDetail(project)}
                      >
                        <span className={`project-dot project-dot--${project.color}`} aria-hidden="true" />
                        <span className="radar-chip__text">
                          <strong>{project.name}</strong>
                          <span>{formatDate(project.deadline, { short: true })}</span>
                        </span>
                        <Badge tone={info.tone}>{info.text}</Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {view === 'list' ? (
            projects.length ? (
              <div className="project-grid">
                {projects.map((project) => {
                  const deadline = deadlineInfo(project.deadline);
                  return (
                    <article key={project._id} className={`project-card project-card--${project.color}`}>
                      <div
                        className="project-card__main"
                        role="button"
                        tabIndex={0}
                        onClick={() => openDetail(project)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openDetail(project);
                          }
                        }}
                        aria-label={`Open project ${project.name}`}
                      >
                        <div className="project-card__top">
                          <span className={`project-dot project-dot--${project.color}`} aria-hidden="true" />
                          <Badge tone={STATUS_TONE[project.status]}>
                            {STATUS_LABEL[project.status]}
                          </Badge>
                          <Badge tone={priorityTone[project.priority]}>
                            {PRIORITY_LABEL[project.priority]}
                          </Badge>
                        </div>
                        <h3 className="project-card__name">{project.name}</h3>
                        <p className="project-card__description">
                          {project.description || 'No description yet.'}
                        </p>
                        <div className="project-card__progress">
                          <div className="progress-head">
                            <span>
                              {project.completedTasks} of {project.totalTasks} tasks
                            </span>
                            <strong>{project.progress}%</strong>
                          </div>
                          <ProgressBar
                            value={project.progress}
                            tone={project.progress >= 100 ? 'sage' : 'sage'}
                            label={`${project.name} progress`}
                          />
                        </div>
                        <div className="project-card__footer">
                          <Badge tone={deadline.tone}>{deadline.text}</Badge>
                          {project.overdueTasks > 0 ? (
                            <span className="meta-text text-danger">
                              {project.overdueTasks} overdue task
                              {project.overdueTasks === 1 ? '' : 's'}
                            </span>
                          ) : (
                            <span className="meta-text">{project.totalTasks} tasks</span>
                          )}
                        </div>
                      </div>
                      <div className="project-card__actions">
                        <IconButton
                          label={`Edit ${project.name}`}
                          icon="pencil"
                          size="sm"
                          onClick={() => openEditProject(project)}
                        />
                        <IconButton
                          label={`Delete ${project.name}`}
                          icon="trash"
                          size="sm"
                          variant="danger"
                          onClick={() => setDeleteTarget({ kind: 'project', item: project })}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <section className="card">
                <EmptyState
                  icon="briefcase"
                  title="No projects yet"
                  description="Create your first project to give your work a clear shape."
                  action={
                    <Button
                      icon="plus"
                      onClick={() => setProjectModal({ open: true, project: null })}
                    >
                      Create a project
                    </Button>
                  }
                />
              </section>
            )
          ) : (
            <section aria-label="Work task board">
              {boardLoading ? (
                <div className="kanban" aria-busy="true">
                  {TASK_STATUSES.map((status) => (
                    <div className="card" key={status.value}>
                      <LoadingCard rows={5} />
                    </div>
                  ))}
                </div>
              ) : boardError ? (
                <ErrorState error={boardError} onRetry={reloadBoard} />
              ) : (
                <div className="kanban">
                  {TASK_STATUSES.map((status) => {
                    const columnTasks = boardTasks.filter((task) => task.status === status.value);
                    return (
                      <section className="kanban-column" key={status.value} aria-label={status.label}>
                        <header className="kanban-column__header">
                          <h2>{status.label}</h2>
                          <span className="kanban-count">{columnTasks.length}</span>
                        </header>
                        <div className="kanban-cards">
                          {columnTasks.length ? (
                            columnTasks.map((task) => {
                              const project = projectMap.get(String(task.project));
                              const due = dueInfo(task.dueDate);
                              return (
                                <article
                                  className={`kanban-card kanban-card--${project?.color || 'sage'}`}
                                  key={task._id}
                                >
                                  <div className="kanban-card__top">
                                    <span
                                      className={`project-dot project-dot--${project?.color || 'sage'}`}
                                      aria-hidden="true"
                                    />
                                    <span>{project?.name || 'No project'}</span>
                                    <Badge tone={priorityTone[task.priority]}>
                                      {PRIORITY_LABEL[task.priority]}
                                    </Badge>
                                  </div>
                                  <p className="kanban-card__title">{task.title}</p>
                                  <div className="kanban-card__meta">
                                    <Badge tone={due.tone}>{due.text}</Badge>
                                    {task.notes ? (
                                      <span className="meta-text kanban-card__note">{task.notes}</span>
                                    ) : null}
                                  </div>
                                  <div className="kanban-card__footer">
                                    <label className="sr-only" htmlFor={`status-${task._id}`}>
                                      Move {task.title} to another column
                                    </label>
                                    <select
                                      id={`status-${task._id}`}
                                      className="select select--sm"
                                      value={task.status}
                                      onChange={(event) => moveTask(task, event.target.value)}
                                    >
                                      {TASK_STATUSES.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                    <IconButton
                                      label={`Edit ${task.title}`}
                                      icon="pencil"
                                      size="sm"
                                      onClick={() =>
                                        openTaskModal({
                                          task,
                                          projectId: task.project || '',
                                          status: task.status,
                                        })
                                      }
                                    />
                                  </div>
                                </article>
                              );
                            })
                          ) : (
                            <p className="kanban-empty">Nothing here yet.</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="plus"
                          className="kanban-add"
                          onClick={() => openTaskModal({ status: status.value })}
                        >
                          Add task
                        </Button>
                      </section>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}

      <ProjectModal
        open={projectModal.open}
        project={projectModal.project}
        onClose={() => setProjectModal({ open: false, project: null })}
        onSaved={reloadWork}
      />

      <TaskModal
        open={taskModal.open}
        task={taskModal.task}
        projects={projects}
        defaultProjectId={taskModal.projectId}
        defaultStatus={taskModal.status}
        context="work"
        onClose={() => setTaskModal({ open: false, task: null, projectId: '', status: 'todo' })}
        onSaved={() => reloadWork({ detail: detailOpen })}
      />

      <Modal
        open={detailOpen}
        onClose={closeDetail}
        title={detailProject?.name || 'Project'}
        eyebrow="Project details"
        description={
          detailProject
            ? `${STATUS_LABEL[detailProject.status]} · ${detailProject.progress}% complete`
            : 'Loading project…'
        }
        size="lg"
        footer={
          detailProject ? (
            <div className="modal-footer-split">
              <Button
                variant="danger"
                size="sm"
                icon="trash"
                onClick={() => setDeleteTarget({ kind: 'project', item: detailProject })}
              >
                Delete project
              </Button>
              <div className="modal-footer-split__right">
                <Button variant="secondary" size="sm" onClick={closeDetail}>
                  Close
                </Button>
                <Button size="sm" icon="pencil" onClick={() => openEditProject(detailProject)}>
                  Edit project
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {detailLoading ? (
          <LoadingCard rows={6} />
        ) : detailError ? (
          <ErrorState error={detailError} onRetry={reloadDetail} />
        ) : detailProject ? (
          <div className="project-detail">
            <div className="detail-meta">
              <Badge tone={STATUS_TONE[detailProject.status]}>
                {STATUS_LABEL[detailProject.status]}
              </Badge>
              <Badge tone={priorityTone[detailProject.priority]}>
                {PRIORITY_LABEL[detailProject.priority]} priority
              </Badge>
              <Badge tone={deadlineInfo(detailProject.deadline).tone}>
                {deadlineInfo(detailProject.deadline).text}
              </Badge>
            </div>

            <p className="detail-description">
              {detailProject.description || 'No description yet. Add one to give this work a shape.'}
            </p>

            <div className="detail-progress">
              <div className="progress-head">
                <span>
                  {detailProject.completedTasks} of {detailProject.totalTasks} tasks complete
                </span>
                <strong>{detailProject.progress}%</strong>
              </div>
              <ProgressBar
                value={detailProject.progress}
                label={`${detailProject.name} progress`}
              />
            </div>

            <SectionHeader
              title="Tasks"
              description={`${detailProject.completedTasks} done · ${detailProject.totalTasks} total`}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  icon="plus"
                  onClick={() =>
                    openTaskModal({ projectId: detailProject._id, status: 'todo' })
                  }
                >
                  Add task
                </Button>
              }
            />

            {detailTasks.length ? (
              <ul className="detail-task-list">
                {detailTasks.map((task) => {
                  const due = dueInfo(task.dueDate, { completed: task.completed });
                  return (
                    <li key={task._id} className={`detail-task ${task.completed ? 'is-done' : ''}`}>
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task)}
                        aria-label={`Mark ${task.title} as ${task.completed ? 'not done' : 'done'}`}
                      />
                      <div className="detail-task__body">
                        <p>{task.title}</p>
                        <div className="meta-row">
                          <Badge tone={taskStatusTone[task.status]}>
                            {taskStatusLabel[task.status]}
                          </Badge>
                          <Badge tone={due.tone}>{due.text}</Badge>
                          <span className="meta-text">{PRIORITY_LABEL[task.priority]}</span>
                        </div>
                      </div>
                      <IconButton
                        label={`Edit ${task.title}`}
                        icon="pencil"
                        size="sm"
                        onClick={() =>
                          openTaskModal({ task, projectId: detailProject._id, status: task.status })
                        }
                      />
                      <IconButton
                        label={`Delete ${task.title}`}
                        icon="trash"
                        size="sm"
                        variant="danger"
                        onClick={() => setDeleteTarget({ kind: 'task', item: task })}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon="checkSquare"
                title="No tasks yet"
                description="Break this project into a few small, finishable steps."
                action={
                  <Button
                    size="sm"
                    icon="plus"
                    onClick={() =>
                      openTaskModal({ projectId: detailProject._id, status: 'todo' })
                    }
                  >
                    Add the first task
                  </Button>
                }
              />
            )}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget?.kind === 'project' ? 'Delete this project?' : 'Delete this task?'}
        description={
          deleteTarget?.kind === 'project'
            ? `${deleteTarget.item.name} and all of its tasks will be removed.`
            : deleteTarget?.item?.title
        }
        confirmLabel={deleteTarget?.kind === 'project' ? 'Delete project' : 'Delete task'}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
