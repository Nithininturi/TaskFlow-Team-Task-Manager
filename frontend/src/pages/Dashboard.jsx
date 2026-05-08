import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { format, parseISO, isAfter } from 'date-fns';
import { CheckSquare, Clock, AlertTriangle, FolderKanban, Activity, CalendarDays } from 'lucide-react';

const statusColors = {
  todo: 'var(--status-todo)',
  in_progress: 'var(--status-in-progress)',
  review: 'var(--status-review)',
  done: 'var(--status-done)',
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tasksApi.getDashboard()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-screen" style={{ minHeight: 'auto', padding: 80 }}>
      <div className="loading-spinner" style={{ width: 36, height: 36 }} />
      <span style={{ color: 'var(--text-muted)' }}>Loading dashboard…</span>
    </div>
  );

  const stats = data?.stats || {};

  const statCards = [
    {
      label: 'Active Tasks',
      value: stats.active_tasks || 0,
      icon: <CheckSquare size={18} color="var(--primary)" />,
      iconBg: 'rgba(99,102,241,0.15)',
      gradient: 'var(--primary)',
    },
    {
      label: 'Completed',
      value: stats.completed_tasks || 0,
      icon: <Clock size={18} color="var(--success)" />,
      iconBg: 'rgba(16,185,129,0.15)',
      gradient: 'var(--success)',
    },
    {
      label: 'Overdue',
      value: stats.overdue_tasks || 0,
      icon: <AlertTriangle size={18} color="var(--danger)" />,
      iconBg: 'rgba(239,68,68,0.15)',
      gradient: 'var(--danger)',
    },
    {
      label: 'Projects',
      value: stats.project_count || 0,
      icon: <FolderKanban size={18} color="var(--accent)" />,
      iconBg: 'rgba(6,182,212,0.15)',
      gradient: 'var(--accent)',
    },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
            <span style={{ color: 'var(--primary-light)' }}>@{user?.username}</span> 👋
          </h1>
          <p className="page-subtitle">Here's what's happening across your projects</p>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        {statCards.map(card => (
          <div key={card.label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="stat-icon" style={{ background: card.iconBg }}>{card.icon}</div>
            </div>
            <div className="stat-value" style={{ color: card.gradient }}>{card.value}</div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* My Tasks */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>My Tasks</h2>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>sorted by due date</span>
          </div>
          {data?.myTasks?.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <div className="empty-state-icon">✅</div>
              <div className="empty-state-title">All caught up!</div>
              <div className="empty-state-desc">No pending tasks assigned to you.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data?.myTasks?.slice(0, 8).map(task => {
                const isOverdue = task.due_date && isAfter(new Date(), parseISO(task.due_date));
                return (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/projects/${task.project_id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      background: 'var(--bg-elevated)',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-active)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: statusColors[task.status] || 'var(--text-muted)',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{task.project_name}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                      <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                      {task.due_date && (
                        <span style={{ fontSize: '0.65rem', color: isOverdue ? 'var(--danger)' : 'var(--text-muted)' }}>
                          <CalendarDays size={9} style={{ display: 'inline', marginRight: 3 }} />
                          {format(parseISO(task.due_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Activity size={16} color="var(--primary)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent Activity</h2>
          </div>
          {data?.recentActivity?.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No activity yet</div>
              <div className="empty-state-desc">Create tasks and projects to see activity.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data?.recentActivity?.slice(0, 10).map(item => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/projects/${item.project_name}`)}
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: `${statusColors[item.status] || 'var(--primary)'}22`,
                    border: `1px solid ${statusColors[item.status] || 'var(--primary)'}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem',
                  }}>
                    {item.status === 'done' ? '✓' : item.status === 'in_progress' ? '⚡' : item.status === 'review' ? '👁' : '○'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {item.project_name} · {format(parseISO(item.updated_at), 'MMM d, h:mm a')}
                    </div>
                  </div>
                  <span className={`badge badge-${item.status.replace('_', '-')}`} style={{ flexShrink: 0, alignSelf: 'flex-start' }}>
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
