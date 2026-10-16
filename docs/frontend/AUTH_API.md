# AUTH API

## Base path

```text
/api/auth
```

## Endpoints

### 1. Register

**POST** `/api/auth/register`

Request body:

```json
{
  "email": "testfarmer@gmail.com",
  "password": "StrongPassword123!",
  "fullName": "Nguyen Van A",
  "phoneNumber": "0901234567",
  "role": "FARMER"
}
```

Validation:

- `email`: required, valid email, max 320
- `password`: required, 12-72 ký tự
- `fullName`: required, max 150
- `phoneNumber`: optional, nếu có phải khớp pattern số điện thoại backend
- `role`: `ADMIN | EXPERT | FARMER | GUEST`

Response:

- `201 Created`
- Body:

```json
{
  "message": "Registration accepted. Check your email for the OTP."
}
```

### 2. Resend OTP

**POST** `/api/auth/otp/resend`

Request body:

```json
{
  "email": "testfarmer@gmail.com"
}
```

Response:

```json
{
  "message": "A new OTP has been sent."
}
```

### 3. Verify OTP

**POST** `/api/auth/otp/verify`

Request body:

```json
{
  "email": "testfarmer@gmail.com",
  "otpCode": "123456"
}
```

OTP phải đúng 6 chữ số.

Response phụ thuộc loại tài khoản:

- Farmer / non-expert:

```json
{
  "message": "Account has been activated."
}
```

- Expert:

```json
{
  "message": "Email verified. Expert account is awaiting administrator approval."
}
```

### 4. Approve expert

**POST** `/api/auth/admin/users/{userId}/approve-expert`

Auth:

- Chỉ ADMIN
- Endpoint này dùng `@PreAuthorize("hasRole('ADMIN')")`

Response:

```json
{
  "message": "Expert account has been approved."
}
```

### 5. Login

**POST** `/api/auth/login`

Request body:

```json
{
  "email": "testfarmer@gmail.com",
  "password": "StrongPassword123!"
}
```

Response body:

```json
{
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "tokenType": "Bearer",
  "accessTokenExpiresIn": 3600,
  "userId": "8a6c5ff3-6d6b-4f58-8d3e-0f6be9a1d2c1",
  "email": "testfarmer@gmail.com",
  "role": "FARMER",
  "profile": {
    "fullName": "Nguyen Van A",
    "phoneNumber": "0901234567",
    "farmAddress": "Ben Tre",
    "avatarUrl": "https://..."
  }
}
```

Lưu ý:

- Login chỉ thành công khi tài khoản ở trạng thái `ACTIVE`
- Nếu chưa active, backend trả 401

### 6. Logout

**POST** `/api/auth/logout`

Header bắt buộc:

```http
Authorization: Bearer <accessToken>
```

Response:

```json
{
  "message": "Logout completed."
}
```

### 7. Refresh token

**POST** `/api/auth/refresh`

Request body:

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

Response:

```json
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "refreshTokenExpiresIn": 604800
}
```

## Token / state behavior

- Access token hết hạn khoảng 1 giờ
- Refresh token sống 7 ngày
- Logout sẽ revoke access token hiện tại và revoke toàn bộ refresh sessions của user
- Backend phân biệt:
  - `PENDING_VERIFICATION`
  - `PENDING_APPROVAL`
  - `ACTIVE`
  - `BLOCKED`

## Frontend notes

- Sau register, hiển thị màn hình nhập OTP
- Nếu verify thành công mà message là pending approval, frontend nên hiển thị trạng thái chờ duyệt
- Sau login, lưu `profile` để render avatar và thông tin user
- Khi nhận 401 từ auth-protected calls, thử refresh token trước khi redirect login

