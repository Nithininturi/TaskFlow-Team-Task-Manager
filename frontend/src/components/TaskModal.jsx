import { useState, useEffect } from 'react';
import { tasksApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { format, parseISO } from 'date-fns';
import { X, Send, Trash2 } from 'lucide-react';

export default function TaskModal({ task, projectMembers = [], onClose, onUpdate, onDelete, canDelete }) {
  const { user } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ ...task });
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadComments();
  }, [task.id]);

  const loadComments = async () => {
    try {
      const { data } = await tasksApi.getComments(task.id);
      setComments(data);
    } catch {}
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await tasksApi.update(task.id, form);
      onUpdate?.(data);
      setEditMode(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      const { data } = await tasksApi.addComment(task.id, { content: newComment });
      setComments(prev => [...prev, data]);
      setNewComment('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ flex: 1 }}>
            {editMode ? (
              <input
                className="form-input"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                style={{ fontSize: '1.1rem', fontWeight: 700 }}
              />
            ) : (
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginRight: 16 }}>{task.title}</h2>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!editMode && (
              <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(true)}>Edit</button>
            )}
            {editMode && (
              <>
                <button className="btn btn-primary btn-sm" disabled={saving} onClick={handleSave}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setEditMode(false); setForm({ ...task }); }}>Cancel</button>
              </>
            )}
            {canDelete && (
              <button className="btn btn-danger btn-sm" onClick={() => { onDelete(); onClose(); }}>
                <Trash2 size={13} /> Delete
              </button>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        {/* Badges Row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          <span className={`badge badge-${task.status.replace('_', '-')}`}>{task.status.replace('_', ' ')}</span>
          <span className={`badge badge-${task.priority}`}>{task.priority}</span>
          {task.assignee_username && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              👤 @{task.assignee_username}
            </span>
          )}
          {task.due_date && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              📅 {format(parseISO(task.due_date), 'MMM d, yyyy')}
            </span>
          )}
        </div>

        {/* Edit Form */}
        {editMode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20, padding: '16px', background: 'var(--bg-elevated)', borderRadius: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {['todo','in_progress','review','done'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input type="date" className="form-input" value={form.due_date ? form.due_date.split('T')[0] : ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Assignee</label>
                <select className="form-select" value={form.assignee_id || ''} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value || null }))}>
                  <option value="">Unassigned</option>
                  {projectMembers.map(m => <option key={m.id} value={m.id}>@{m.username}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
          </div>
        )}

        {/* Description (view mode) */}
        {!editMode && task.description && (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
            {task.description}
          </p>
        )}

        {/* Comments */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Comments ({comments.length})
          </h3>

          <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 16 }}>
            {comments.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>No comments yet. Start the conversation.</p>
            ) : (
              comments.map(c => (
                <div key={c.id} className="comment">
                  <div className="avatar avatar-sm">{c.author_username?.charAt(0).toUpperCase()}</div>
                  <div className="comment-body">
                    <span className="comment-author">@{c.author_username}</span>
                    <span className="comment-time">{format(parseISO(c.created_at), 'MMM d, h:mm a')}</span>
                    <p className="comment-content">{c.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleComment} style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-input"
              placeholder="Write a comment..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary btn-icon" type="submit" disabled={loading || !newComment.trim()}>
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
