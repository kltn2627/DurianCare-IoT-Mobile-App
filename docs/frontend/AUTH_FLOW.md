# Auth Flow for Frontend

## 1) Register

Người dùng nhập:

- email
- password
- full name
- phone number
- role

Frontend gọi `POST /api/auth/register`.

Sau khi thành công:

- hiển thị màn hình nhập OTP
- không chuyển thẳng sang login nếu chưa verify

## 2) Verify OTP

Frontend gọi `POST /api/auth/otp/verify`.

Nếu role là `EXPERT`:

- backend trả message chờ duyệt
- frontend nên giữ trạng thái `pending approval`

Nếu role là `FARMER`:

- tài khoản active ngay
- có thể cho login

## 3) Login

Frontend gọi `POST /api/auth/login`.

Kết quả trả về:

- access token
- refresh token
- profile

Nên lưu:

- `accessToken` cho request thường
- `refreshToken` cho cơ chế làm mới phiên

## 4) Protected requests

Khi gọi API cần xác thực:

```http
Authorization: Bearer <accessToken>
```

## 5) Refresh

Nếu nhận 401 do token hết hạn:

1. Gọi `POST /api/auth/refresh`
2. Nếu refresh thành công, thay token cũ bằng token mới
3. Retry request ban đầu một lần

## 6) Logout

Gọi `POST /api/auth/logout` với access token hiện tại.

Backend sẽ revoke token hiện tại và thu hồi refresh sessions.

## 7) Admin approval

Admin flow:

- login bằng tài khoản `ADMIN`
- gọi endpoint approve expert
- cập nhật UI danh sách expert chờ duyệt

