import { format, isAfter, parseISO } from 'date-fns';
import { CalendarDays, MessageSquare } from 'lucide-react';

const priorityColor = {
  low: 'var(--priority-low)',
  medium: 'var(--priority-medium)',
  high: 'var(--priority-high)',
  urgent: 'var(--priority-urgent)',
};

export default function TaskCard({ task, onClick, onDelete, canDelete }) {
  const isOverdue = task.due_date && task.status !== 'done' && isAfter(new Date(), parseISO(task.due_date));

  return (
    <div
      className={`task-card priority-${task.priority}`}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <p className="task-card-title">{task.title}</p>
        <span className={`badge badge-${task.priority}`} style={{ flexShrink: 0 }}>
          {task.priority}
        </span>
      </div>

      {task.description && (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {task.description}
        </p>
      )}

      <div className="task-card-meta">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {task.assignee_username && (
            <div className="avatar avatar-sm" title={`@${task.assignee_username}`}>
              {task.assignee_username.charAt(0).toUpperCase()}
            </div>
          )}
          {task.due_date && (
            <span className={`due-date ${isOverdue ? 'overdue' : ''}`}>
              <CalendarDays size={10} />
              {format(parseISO(task.due_date), 'MMM d')}
              {isOverdue && ' • Overdue'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {canDelete && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--danger)', padding: '2px 6px', fontSize: '0.7rem' }}
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
