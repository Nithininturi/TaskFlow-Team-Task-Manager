const db = require('../config/db');

// GET /api/projects - Get all projects the user is owner or member of
const getProjects = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT p.*, u.username as owner_username, u.email as owner_email,
              pm.role as user_role,
              COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'done') as active_task_count,
              COUNT(DISTINCT pm2.user_id) as member_count
       FROM projects p
       JOIN users u ON u.id = p.owner_id
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
       LEFT JOIN project_members pm2 ON pm2.project_id = p.id
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.owner_id = $1 OR pm.user_id = $1
       GROUP BY p.id, u.username, u.email, pm.role
       ORDER BY p.updated_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// POST /api/projects - Create a new project
const createProject = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required' });

    const result = await db.query(
      `INSERT INTO projects (name, description, owner_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description || null, req.user.id]
    );

    // Auto-add owner as admin member
    await db.query(
      `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [result.rows[0].id, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// GET /api/projects/:id - Get a single project with members
const getProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check access
    const access = await db.query(
      `SELECT 1 FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
       WHERE p.id = $2 AND (p.owner_id = $1 OR pm.user_id = $1)`,
      [req.user.id, id]
    );
    if (access.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    const project = await db.query(
      `SELECT p.*, u.username as owner_username, u.email as owner_email
       FROM projects p JOIN users u ON u.id = p.owner_id
       WHERE p.id = $1`,
      [id]
    );

    const members = await db.query(
      `SELECT u.id, u.username, u.email, u.role as global_role, pm.role as project_role, pm.joined_at
       FROM project_members pm JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1
       ORDER BY pm.joined_at ASC`,
      [id]
    );

    res.json({ ...project.rows[0], members: members.rows });
  } catch (err) {
    next(err);
  }
};

// PUT /api/projects/:id - Update project (owner or project admin)
const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    // Check if user is owner or project admin
    const access = await db.query(
      `SELECT p.owner_id, pm.role FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
       WHERE p.id = $2`,
      [req.user.id, id]
    );

    if (access.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { owner_id, role } = access.rows[0];
    if (owner_id !== req.user.id && role !== 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only project owner or admin can update this project' });
    }

    const result = await db.query(
      `UPDATE projects
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, description, status, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/projects/:id - Delete project (owner or global admin)
const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await db.query('SELECT owner_id FROM projects WHERE id = $1', [id]);
    if (project.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only project owner or admin can delete this project' });
    }

    await db.query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// POST /api/projects/:id/members - Add member by email
const addMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, role } = req.body;

    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Check if requester is owner/admin
    const access = await db.query(
      `SELECT p.owner_id, pm.role FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
       WHERE p.id = $2`,
      [req.user.id, id]
    );

    if (access.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const { owner_id, role: pmRole } = access.rows[0];
    if (owner_id !== req.user.id && pmRole !== 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only project admin can add members' });
    }

    // Find user by email
    const userResult = await db.query(
      'SELECT id, username, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found with that email' });
    }

    const targetUser = userResult.rows[0];

    // Check if already a member
    const existing = await db.query(
      'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
      [id, targetUser.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User is already a member of this project' });
    }

    await db.query(
      `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)`,
      [id, targetUser.id, role || 'member']
    );

    res.status(201).json({
      message: 'Member added successfully',
      user: targetUser,
      project_role: role || 'member',
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/projects/:id/members/:userId - Remove a member
const removeMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    const project = await db.query('SELECT owner_id FROM projects WHERE id = $1', [id]);
    if (project.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Cannot remove the owner
    if (parseInt(userId) === project.rows[0].owner_id) {
      return res.status(400).json({ error: 'Cannot remove the project owner' });
    }

    const access = await db.query(
      `SELECT pm.role FROM project_members pm WHERE pm.project_id = $1 AND pm.user_id = $2`,
      [id, req.user.id]
    );

    const isOwner = project.rows[0].owner_id === req.user.id;
    const isProjectAdmin = access.rows[0]?.role === 'admin';
    const isGlobalAdmin = req.user.role === 'admin';
    const isSelf = parseInt(userId) === req.user.id;

    if (!isOwner && !isProjectAdmin && !isGlobalAdmin && !isSelf) {
      return res.status(403).json({ error: 'Insufficient permissions to remove this member' });
    }

    const result = await db.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found in this project' });
    }

    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProjects, createProject, getProject, updateProject, deleteProject, addMember, removeMember };
