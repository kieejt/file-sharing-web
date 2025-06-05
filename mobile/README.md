# Ứng dụng Chia Sẻ File - Mobile

Đây là mã nguồn cho ứng dụng di động của hệ thống chia sẻ file.

## Cài đặt

1.  Clone repository:
    ```bash
    git clone <repository_url>
    cd file-sharing-web/mobile
    ```
2.  Cài đặt dependencies:
    ```bash
    npm install
    # hoặc yarn install
    ```

## Chạy ứng dụng

1.  Đảm bảo server backend đang chạy (thường trên `http://localhost:5000`).
2.  Đảm bảo ứng dụng web đang chạy (thường trên `http://localhost:3000`).
3.  Chạy ứng dụng di động bằng Expo Go:
    ```bash
    npx expo start
    ```
4.  Sử dụng ứng dụng Expo Go trên điện thoại của bạn để quét mã QR hoặc chạy trên simulator/emulator.

## Tính năng chính

-   Đăng ký/Đăng nhập người dùng.
-   Xem danh sách file đã tải lên.
-   Tải lên file mới.
-   Xem chi tiết file, bao gồm preview ảnh, kích thước, loại, ngày tải lên.
-   Đổi tên file.
-   Xóa file.
-   Chia sẻ file (tạo link web đến trang xem file: http://localhost:3000/share/:shareId).
-   Tải xuống file từ màn hình chi tiết file.

## Cấu hình API URL

URL của API backend được cấu hình trong `mobile/app.json` hoặc thông qua biến môi trường Expo.

## Chia sẻ File qua Web

File được chia sẻ có thể truy cập qua ứng dụng web tại:
`http://localhost:3000/share/:shareId`

## Contributors

[Tên của bạn] 