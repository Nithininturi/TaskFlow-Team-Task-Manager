import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi, projectsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import CreateTaskModal from '../components/CreateTaskModal';
import { Plus, Filter, X } from 'lucide-react';

const STATUS_OPTIONS = ['all', 'todo', 'in_progress', 'review', 'done'];
const PRIORITY_OPTIONS = ['all', 'low', 'medium', 'high', 'urgent'];

export default function Tasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    projectId: 'all',
  });

  useEffect(() => {
    Promise.all([
      projectsApi.getAll(),
    ]).then(([projs]) => {
      setProjects(projs.data);
      // Load tasks from first project or all
      loadAllTasks(projs.data);
    }).finally(() => setLoading(false));
  }, []);

  const loadAllTasks = async (projectList) => {
    try {
      const allTasks = await Promise.all(
        projectList.map(p => tasksApi.getByProject(p.id).then(r => r.data))
      );
      setTasks(allTasks.flat());
    } catch {}
  };

  const refreshTasks = () => loadAllTasks(projects);

  const filteredTasks = tasks.filter(t => {
    if (filters.status !== 'all' && t.status !== filters.status) return false;
    if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
    if (filters.projectId !== 'all' && String(t.project_id) !== filters.projectId) return false;
    return true;
  });

  const handleDelete = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    await tasksApi.delete(taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const hasFilters = filters.status !== 'all' || filters.priority !== 'all' || filters.projectId !== 'all';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">All Tasks</h1>
          <p className="page-subtitle">{filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} {hasFilters ? '(filtered)' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={15} /> New Task
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <Filter size={14} /> Filters
          </div>

          <select
            className="form-select"
            style={{ width: 'auto', fontSize: '0.8rem', padding: '6px 10px' }}
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace('_', ' ')}</option>
            ))}
          </select>

          <select
            className="form-select"
            style={{ width: 'auto', fontSize: '0.8rem', padding: '6px 10px' }}
            value={filters.priority}
            onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
          >
            {PRIORITY_OPTIONS.map(p => (
              <option key={p} value={p}>{p === 'all' ? 'All Priorities' : p}</option>
            ))}
          </select>

          <select
            className="form-select"
            style={{ width: 'auto', fontSize: '0.8rem', padding: '6px 10px' }}
            value={filters.projectId}
            onChange={e => setFilters(f => ({ ...f, projectId: e.target.value }))}
          >
            <option value="all">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {hasFilters && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--text-muted)', gap: 4 }}
              onClick={() => setFilters({ status: 'all', priority: 'all', projectId: 'all' })}
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Task Grid */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)', padding: '48px 0' }}>
          <div className="loading-spinner" /> Loading tasks…
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">{hasFilters ? 'No tasks match your filters' : 'No tasks yet'}</div>
          <div className="empty-state-desc">
            {hasFilters ? 'Try adjusting your filters.' : 'Create your first task to get started.'}
          </div>
          {!hasFilters && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Create Task
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filteredTasks.map(task => (
            <div key={task.id}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 4 }}>
                📁 {task.project_name || projects.find(p => p.id === task.project_id)?.name || 'Project'}
              </div>
              <TaskCard
                task={task}
                onClick={() => setSelectedTask(task)}
                canDelete={user?.role === 'admin' || task.creator_id === user?.id}
                onDelete={() => handleDelete(task.id)}
              />
            </div>
          ))}
        </div>
      )}

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projectMembers={[]}
          onClose={() => setSelectedTask(null)}
          onUpdate={updated => {
            setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
            setSelectedTask(null);
          }}
          onDelete={() => { handleDelete(selectedTask.id); setSelectedTask(null); }}
          canDelete={user?.role === 'admin' || selectedTask.creator_id === user?.id}
        />
      )}

      {showCreate && projects.length > 0 && (
        <CreateTaskModal
          projectId={filters.projectId !== 'all' ? filters.projectId : projects[0]?.id}
          projectMembers={[]}
          onClose={() => setShowCreate(false)}
          onCreate={task => { setTasks(prev => [task, ...prev]); }}
        />
      )}

      {showCreate && projects.length === 0 && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 360, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>📁</div>
            <h3 style={{ marginBottom: 8 }}>No Projects Yet</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 20 }}>
              Create a project first before adding tasks.
            </p>
            <button className="btn btn-primary" onClick={() => { setShowCreate(false); navigate('/projects'); }}>
              Go to Projects
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
