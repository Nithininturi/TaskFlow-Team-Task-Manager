const db = require('../config/db');

// GET /api/users/search?q= - Search users by username or email
const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const result = await db.query(
      `SELECT id, username, email, role FROM users
       WHERE username ILIKE $1 OR email ILIKE $1
       ORDER BY username ASC
       LIMIT 10`,
      [`%${q}%`]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { searchUsers };
