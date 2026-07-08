# DurianCare Error Codes

Tài liệu này tổng hợp các HTTP error codes đang được backend trả về trong Auth, Search, và Notification.

## 400 Bad Request

Khi nào xuất hiện:

- DTO validation fail
- Query parameter không hợp lệ
- Thiếu tham số bắt buộc
- OTP sai format
- Các request payload sai kiểu hoặc sai range

Ví dụ thông điệp:

- `email: must not be blank`
- `OTP is incorrect`
- `Request validation failed`

## 401 Unauthorized

Khi nào xuất hiện:

- Thiếu hoặc sai `Authorization` header
- JWT invalid / expired
- Refresh token không hợp lệ
- Tài khoản chưa active
- Notification inbox thiếu `X-Auth-User-Id`

Ví dụ thông điệp:

- `Authentication is required`
- `Bearer access token is required`
- `Email or password is incorrect`
- `Account is not active`

## 403 Forbidden

Notification service có trả:

- `NotificationAccessDeniedException`

Auth admin endpoint:

- `POST /api/auth/admin/users/{userId}/approve-expert`
- chỉ `ADMIN` mới được gọi

## 404 Not Found

Khi nào xuất hiện:

- User / profile / notification không tồn tại
- Notification belongs to user khác

## 409 Conflict

Auth service có thể trả:

- email đã tồn tại
- dữ liệu trùng khóa unique

## 502 Bad Gateway

Notification service trả khi email delivery thất bại.

## 503 Service Unavailable

Auth service trả khi publish event thất bại.

## 500 Internal Server Error

Lỗi không mong đợi từ backend.

## Response shape

Các handler hiện tại đều trả JSON dạng:

```json
{
  "timestamp": "2026-07-08T03:00:00Z",
  "status": 401,
  "error": "Unauthorized",
  "message": "Authentication is required"
}
```

## Frontend recommendation

- Hiển thị message từ backend nếu có
- Với 401 từ protected API, thử refresh token một lần trước khi logout
- Với 400, highlight field lỗi ngay trên form
- Với 403, không retry tự động

