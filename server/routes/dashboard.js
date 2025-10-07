const express = require('express');
const router = express.Router();
const { getDashboard } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/dashboard
// @desc    Get dashboard data
// @access  Private
router.get('/', protect, getDashboard);

// @route   GET /api/dashboard/online-users
// @desc    Get online users count
// @access  Private
router.get('/online-users', protect, (req, res) => {
  // Access the onlineUsers map from the server
  const io = req.app.get('io');
  const onlineUsers = req.app.get('onlineUsers');
  
  const count = onlineUsers ? onlineUsers.size : 0;
  
  res.json({
    count: count,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;