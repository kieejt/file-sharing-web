# FileShare - Ứng dụng chia sẻ file

Ứng dụng web cho phép người dùng tải lên, quản lý và chia sẻ file một cách dễ dàng và an toàn.

## Tính năng chính

- Đăng ký và đăng nhập người dùng
- Tải lên file với giới hạn kích thước
- Quản lý file (xem, cập nhật, xóa)
- Chia sẻ file với người khác thông qua liên kết
- Tìm kiếm file
- Cập nhật thông tin cá nhân và mật khẩu
- Giao diện người dùng thân thiện và responsive

## Công nghệ sử dụng

### Frontend
- React
- React Router
- Tailwind CSS
- Axios
- React Dropzone
- React Toastify

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT Authentication
- Multer (xử lý upload file)
- Bcrypt (mã hóa mật khẩu)
- Nodemailer (gửi email)

## Cài đặt và chạy

### Yêu cầu
- Node.js (v14+)
- MongoDB
- npm hoặc yarn

### Cài đặt thủ công

1. Clone repository:
   ```
   git clone https://github.com/kieejt/file-sharing-web.git
   cd file-sharing-web
   ```

2. Cài đặt dependencies cho cả client và server:
   ```
   # Cài đặt dependencies cho server
   cd server
   npm install

   # Cài đặt dependencies cho client
   cd ../client
   npm install
   ```

3. Tạo file `.env` cho cả client và server:
   ```
   # Tạo .env cho server
   cd ../server
   cp .env.example .env

   # Tạo .env cho client
   cd ../client
   cp .env.example .env
   ```

4. Chạy ứng dụng:
   ```
   # Terminal 1: Chạy server
   cd server
   npm run dev

   # Terminal 2: Chạy client
   cd client
   npm start
   ```

5. Truy cập ứng dụng tại `http://localhost:3000`

### Cài đặt với Docker

> **Lưu ý**: Bạn cần cài đặt Docker Desktop và đảm bảo nó đang chạy trước khi thực hiện các bước sau.

1. Clone repository:
   ```
   git clone https://github.com/kieejt/file-sharing-web.git
   cd file-sharing-web
   ```

2. Tạo file `.env` từ file `.env.docker`:
   ```
   cp .env.docker .env
   ```

3. Chạy ứng dụng với Docker Compose:
   ```
   docker-compose up -d
   ```

4. Truy cập ứng dụng tại `http://localhost:3000`

5. Dừng ứng dụng:
   ```
   docker-compose down
   ```

## Cấu trúc dự án

```
file-sharing-web/
├── client/                # Frontend React
│   ├── public/
│   ├── src/
│   │   ├── components/    # Các component React
│   │   ├── context/      # Context API
│   │   ├── pages/        # Các trang
│   │   ├── utils/        # Tiện ích
│   │   └── ...
│   └── ...
├── server/                # Backend Node.js/Express
│   ├── config/           # Cấu hình
│   ├── controllers/      # Xử lý logic
│   ├── middleware/       # Middleware
│   ├── models/           # Mô hình dữ liệu
│   ├── routes/           # Định tuyến API
│   ├── scripts/          # Scripts
│   └── ...
├── uploads/              # Thư mục lưu file
├── docker-compose.yml    # Cấu hình Docker
└── ...
```

## API Documentation

Xem chi tiết API trong [server/README.md](server/README.md).

## Đóng góp

Xem hướng dẫn đóng góp trong [CONTRIBUTING.md](CONTRIBUTING.md).

## Changelog

Xem lịch sử thay đổi trong [CHANGELOG.md](CHANGELOG.md).

## Giấy phép

Dự án này được cấp phép theo giấy phép MIT - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## Liên hệ

Link dự án: [https://github.com/kieejt/file-sharing-web](https://github.com/kieejt/file-sharing-web) 
