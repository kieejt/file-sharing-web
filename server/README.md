# FileShare - Server

Backend cho ứng dụng chia sẻ file.

## Công nghệ sử dụng

- Node.js
- Express.js
- MongoDB (Mongoose)
- MongoDB Compass
- JWT Authentication
- Multer (xử lý upload file)
- Bcrypt (mã hóa mật khẩu)
- Nodemailer (gửi email)
- Docker (tùy chọn)

## Yêu cầu hệ thống

### Cách 1: Chạy trực tiếp trên máy
1. Node.js (phiên bản 14 trở lên)
2. MongoDB Community Server
3. MongoDB Compass (GUI cho MongoDB)

### Cách 2: Chạy với Docker
1. Docker Desktop
2. Docker Compose

## Cài đặt và Chạy ứng dụng

### Cách 1: Chạy trực tiếp trên máy

1. Clone repository:
   ```
   git clone <repository-url>
   cd file-sharing-app/server
   ```

2. Cài đặt dependencies:
   ```
   npm install
   ```

3. Cài đặt MongoDB:
   - Tải và cài đặt MongoDB Community Server từ: https://www.mongodb.com/try/download/community
   - Tải và cài đặt MongoDB Compass từ: https://www.mongodb.com/try/download/compass

4. Cấu hình MongoDB:
   - Khởi động MongoDB Service
   - Mở MongoDB Compass
   - Kết nối tới MongoDB local với connection string: `mongodb://localhost:27017`
   - Tạo database mới với tên "fileshare"

5. Tạo file `.env` dựa trên file `.env.example`:
   ```
   cp .env.example .env
   ```
   
   Cập nhật các biến môi trường trong file `.env`:
   ```
   NODE_ENV=development
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/fileshare
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRE=30d
   FILE_UPLOAD_PATH=./uploads
   MAX_FILE_SIZE=10000000
   ```

6. Khởi tạo dữ liệu mẫu (tùy chọn):
   ```
   npm run seed
   ```

7. Chạy ứng dụng:
   - Môi trường phát triển:
     ```
     npm run dev
     ```
   - Môi trường sản xuất:
     ```
     npm start
     ```

### Cách 2: Chạy với Docker

1. Cài đặt Docker:
   - Tải và cài đặt Docker Desktop từ: https://www.docker.com/products/docker-desktop
   - Khởi động Docker Desktop và đợi cho đến khi nó hoàn toàn khởi động (biểu tượng Docker trong system tray chuyển sang màu xanh)

2. Clone repository và di chuyển vào thư mục dự án:
   ```
   git clone <repository-url>
   cd file-sharing-app
   ```

3. Tạo file `.env` trong thư mục gốc:
   ```
   cp .env.example .env
   ```
   Cập nhật các biến môi trường cần thiết trong file `.env`

4. Build và chạy containers:
   ```
   docker-compose up -d
   ```

5. Kiểm tra logs:
   ```
   docker-compose logs -f
   ```

6. Dừng containers:
   ```
   docker-compose down
   ```

Lưu ý: Nếu bạn gặp lỗi khi chạy docker-compose, hãy kiểm tra:
- Docker Desktop đã được cài đặt và đang chạy
- Không có ứng dụng nào đang sử dụng các cổng 27017 (MongoDB), 5000 (Backend) và 3000 (Frontend)
- Windows Subsystem for Linux 2 (WSL2) đã được cài đặt (cho Windows)

## Cấu trúc dự án

```
server/
├── config/                # Cấu hình
│   └── db.js
├── controllers/           # Xử lý logic
│   ├── authController.js
│   ├── fileController.js
│   └── userController.js
├── middleware/            # Middleware
│   ├── auth.js
│   ├── errorHandler.js
│   └── upload.js
├── models/                # Mô hình dữ liệu
│   ├── File.js
│   └── User.js
├── routes/                # Định tuyến API
│   ├── authRoutes.js
│   ├── fileRoutes.js
│   └── userRoutes.js
├── utils/                 # Tiện ích
│   ├── email.js
│   └── validators.js
├── uploads/               # Thư mục lưu file
├── scripts/               # Scripts
│   ├── initDb.js
│   └── sampleData.js
├── app.js                 # Cấu hình Express
└── server.js              # Entry point
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký người dùng mới
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `POST /api/auth/refresh-token` - Làm mới token
- `POST /api/auth/forgot-password` - Quên mật khẩu
- `POST /api/auth/reset-password` - Đặt lại mật khẩu

### Users
- `GET /api/users/me` - Lấy thông tin người dùng hiện tại
- `PUT /api/users/me` - Cập nhật thông tin người dùng
- `PUT /api/users/change-password` - Thay đổi mật khẩu

### Files
- `POST /api/files` - Tải lên file mới
- `GET /api/files` - Lấy danh sách file của người dùng
- `GET /api/files/:id` - Lấy thông tin chi tiết file
- `PUT /api/files/:id` - Cập nhật thông tin file
- `DELETE /api/files/:id` - Xóa file
- `GET /api/files/shared/:shareId` - Truy cập file được chia sẻ
- `GET /api/files/download/:id` - Tải xuống file

## Tính năng

- Xác thực người dùng với JWT
- Tải lên và quản lý file
- Chia sẻ file với người dùng khác
- Giới hạn kích thước và loại file
- Gửi email thông báo
- Xử lý lỗi và validation
- Hỗ trợ tên file tiếng Việt 