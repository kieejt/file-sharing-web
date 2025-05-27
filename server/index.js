require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB, closeDatabase } = require('./config/db');
const fs = require('fs');

// Đảm bảo thư mục uploads ở thư mục gốc tồn tại
const rootUploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(rootUploadsDir)) {
  fs.mkdirSync(rootUploadsDir, { recursive: true });
}

// Khởi tạo app Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ thư mục uploads ở thư mục gốc
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files'));

// Xử lý lỗi
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Có lỗi xảy ra trên server',
    error: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

// Serve static assets nếu ở production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

// Cổng server
const PORT = process.env.PORT || 5000;

// Kết nối database và khởi động server
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`Server đang chạy trên cổng ${PORT}`);
    });
    
    // Xử lý khi tắt ứng dụng
    process.on('SIGINT', async () => {
      await closeDatabase();
      process.exit(0);
    });
  } catch (error) {
    console.error('Không thể kết nối đến database:', error);
  }
};

startServer();