# 11 - Postman Collection

Tài liệu này mô tả bộ request Postman mà mobile team có thể dựng ngay từ backend source of truth.

## 1. Environment variables

- `gatewayUrl` = `http://localhost:8080`
- `jwtToken`
- `refreshToken`
- `otpCode`
- `userId`
- `notificationId`
- `searchKeyword`
- `applicationId`
- `roomId`
- `predictedDisease`

## 2. Folder gợi ý

### Authentication

- Register farmer
- Register engineer
- Verify OTP
- Resend OTP
- Login
- Refresh token
- Logout
- Get my profile

### Admin

- List engineer applications
- Get application detail
- Approve application
- Reject application

### AI

- Predict image
- Predict from S3
- Ask RAG question

### Notification

- Generate OTP
- Validate OTP
- List notifications
- List unread notifications
- Mark as read
- Mark all as read
- Delete notification
- Count unread
- Get history

### Search

- Search resources

### Chat

- Socket.IO chat join room
- Socket.IO send message

## 3. Chain test flow

1. Register
2. Save OTP
3. Verify OTP
4. Login
5. Save JWT
6. Call profile / search / notification
7. Logout

## 4. Notes for Postman scripting

- `accessToken` lấy từ response login và gán vào `jwtToken`
- `refreshToken` gán vào biến môi trường `refreshToken`
- `otpCode` có thể lấy từ response mail/manual test hoặc mock
- `gatewayUrl` được dùng làm base cho mọi request đi qua API Gateway

## 5. Load-test seed

Tạo trước:

- 100 user
- 100 notification
- bộ dữ liệu search
