import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { projectsApi, tasksApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import MemberModal from '../components/MemberModal';
import CreateTaskModal from '../components/CreateTaskModal';
import { Plus, Users, Settings, ArrowLeft, Archive, Trash2, Edit3 } from 'lucide-react';

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'var(--status-todo)' },
  { id: 'in_progress', label: 'In Progress', color: 'var(--status-in-progress)' },
  { id: 'review', label: 'Review', color: 'var(--status-review)' },
  { id: 'done', label: 'Done', color: 'var(--status-done)' },
];

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  const loadProject = async () => {
    const { data } = await projectsApi.getOne(id);
    setProject(data);
    setNewName(data.name);
  };

  const loadTasks = async () => {
    const { data } = await tasksApi.getByProject(id);
    setTasks(data);
  };

  useEffect(() => {
    Promise.all([loadProject(), loadTasks()]).finally(() => setLoading(false));
  }, [id]);

  const isAdmin = project?.owner_id === user?.id ||
    project?.members?.find(m => m.id === user?.id)?.project_role === 'admin' ||
    user?.role === 'admin';

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    const taskId = parseInt(draggableId);

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      await tasksApi.update(taskId, { status: newStatus });
    } catch {
      // Revert on failure
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: source.droppableId } : t));
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    await tasksApi.delete(taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleDeleteProject = async () => {
    if (!confirm(`Delete project "${project.name}"? This will delete all tasks.`)) return;
    await projectsApi.delete(id);
    navigate('/projects');
  };

  const handleArchive = async () => {
    const newStatus = project.status === 'archived' ? 'active' : 'archived';
    await projectsApi.update(id, { status: newStatus });
    setProject(p => ({ ...p, status: newStatus }));
  };

  const handleRename = async () => {
    if (newName.trim() && newName !== project.name) {
      await projectsApi.update(id, { name: newName });
      setProject(p => ({ ...p, name: newName }));
    }
    setEditingName(false);
  };

  const tasksByStatus = (status) => tasks.filter(t => t.status === status);

  if (loading) return (
    <div className="loading-screen" style={{ minHeight: 'auto', padding: 80 }}>
      <div className="loading-spinner" style={{ width: 36, height: 36 }} />
    </div>
  );

  if (!project) return (
    <div className="page-container">
      <div className="empty-state">
        <div className="empty-state-title">Project not found</div>
        <button className="btn btn-secondary" onClick={() => navigate('/projects')}>
          <ArrowLeft size={14} /> Back to Projects
        </button>
      </div>
    </div>
  );

  return (
    <div className="page-container" style={{ maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={() => navigate('/projects')}>
          <ArrowLeft size={14} /> Projects
        </button>

        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            {editingName ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  className="form-input"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false); }}
                  autoFocus
                  style={{ fontSize: '1.5rem', fontWeight: 800, background: 'transparent', borderColor: 'var(--primary)' }}
                />
                <button className="btn btn-primary btn-sm" onClick={handleRename}>Save</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditingName(false)}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 className="page-title">{project.name}</h1>
                {project.status === 'archived' && (
                  <span style={{ background: 'rgba(100,116,139,0.2)', color: 'var(--text-muted)', padding: '2px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}>
                    Archived
                  </span>
                )}
                {isAdmin && (
                  <button className="btn btn-ghost btn-icon" onClick={() => setEditingName(true)}>
                    <Edit3 size={14} color="var(--text-muted)" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Member Avatars */}
            <div
              className="avatar-stack"
              style={{ cursor: 'pointer' }}
              onClick={() => setShowMembers(true)}
              title="Manage members"
            >
              {project.members?.slice(0, 4).map(m => (
                <div key={m.id} className="avatar" title={`@${m.username} (${m.project_role})`}>
                  {m.username.charAt(0).toUpperCase()}
                </div>
              ))}
              {project.members?.length > 4 && (
                <div className="avatar" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                  +{project.members.length - 4}
                </div>
              )}
            </div>

            <button className="btn btn-secondary btn-sm" onClick={() => setShowMembers(true)}>
              <Users size={14} /> Members
            </button>

            <button className="btn btn-primary" onClick={() => setShowCreateTask(true)}>
              <Plus size={15} /> Add Task
            </button>

            {isAdmin && (
              <div style={{ position: 'relative' }}>
                <details style={{ listStyle: 'none' }}>
                  <summary style={{ listStyle: 'none', cursor: 'pointer' }}>
                    <button className="btn btn-secondary btn-icon" as="div">
                      <Settings size={15} />
                    </button>
                  </summary>
                  <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: 6,
                    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
                    padding: 8, minWidth: 160, zIndex: 50, boxShadow: 'var(--shadow-lg)',
                  }}>
                    <button className="btn btn-ghost w-full" style={{ justifyContent: 'flex-start', gap: 8 }} onClick={handleArchive}>
                      <Archive size={14} />
                      {project.status === 'archived' ? 'Unarchive' : 'Archive'}
                    </button>
                    <div className="divider" style={{ margin: '4px 0' }} />
                    <button className="btn btn-ghost w-full" style={{ justifyContent: 'flex-start', gap: 8, color: 'var(--danger)' }} onClick={handleDeleteProject}>
                      <Trash2 size={14} /> Delete Project
                    </button>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>

        {project.description && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: -16 }}>{project.description}</p>
        )}
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-board">
          {COLUMNS.map(col => (
            <div key={col.id} className="kanban-column">
              <div className="kanban-column-header">
                <div className="kanban-column-title">
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: col.color, display: 'inline-block', flexShrink: 0,
                  }} />
                  {col.label}
                </div>
                <span className="kanban-column-count">{tasksByStatus(col.id).length}</span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`kanban-drop-zone ${snapshot.isDraggingOver ? 'is-over' : ''}`}
                  >
                    {tasksByStatus(col.id).map((task, index) => (
                      <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...provided.draggableProps.style,
                              opacity: snapshot.isDragging ? 0.85 : 1,
                            }}
                          >
                            <TaskCard
                              task={task}
                              onClick={() => setSelectedTask(task)}
                              canDelete={isAdmin || task.creator_id === user?.id}
                              onDelete={() => handleDeleteTask(task.id)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {tasksByStatus(col.id).length === 0 && !snapshot.isDraggingOver && (
                      <div style={{
                        border: '1px dashed var(--border)', borderRadius: 8,
                        padding: '20px', textAlign: 'center',
                        color: 'var(--text-muted)', fontSize: '0.75rem',
                      }}>
                        Drop tasks here
                      </div>
                    )}
                  </div>
                )}
              </Droppable>

              <button
                className="btn btn-ghost btn-sm w-full"
                style={{ justifyContent: 'center', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', borderRadius: 0, marginTop: 4, paddingTop: 10 }}
                onClick={() => setShowCreateTask(true)}
              >
                <Plus size={12} /> Add
              </button>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Modals */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projectMembers={project.members || []}
          onClose={() => setSelectedTask(null)}
          onUpdate={updated => {
            setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
            setSelectedTask(null);
          }}
          onDelete={() => handleDeleteTask(selectedTask.id)}
          canDelete={isAdmin || selectedTask.creator_id === user?.id}
        />
      )}

      {showMembers && (
        <MemberModal
          project={project}
          members={project.members || []}
          onClose={() => setShowMembers(false)}
          onUpdate={() => { loadProject(); }}
          canManage={isAdmin}
        />
      )}

      {showCreateTask && (
        <CreateTaskModal
          projectId={id}
          projectMembers={project.members || []}
          onClose={() => setShowCreateTask(false)}
          onCreate={task => setTasks(prev => [task, ...prev])}
        />
      )}
    </div>
  );
}
