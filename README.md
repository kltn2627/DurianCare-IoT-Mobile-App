# DurianCare SmartFarm Mobile

Ứng dụng React Native Expo quản lý sức khỏe vườn sầu riêng cho Chủ vườn
(`OWNER`) và Kỹ sư nông nghiệp (`ENGINEER`). Chat, cộng đồng và phân quyền hiện
dùng state cục bộ; module Camera AI gửi ảnh thật đến FastAPI.

## Luồng nghiệp vụ

- Đăng nhập bằng email, mật khẩu và vai trò.
- Lưu JWT giả bằng AsyncStorage và điều hướng theo quyền người dùng.
- Dashboard riêng cho Chủ vườn và Kỹ sư.
- Chụp ảnh bằng Expo Camera và gửi multipart đến `/api/v1/predict-disease`.
- Chuẩn hóa kết quả FastAPI, độ tin cậy và bounding box trên ảnh chụp.
- Đẩy kết quả quét vào kênh chat dùng chung.
- Kỹ sư tạo phác đồ nhiều ngày và gửi dưới dạng card trong chat.
- Bot hiển thị nhắc lịch điều trị.
- Feed cộng đồng hỗ trợ thích và bình luận bằng state.
- Đăng bài cộng đồng bằng ảnh và dữ liệu mock cục bộ.
- OWNER xem báo cáo cảm biến, mời, phê duyệt và thu hồi quyền kỹ sư.
- Dashboard live hiển thị DHT22, độ ẩm đất và dinh dưỡng N/P/K.
- Không gian tri thức có cẩm nang VietGAP, bài viết chi tiết và zoom ảnh kỹ thuật.
- Trạm chat kép gồm trợ lý AI LangChain và phòng tư vấn Kỹ sư.
- Hai kênh chat hỗ trợ camera; phòng Kỹ sư hỗ trợ gửi vị trí phân khu.
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
cp .env.example .env
npm start
```

Đặt `EXPO_PUBLIC_API_BASE_URL` thành URL FastAPI mà điện thoại có thể truy cập:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8000
EXPO_PUBLIC_AI_CHAT_PATH=/api/v1/chat/ai
EXPO_PUBLIC_EXPERT_MEDIA_PATH=/api/v1/chat/expert/media
EXPO_PUBLIC_EXPERT_WS_URL=ws://192.168.1.10:8000/ws/chat/expert
```

Không dùng `localhost` khi chạy trên điện thoại thật. Cấu hình HTTP chỉ dành cho
mạng LAN phát triển; môi trường production nên dùng HTTPS.

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
src/constants/       Dữ liệu khởi tạo cho telemetry
src/features/scanner Camera, multipart upload và kết quả FastAPI
src/features/iot/    Dashboard DHT22, độ ẩm đất và NPK
src/features/knowledge Cẩm nang VietGAP và bài viết chi tiết
src/features/chat/   Trợ lý AI, phòng Kỹ sư và camera composer
src/navigation/      Navigation gate và safe navigation hook
src/session/         Phiên đăng nhập và JWT giả
src/workspace/       State chat, cảnh báo và phác đồ
src/theme/           Design tokens DurianCare
```
