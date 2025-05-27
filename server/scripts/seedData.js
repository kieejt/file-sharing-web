require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { User, File } = require('../models');

async function seedData() {
  try {
    // Kết nối đến MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Bắt đầu tạo dữ liệu mẫu...');

    // Tạo người dùng mẫu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin'
    });

    const user = await User.create({
      name: 'Test User',
      email: 'user@example.com',
      password: hashedPassword,
      role: 'user'
    });

    console.log('Đã tạo người dùng mẫu.');

    // Tạo file mẫu
    await File.create({
      name: 'Tài liệu mẫu',
      originalName: 'sample-document.pdf',
      type: 'application/pdf',
      size: 1024 * 1024, // 1MB
      path: 'uploads/sample-document.pdf',
      description: 'Đây là một tài liệu PDF mẫu',
      isPublic: true,
      userId: user._id
    });

    await File.create({
      name: 'Hình ảnh mẫu',
      originalName: 'sample-image.jpg',
      type: 'image/jpeg',
      size: 512 * 1024, // 512KB
      path: 'uploads/sample-image.jpg',
      description: 'Đây là một hình ảnh mẫu',
      isPublic: false,
      userId: user._id
    });

    console.log('Đã tạo file mẫu.');
    console.log('Tạo dữ liệu mẫu hoàn tất.');
    
    // Đóng kết nối
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Lỗi khi tạo dữ liệu mẫu:', error);
    process.exit(1);
  }
}

seedData(); 