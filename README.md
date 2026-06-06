# DurianCare SmartFarm Mobile

Ứng dụng React Native Expo mô phỏng quy trình quản lý bệnh sầu riêng cho Chủ
vườn (`OWNER`) và Kỹ sư nông nghiệp (`ENGINEER`). Phiên bản hiện tại chỉ dùng
mock data và state cục bộ, chưa kết nối API, microservice hay Socket.io.

## Luồng nghiệp vụ

- Đăng nhập bằng email, mật khẩu và vai trò.
- Lưu JWT giả bằng AsyncStorage và điều hướng theo quyền người dùng.
- Dashboard riêng cho Chủ vườn và Kỹ sư.
- Chụp ảnh lá, mô phỏng AI inference trong 1,2 giây và tạo bounding box.
- Đẩy kết quả quét vào kênh chat dùng chung.
- Kỹ sư tạo phác đồ nhiều ngày và gửi dưới dạng card trong chat.
- Bot hiển thị nhắc lịch điều trị.
- Feed cộng đồng hỗ trợ thích và bình luận bằng state.
- Đăng bài cộng đồng bằng ảnh và dữ liệu mock cục bộ.
- OWNER xem báo cáo cảm biến, mời, phê duyệt và thu hồi quyền kỹ sư.
- Biểu đồ mini theo giờ dùng dữ liệu nhiệt độ 28°C - 32°C và độ ẩm đất 70% - 85%.
- Điều hướng phiên đăng nhập chỉ chạy sau khi root navigation đã mount.
- Hồ sơ vụ mùa và QR định danh nông sản động.

## Công nghệ

- Expo SDK 54
- Expo Router
- React Native + TypeScript
- AsyncStorage
- Expo Camera
- React Native QR Code SVG

## Khởi chạy

```bash
npm install
npm start
```

## Kiểm tra

```bash
npm run validate
npx expo export --platform web
```

## Cấu trúc chính

```text
app/                 Routes và tab navigation
assets/images/       App assets và ảnh feed mock
src/features/        Các màn hình nghiệp vụ
src/constants/       Dữ liệu cảm biến mock đồng bộ Web Client
src/navigation/      Navigation gate và safe navigation hook
src/session/         Phiên đăng nhập và JWT giả
src/workspace/       State chat, cảnh báo và phác đồ
src/theme/           Design tokens DurianCare
```
