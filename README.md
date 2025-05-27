# FileShare - Ứng dụng chia sẻ file

Ứng dụng web cho phép người dùng tải lên, quản lý và chia sẻ file một cách dễ dàng và an toàn.

![FileShare Screenshot](screenshot.png)

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
   git clone <repository-url>
   cd file-sharing-app
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
   git clone <repository-url>
   cd file-sharing-app
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

### Khắc phục sự cố Docker

Nếu bạn gặp lỗi khi chạy Docker Compose, hãy thử các bước sau:

1. Đảm bảo Docker Desktop đã được cài đặt và đang chạy
2. Kiểm tra lỗi trong Docker Desktop logs
3. Khởi động lại Docker Desktop
4. Nếu vẫn gặp vấn đề, hãy sử dụng phương pháp cài đặt thủ công

## Cấu trúc dự án

```
file-sharing-app/
├── client/                # Frontend React
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── utils/
│   │   └── ...
│   └── ...
├── server/                # Backend Node.js/Express
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── uploads/
│   └── ...
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

Tên của bạn - email@example.com

Link dự án: [https://github.com/yourusername/file-sharing-app](https://github.com/yourusername/file-sharing-app) 