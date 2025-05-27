const express = require('express');
const {
  uploadFile,
  getFiles,
  getFile,
  updateFile,
  deleteFile,
  downloadFile,
  getSharedFile,
  downloadSharedFile
} = require('../controllers/files');
const { protect, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Routes yêu cầu xác thực
router.post('/', protect, upload.single('file'), uploadFile);
router.get('/', protect, getFiles);
router.put('/:id', protect, updateFile);
router.delete('/:id', protect, deleteFile);

// Routes cho phép truy cập công khai (với xác thực tùy chọn)
router.get('/:id', optionalAuth, getFile);
router.get('/:id/download', optionalAuth, downloadFile);

// Routes công khai cho chia sẻ file
router.get('/share/:shareId', getSharedFile);
router.get('/share/:shareId/download', downloadSharedFile);

module.exports = router; 