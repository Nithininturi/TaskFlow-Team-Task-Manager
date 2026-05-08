const db = require('../config/db');

// Helper: check if user is member of a project
const isProjectMember = async (projectId, userId) => {
  const result = await db.query(
    `SELECT pm.role FROM project_members pm WHERE pm.project_id = $1 AND pm.user_id = $2`,
    [projectId, userId]
  );
  return result.rows[0] || null;
};

// GET /api/tasks/dashboard - Dashboard stats + my tasks + recent activity
const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Stats
    const stats = await db.query(
      `SELECT
        COUNT(*) FILTER (WHERE t.assignee_id = $1 AND t.status != 'done') as active_tasks,
        COUNT(*) FILTER (WHERE t.assignee_id = $1 AND t.status = 'done') as completed_tasks,
        COUNT(*) FILTER (WHERE t.assignee_id = $1 AND t.status != 'done' AND t.due_date < NOW()) as overdue_tasks,
        COUNT(DISTINCT p.id) FILTER (WHERE p.owner_id = $1 OR pm.user_id = $1) as project_count
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
       WHERE p.owner_id = $1 OR pm.user_id = $1`,
      [userId]
    );

    // My assigned tasks sorted by due date
    const myTasks = await db.query(
      `SELECT t.*, p.name as project_name,
              u.username as assignee_username, u.email as assignee_email
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.assignee_id
       WHERE t.assignee_id = $1 AND t.status != 'done'
       ORDER BY t.due_date ASC NULLS LAST, t.priority DESC
       LIMIT 20`,
      [userId]
    );

    // Recent activity (recent task updates across accessible projects)
    const recentActivity = await db.query(
      `SELECT t.id, t.title, t.status, t.updated_at, p.name as project_name,
              u.username as assignee_username,
              c.username as creator_username
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.assignee_id
       LEFT JOIN users c ON c.id = t.creator_id
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
       WHERE p.owner_id = $1 OR pm.user_id = $1
       ORDER BY t.updated_at DESC
       LIMIT 20`,
      [userId]
    );

    res.json({
      stats: stats.rows[0],
      myTasks: myTasks.rows,
      recentActivity: recentActivity.rows,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/tasks - Create a task
const createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, due_date, project_id, assignee_id } = req.body;

    if (!title || !project_id) {
      return res.status(400).json({ error: 'Title and project_id are required' });
    }

    // Check membership
    const member = await isProjectMember(project_id, req.user.id);
    const project = await db.query('SELECT owner_id FROM projects WHERE id = $1', [project_id]);
    if (project.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    if (!member && project.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not a member of this project' });
    }

    const result = await db.query(
      `INSERT INTO tasks (title, description, status, priority, due_date, project_id, assignee_id, creator_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        title,
        description || null,
        status || 'todo',
        priority || 'medium',
        due_date || null,
        project_id,
        assignee_id || null,
        req.user.id,
      ]
    );

    // Get full task with joins
    const fullTask = await db.query(
      `SELECT t.*, u.username as assignee_username, c.username as creator_username, p.name as project_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_id
       LEFT JOIN users c ON c.id = t.creator_id
       LEFT JOIN projects p ON p.id = t.project_id
       WHERE t.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(fullTask.rows[0]);
  } catch (err) {
    next(err);
  }
};

// GET /api/tasks/project/:projectId - Get tasks for a project (with filters)
const getProjectTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, priority, assignee_id } = req.query;

    // Check access
    const project = await db.query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
    if (project.rows.length === 0) return res.status(404).json({ error: 'Project not found' });

    const member = await isProjectMember(projectId, req.user.id);
    if (!member && project.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = `
      SELECT t.*, u.username as assignee_username, u.email as assignee_email,
             c.username as creator_username
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assignee_id
      LEFT JOIN users c ON c.id = t.creator_id
      WHERE t.project_id = $1
    `;
    const params = [projectId];
    let paramIdx = 2;

    if (status) {
      query += ` AND t.status = $${paramIdx++}`;
      params.push(status);
    }
    if (priority) {
      query += ` AND t.priority = $${paramIdx++}`;
      params.push(priority);
    }
    if (assignee_id) {
      query += ` AND t.assignee_id = $${paramIdx++}`;
      params.push(assignee_id);
    }

    query += ' ORDER BY t.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// PUT /api/tasks/:id - Update a task
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, due_date, assignee_id } = req.body;

    const taskResult = await db.query(
      `SELECT t.*, p.owner_id FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = $1`,
      [id]
    );
    if (taskResult.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const task = taskResult.rows[0];
    const member = await isProjectMember(task.project_id, req.user.id);
    if (!member && task.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not a member of this project' });
    }

    const result = await db.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           priority = COALESCE($4, priority),
           due_date = COALESCE($5, due_date),
           assignee_id = COALESCE($6, assignee_id)
       WHERE id = $7
       RETURNING *`,
      [title, description, status, priority, due_date, assignee_id, id]
    );

    const fullTask = await db.query(
      `SELECT t.*, u.username as assignee_username, c.username as creator_username, p.name as project_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_id
       LEFT JOIN users c ON c.id = t.creator_id
       LEFT JOIN projects p ON p.id = t.project_id
       WHERE t.id = $1`,
      [result.rows[0].id]
    );

    res.json(fullTask.rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/tasks/:id - Delete a task (creator or project admin)
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    const taskResult = await db.query(
      `SELECT t.*, p.owner_id as project_owner FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = $1`,
      [id]
    );
    if (taskResult.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const task = taskResult.rows[0];
    const member = await isProjectMember(task.project_id, req.user.id);

    const isCreator = task.creator_id === req.user.id;
    const isProjectOwner = task.project_owner === req.user.id;
    const isProjectAdmin = member?.role === 'admin';
    const isGlobalAdmin = req.user.role === 'admin';

    if (!isCreator && !isProjectOwner && !isProjectAdmin && !isGlobalAdmin) {
      return res.status(403).json({ error: 'Only the task creator or project admin can delete this task' });
    }

    await db.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// GET /api/tasks/:id/comments - Get task comments
const getComments = async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await db.query('SELECT project_id FROM tasks WHERE id = $1', [id]);
    if (task.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const project = await db.query('SELECT owner_id FROM projects WHERE id = $1', [task.rows[0].project_id]);
    const member = await isProjectMember(task.rows[0].project_id, req.user.id);
    if (!member && project.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      `SELECT c.*, u.username as author_username, u.email as author_email
       FROM comments c JOIN users u ON u.id = c.author_id
       WHERE c.task_id = $1
       ORDER BY c.created_at ASC`,
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// POST /api/tasks/:id/comments - Add a comment
const addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) return res.status(400).json({ error: 'Comment content is required' });

    const task = await db.query('SELECT project_id FROM tasks WHERE id = $1', [id]);
    if (task.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const project = await db.query('SELECT owner_id FROM projects WHERE id = $1', [task.rows[0].project_id]);
    const member = await isProjectMember(task.rows[0].project_id, req.user.id);
    if (!member && project.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not a member of this project' });
    }

    const result = await db.query(
      `INSERT INTO comments (task_id, author_id, content) VALUES ($1, $2, $3)
       RETURNING *, (SELECT username FROM users WHERE id = $2) as author_username`,
      [id, req.user.id, content]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard, createTask, getProjectTasks, updateTask, deleteTask, getComments, addComment };
