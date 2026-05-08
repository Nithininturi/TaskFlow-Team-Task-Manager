const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { searchUsers } = require('../controllers/userController');

router.use(authenticateToken);

router.get('/search', searchUsers);

module.exports = router;
