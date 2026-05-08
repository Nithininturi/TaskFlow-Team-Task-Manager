const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getDashboard,
  createTask,
  getProjectTasks,
  updateTask,
  deleteTask,
  getComments,
  addComment,
} = require('../controllers/taskController');

router.use(authenticateToken);

router.get('/dashboard', getDashboard);
router.post('/', createTask);
router.get('/project/:projectId', getProjectTasks);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.get('/:id/comments', getComments);
router.post('/:id/comments', addComment);

module.exports = router;
