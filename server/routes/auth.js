const express = require('express');
const {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword
} = require('../controllers/auth');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Các routes công khai
router.post('/register', register);
router.post('/login', login);

// Các routes yêu cầu xác thực
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);

module.exports = router; 