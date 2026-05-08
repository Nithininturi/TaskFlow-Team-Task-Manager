import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { format, parseISO } from 'date-fns';
import { Plus, FolderKanban, X, Archive, CheckCircle2 } from 'lucide-react';

function CreateProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await projectsApi.create(form);
      onCreate(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">New Project</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input
              className="form-input"
              placeholder="e.g. Marketing Campaign"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              placeholder="What is this project about?"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
            />
          </div>
          {error && <div className="error-banner">⚠ {error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('all'); // all | active | archived

  useEffect(() => {
    projectsApi.getAll()
      .then(res => setProjects(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p => filter === 'all' || p.status === filter);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} total project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Filter Tabs */}
          <div style={{
            display: 'flex', background: 'var(--bg-elevated)', borderRadius: 10,
            border: '1px solid var(--border)', padding: 3, gap: 2,
          }}>
            {['all', 'active', 'archived'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="btn btn-sm"
                style={{
                  background: filter === f ? 'var(--bg-card)' : 'transparent',
                  color: filter === f ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: filter === f ? '1px solid var(--border)' : '1px solid transparent',
                  textTransform: 'capitalize',
                }}
              >{f}</button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Project
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)', padding: '48px 0' }}>
          <div className="loading-spinner" /> Loading projects…
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
          <div className="empty-state-title">No projects found</div>
          <div className="empty-state-desc">
            {filter !== 'all' ? `No ${filter} projects.` : 'Create your first project to get started.'}
          </div>
          {filter === 'all' && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="projects-grid">
          {filtered.map(project => (
            <div key={project.id} className="project-card" onClick={() => navigate(`/projects/${project.id}`)}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: `linear-gradient(135deg, hsl(${(project.id * 57) % 360}, 70%, 50%), hsl(${(project.id * 57 + 40) % 360}, 60%, 40%))`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <FolderKanban size={18} color="white" />
                </div>
                <span style={{
                  padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600,
                  background: project.status === 'archived' ? 'rgba(100,116,139,0.2)' : 'rgba(16,185,129,0.15)',
                  color: project.status === 'archived' ? 'var(--text-muted)' : 'var(--success)',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {project.status === 'archived' ? <Archive size={10} /> : <CheckCircle2 size={10} />}
                  {project.status}
                </span>
              </div>

              <div>
                <div className="project-card-name">{project.name}</div>
                {project.description && (
                  <div className="project-card-desc" style={{ marginTop: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {project.description}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="avatar-stack">
                    {/* Owner avatar */}
                    <div className="avatar avatar-sm" title={`@${project.owner_username}`}>
                      {project.owner_username?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {project.member_count} member{project.member_count != 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    {project.active_task_count || 0} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>active tasks</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {format(parseISO(project.updated_at), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreate={p => setProjects(prev => [p, ...prev])}
        />
      )}
    </div>
  );
}
