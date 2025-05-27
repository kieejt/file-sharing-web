# FileShare - Server

Backend cho ứng dụng chia sẻ file.

## Công nghệ sử dụng

- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT Authentication
- Multer (xử lý upload file)
- Bcrypt (mã hóa mật khẩu)
- Nodemailer (gửi email)
- Docker (tùy chọn)

## Yêu cầu hệ thống

### Cách 1: Chạy trực tiếp trên máy
1. Node.js (phiên bản 14 trở lên)
2. MongoDB Community Server

### Cách 2: Chạy với Docker
1. Docker Desktop
2. Docker Compose

## Cài đặt và Chạy ứng dụng

### Cách 1: Chạy trực tiếp trên máy

1. Clone repository:
   ```
   git clone https://github.com/kieejt/file-sharing-web.git
   cd file-sharing-web/server
   ```

2. Cài đặt dependencies:
   ```
   npm install
   ```

3. Cấu hình MongoDB:
   - Khởi động MongoDB Service
   - Kết nối tới MongoDB local với connection string: `mongodb://localhost:27017`
   - Tạo database mới với tên "fileshare"

4. Tạo file `.env` dựa trên file `.env.example`:
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
   FILE_UPLOAD_PATH=../uploads
   MAX_FILE_SIZE=10000000
   ```

5. Khởi tạo dữ liệu mẫu (tùy chọn):
   ```
   npm run seed
   ```

6. Chạy ứng dụng:
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
   - Khởi động Docker Desktop

2. Clone repository và di chuyển vào thư mục dự án:
   ```
   git clone https://github.com/kieejt/file-sharing-web.git
   cd file-sharing-web
   ```

3. Tạo file `.env` trong thư mục gốc:
   ```
   cp .env.docker .env
   ```

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

## Cấu trúc dự án

```
server/
├── config/                # Cấu hình
│   └── db.js             # Cấu hình kết nối MongoDB
├── controllers/           # Xử lý logic
│   ├── auth.js           # Xử lý đăng ký, đăng nhập
│   └── files.js          # Xử lý upload và quản lý file
├── middleware/            # Middleware
│   ├── auth.js           # Xác thực JWT
│   ├── error.js          # Xử lý lỗi
│   └── upload.js         # Xử lý upload file
├── models/                # Mô hình dữ liệu
│   ├── File.js           # Model File
│   └── User.js           # Model User
├── routes/                # Định tuyến API
│   ├── auth.js           # Route xác thực
│   └── files.js          # Route quản lý file
├── scripts/               # Scripts
│   ├── initDb.js         # Khởi tạo database
│   └── seedData.js       # Dữ liệu mẫu
└── index.js              # Entry point
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký người dùng mới
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `POST /api/auth/refresh-token` - Làm mới token
- `POST /api/auth/forgot-password` - Quên mật khẩu
- `POST /api/auth/reset-password` - Đặt lại mật khẩu

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