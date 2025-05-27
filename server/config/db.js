const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/fileshare';

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(`MongoDB đã kết nối thành công: ${mongoose.connection.host}`);
  } catch (error) {
    console.error(`Lỗi kết nối MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Hàm đóng kết nối khi tắt ứng dụng
const closeDatabase = async () => {
  await mongoose.connection.close();
};

module.exports = { connectDB, closeDatabase }; 