import { useState } from 'react';
import { projectsApi } from '../api/client';
import { X, UserPlus, Trash2 } from 'lucide-react';

export default function MemberModal({ project, members, onClose, onUpdate, canManage }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      await projectsApi.addMember(project.id, { email, role });
      setSuccess(`Member added successfully!`);
      setEmail('');
      onUpdate?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId) => {
    if (!confirm('Remove this member from the project?')) return;
    try {
      await projectsApi.removeMember(project.id, userId);
      onUpdate?.();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove member');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Team Members</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Add Member Form */}
        {canManage && (
          <form onSubmit={handleAdd} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Add by Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="teammate@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {error && <div className="error-banner">⚠ {error}</div>}
              {success && <div style={{ color: 'var(--success)', fontSize: '0.85rem' }}>✓ {success}</div>}
              <button className="btn btn-primary" type="submit" disabled={loading}>
                <UserPlus size={14} />
                {loading ? 'Adding…' : 'Add Member'}
              </button>
            </div>
          </form>
        )}

        {/* Member List */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Current Members ({members.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map(m => (
              <div key={m.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                background: 'var(--bg-elevated)',
                borderRadius: 10,
                border: '1px solid var(--border)',
              }}>
                <div className="avatar">
                  {m.username.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>@{m.username}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.email}</div>
                </div>
                <span className={`badge badge-${m.project_role}`}>{m.project_role}</span>
                {canManage && m.id !== project.owner_id && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => handleRemove(m.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
