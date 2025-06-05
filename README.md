# FileShare - Ứng dụng chia sẻ file

Ứng dụng web cho phép người dùng tải lên, quản lý và chia sẻ file một cách dễ dàng và an toàn.

## Phiên bản Mobile

Dự án cũng bao gồm một ứng dụng di động được xây dựng bằng React Native (Expo) cho phép người dùng truy cập và quản lý file trên thiết bị di động của họ.

Các tính năng chính của ứng dụng mobile bao gồm:

- Đăng ký và đăng nhập người dùng.
- Xem danh sách file đã tải lên.
- Tải lên file mới từ thiết bị di động.
- Xem chi tiết file, bao gồm preview ảnh.
- Tải xuống file về thiết bị.
- Đổi tên file.
- Xóa file.
- Chia sẻ file (tạo link web đến trang xem file).

Để biết chi tiết về cách cài đặt và chạy ứng dụng mobile, vui lòng xem [mobile/README.md](mobile/README.md).

## Tính năng chính (Phiên bản Web)

- Đăng ký và đăng nhập người dùng
- Tải lên file với giới hạn kích thước
- Quản lý file (xem, cập nhật, xóa)
- Chia sẻ file với người khác thông qua liên kết
- Tìm kiếm file
- Cập nhật thông tin cá nhân và mật khẩu
- Giao diện người dùng thân thiện và responsive

## Công nghệ sử dụng

### Frontend (Web)
- React
- React Router
- Tailwind CSS
- Axios
- React Dropzone
- React Toastify

### Frontend (Mobile)
- React Native
- Expo
- React Native Paper

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
- Expo Go (cho mobile)

### Cài đặt thủ công

1. Clone repository:
   ```bash
   git clone https://github.com/kieejt/file-sharing-web.git
   cd file-sharing-web
   ```

2. Cài đặt dependencies cho cả client, server và mobile:
   ```bash
   # Cài đặt dependencies cho server
   cd server
   npm install

   # Cài đặt dependencies cho client
   cd ../client
   npm install

   # Cài đặt dependencies cho mobile
   cd ../mobile
   npm install
   ```
3. Cấu hình MongoDB:
   - Khởi động MongoDB Service
   - Kết nối tới MongoDB local với connection string: `mongodb://localhost:27017`
   - Tạo database mới với tên "fileshare"

4. Tạo file `.env` cho client, server và mobile (nếu cần cấu hình API URL):
   ```bash
   # Tạo .env cho server
   cd ../server
   cp .env.example .env

   # Tạo .env cho client
   cd ../client
   cp .env.example .env
   
   # Đối với mobile, cấu hình API URL thường nằm trong app.json hoặc sử dụng biến môi trường Expo.
   # Nếu bạn sử dụng .env cho mobile, hãy tạo file đó tại thư mục mobile.
   # cd ../mobile
   # cp .env.example .env # Nếu có file .env.example cho mobile
   ```

5. Chạy ứng dụng:
   ```bash
   # Terminal 1: Chạy server
   cd server
   npm run dev

   # Terminal 2: Chạy client (Web)
   cd ../client
   npm start

   # Terminal 3: Chạy client (Mobile) - trong một terminal/cửa sổ khác
   cd ../mobile
   npx expo start
   ```

6. Truy cập ứng dụng web tại `http://localhost:3000`. Sử dụng ứng dụng Expo Go trên điện thoại hoặc simulator/emulator để truy cập ứng dụng mobile.

### Cài đặt với Docker

> **Lưu ý**: Cấu hình Docker Compose hiện tại chỉ bao gồm server và client web. Để chạy mobile, bạn cần chạy thủ công như hướng dẫn ở trên.

> **Lưu ý**: Bạn cần cài đặt Docker Desktop và đảm bảo nó đang chạy trước khi thực hiện các bước sau.

1. Clone repository:
   ```bash
   git clone https://github.com/kieejt/file-sharing-web.git
   cd file-sharing-web
   ```

2. Tạo file `.env` từ file `.env.docker`:
   ```bash
   cp .env.docker .env
   ```

3. Chạy ứng dụng Web và Server với Docker Compose:
   ```bash
   docker-compose up -d
   ```

4. Truy cập ứng dụng web tại `http://localhost:3000`

5. Dừng ứng dụng Docker:
   ```bash
   docker-compose down
   ```

## Cấu trúc dự án

```
file-sharing-web/
├── client/                # Frontend React (Web)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── utils/
│   │   └── ...
│   └── ...
├── mobile/                # Frontend React Native (Mobile)
│   ├── assets/
│   ├── src/
│   │   ├── components/
│   │   ├── screens/
│   │   ├── services/
│   │   ├── types/
│   │   └── ...
│   ├── app.json
│   ├── README.md
│   └── ...
├── server/                # Backend Node.js/Express
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   └── ...
├── uploads/              # Thư mục lưu file (Server)
├── docker-compose.yml    # Cấu hình Docker Compose
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
