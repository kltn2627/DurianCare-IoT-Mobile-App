# DurianCare Frontend Integration Guide

Tài liệu này mô tả contract frontend cho 3 module đã được triển khai trong backend hiện tại:

- Authentication
- Search
- Notification

Nguồn dữ liệu được trích trực tiếp từ controller, DTO, và exception handler trong mã nguồn backend hiện tại. Không có Swagger/OpenAPI annotation trong các module này, nên tài liệu dưới đây là nguồn tham chiếu chính cho frontend.

## 1) Base URL

Frontend nên gọi qua API Gateway:

```text
http://localhost:8080
```

### Route prefix qua Gateway

- Auth: `/api/auth/**`
- Search: `/api/search/**`
- Notification: `/api/v1/notification/**`

## 2) Authentication flow ngắn gọn

1. `POST /api/auth/register`
2. Người dùng nhận OTP qua email
3. `POST /api/auth/otp/verify`
4. Nếu là `EXPERT`, tài khoản chuyển sang `PENDING_APPROVAL`
5. `POST /api/auth/login`
6. Dùng `accessToken` cho các request cần xác thực
7. Khi access token hết hạn, gọi `POST /api/auth/refresh`
8. Khi logout, gọi `POST /api/auth/logout` với header `Authorization: Bearer <accessToken>`

## 3) Token handling cho frontend

- `login` trả về cả `accessToken` và `refreshToken`
- `tokenType` luôn là `Bearer`
- `accessTokenExpiresIn` là số giây còn lại của access token
- `refresh` trả về token mới cho cả access và refresh token

Khuyến nghị frontend:

- Lưu token theo cơ chế an toàn phù hợp với ứng dụng của bạn
- Khi nhận 401, thử refresh 1 lần rồi mới yêu cầu người dùng login lại
- Không gọi trực tiếp notification inbox service nếu đã đi qua gateway

## 4) Header cần dùng

### Protected auth endpoints

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### Notification inbox endpoints

Các API inbox đọc `X-Auth-User-Id` do gateway inject.
Frontend không nên tự set header này khi chạy production qua gateway.

### OTP endpoints

OTP generate / validate là public qua gateway, không cần token.

## 5) Tài liệu theo module

- [AUTH_API.md](./AUTH_API.md)
- [AUTH_FLOW.md](./AUTH_FLOW.md)
- [SEARCH_API.md](./SEARCH_API.md)
- [NOTIFICATION_API.md](./NOTIFICATION_API.md)
- [ERROR_CODES.md](./ERROR_CODES.md)
- [FRONTEND_CHECKLIST.md](./FRONTEND_CHECKLIST.md)
- [OPENAPI_SUMMARY.md](./OPENAPI_SUMMARY.md)
- [FRONTEND_READY.md](./FRONTEND_READY.md)

## 6) Endpoint coverage hiện có

### Auth

- Register
- Resend OTP
- Verify OTP
- Approve expert
- Login
- Logout
- Refresh token

### Search

- Keyword search với pagination
- Sorting
- Filter theo document type
- Internal index endpoint cho backend indexing

### Notification

- Generate OTP
- Validate OTP
- Notification inbox list
- Unread notifications
- Mark read
- Mark all read
- Delete notification
- Unread count
- Notification delivery history

