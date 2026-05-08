import { useState } from 'react';
import { tasksApi } from '../api/client';
import { X } from 'lucide-react';

export default function CreateTaskModal({ projectId, projectMembers = [], onClose, onCreate }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    due_date: '',
    assignee_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        project_id: projectId,
        assignee_id: form.assignee_id ? parseInt(form.assignee_id) : null,
        due_date: form.due_date || null,
      };
      const { data } = await tasksApi.create(payload);
      onCreate?.(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Create New Task</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input name="title" className="form-input" placeholder="Task title" value={form.title} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea name="description" className="form-textarea" placeholder="Optional description..." value={form.description} onChange={handleChange} rows={3} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select name="status" className="form-select" value={form.status} onChange={handleChange}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select name="priority" className="form-select" value={form.priority} onChange={handleChange}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="date" name="due_date" className="form-input" value={form.due_date} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Assignee</label>
              <select name="assignee_id" className="form-select" value={form.assignee_id} onChange={handleChange}>
                <option value="">Unassigned</option>
                {projectMembers.map(m => (
                  <option key={m.id} value={m.id}>@{m.username}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <div className="error-banner">⚠ {error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
