# 01 - Authentication

Backend là nguồn dữ liệu chuẩn cho mobile. Tất cả request nên đi qua API Gateway:

- Local: `http://localhost:8080`
- Gateway routes:
  - `/api/auth/**`
  - `/api/users/**`

## 1. Các luồng chính

### 1.1 Đăng ký tài khoản nông dân / expert cũ

`POST /api/auth/register`

Body:

```json
{
  "email": "farmer@example.com",
  "password": "StrongPassword123!",
  "fullName": "Nguyen Van A",
  "phoneNumber": "0901234567",
  "role": "FARMER"
}
```

Phản hồi thành công:

```json
{
  "message": "Registration accepted. Check your email for the OTP."
}
```

### 1.2 Đăng ký kỹ sư

`POST /api/auth/register/engineer`

Content-Type: `multipart/form-data`

Fields:

- `email`
- `password`
- `fullName`
- `phoneNumber`
- `workplace`
- `specialization`
- `yearsExperience`
- `biography`
- `qualificationFiles[]` hoặc `qualificationFiles`

Tệp hợp lệ:

- `PDF`
- `JPG`
- `PNG`

Phản hồi thành công:

```json
{
  "message": "Engineer application submitted. Check your email for the OTP and wait for approval."
}
```

### 1.3 Gửi lại OTP

`POST /api/auth/otp/resend`

```json
{
  "email": "farmer@example.com"
}
```

### 1.4 Xác thực OTP

`POST /api/auth/otp/verify`

```json
{
  "email": "farmer@example.com",
  "otpCode": "123456"
}
```

Kết quả:

- User thường: account chuyển `ACTIVE`
- Engineer: account có thể ở trạng thái chờ duyệt nếu quy trình approval chưa xong

### 1.5 Đăng nhập

`POST /api/auth/login`

```json
{
  "email": "farmer@example.com",
  "password": "StrongPassword123!"
}
```

Trả về `AuthenticationResponse`:

- `accessToken`
- `refreshToken`
- `tokenType`
- `accessTokenExpiresIn`
- `userId`
- `email`
- `role`
- `accountStatus`
- `profile`

### 1.6 Refresh token

`POST /api/auth/refresh`

```json
{
  "refreshToken": "eyJ..."
}
```

### 1.7 Đăng xuất

`POST /api/auth/logout`

Header bắt buộc:

- `Authorization: Bearer <access_token>`

### 1.8 Admin duyệt engineer

Các endpoint admin:

- `POST /api/auth/admin/users/{userId}/approve-engineer`
- `GET /api/auth/admin/engineer-applications`
- `GET /api/auth/admin/engineer-applications/{applicationId}`
- `POST /api/auth/admin/engineer-applications/{applicationId}/approve`
- `POST /api/auth/admin/engineer-applications/{applicationId}/reject`

Role yêu cầu:

- `ADMIN`

## 2. Trạng thái tài khoản

Backend đang dùng:

- `PENDING_VERIFICATION`
- `PENDING_APPROVAL`
- `ACTIVE`
- `BLOCKED`

## 3. Ghi chú cho mobile

- Luôn lưu `accessToken` và `refreshToken` riêng.
- `accountStatus` và `role` đã có sẵn trong response đăng nhập và `GET /api/users/me`.
- Với engineer, UI nên đọc `accountStatus` để biết:
  - `PENDING_APPROVAL` -> hiển thị màn chờ duyệt
  - `ACTIVE` -> vào giao diện kỹ sư

