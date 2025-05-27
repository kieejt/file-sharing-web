# FileShare - Client

Frontend cho ứng dụng chia sẻ file.

## Công nghệ sử dụng

- React
- React Router
- Tailwind CSS
- Axios
- React Dropzone
- React Toastify

## Cài đặt

1. Clone repository:
   ```
   git clone <repository-url>
   cd file-sharing-app/client
   ```

2. Cài đặt dependencies:
   ```
   npm install
   ```

3. Tạo file `.env` dựa trên file `.env.example`:
   ```
   cp .env.example .env
   ```

4. Chạy ứng dụng:
   ```
   npm start
   ```

## Cấu trúc dự án

```
client/
├── public/                # Static files
├── src/
│   ├── components/        # Các component React
│   │   ├── FileCard.js
│   │   ├── FileUploader.js
│   │   ├── Footer.js
│   │   ├── Navbar.js
│   │   └── ProtectedRoute.js
│   ├── context/           # Context API
│   │   └── AuthContext.js
│   ├── pages/             # Các trang
│   │   ├── Dashboard.js
│   │   ├── FileDetails.js
│   │   ├── Home.js
│   │   ├── Login.js
│   │   ├── NotFound.js
│   │   ├── Profile.js
│   │   ├── Register.js
│   │   └── SharedFile.js
│   ├── utils/             # Tiện ích
│   │   └── API.js
│   ├── App.js             # Component chính
│   ├── index.js           # Entry point
│   └── index.css          # Global styles
└── ...
```

## Tính năng

- Đăng ký và đăng nhập người dùng
- Tải lên file với giới hạn kích thước
- Quản lý file (xem, cập nhật, xóa)
- Chia sẻ file với người khác thông qua liên kết
- Tìm kiếm file
- Cập nhật thông tin cá nhân và mật khẩu 