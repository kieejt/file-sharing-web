require('dotenv').config();
const mongoose = require('mongoose');

async function initDb() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/fileshare';
    
    // Kết nối đến MongoDB
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Kết nối database thành công.');

    // Xóa tất cả dữ liệu hiện có (cẩn thận khi sử dụng trong môi trường production)
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
      console.log(`Đã xóa dữ liệu trong collection ${collection.collectionName}`);
    }

    console.log('Khởi tạo database hoàn tất.');
    
    // Đóng kết nối
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Không thể kết nối hoặc khởi tạo database:', error);
    process.exit(1);
  }
}

initDb(); 