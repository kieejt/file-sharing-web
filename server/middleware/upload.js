const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');

// Đảm bảo thư mục uploads tồn tại
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Hàm xử lý tên file tiếng Việt
const sanitizeFileName = (fileName) => {
  try {
    // Decode URI component để xử lý các ký tự đặc biệt và tiếng Việt
    const decodedName = decodeURIComponent(fileName);
    // Thay thế các ký tự không hợp lệ trong tên file
    return decodedName.replace(/[/\\?%*:|"<>]/g, '-');
  } catch (error) {
    // Nếu không decode được, trả về tên gốc đã được làm sạch
    console.error('Lỗi khi decode tên file:', error);
    return fileName.replace(/[/\\?%*:|"<>]/g, '-');
  }
};

// Cấu hình lưu trữ file
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Lưu file vào thư mục uploads ở thư mục gốc
    cb(null, path.join(__dirname, '../../uploads/'));
  },
  filename: function(req, file, cb) {
    // Tạo tên file với timestamp để tránh trùng lặp
    const timestamp = Date.now();
    // Xử lý tên file với encoding UTF-8
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const sanitizedName = sanitizeFileName(originalName);
    const fileName = `${timestamp}-${sanitizedName}`;
    cb(null, fileName);
  }
});

// Kiểm tra loại file
const fileFilter = (req, file, cb) => {
  // Cho phép tất cả các loại file
  cb(null, true);
};

// Khởi tạo middleware upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // Mặc định 5MB
  },
  fileFilter: fileFilter
});

module.exports = upload; 