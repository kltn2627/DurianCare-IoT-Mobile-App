# 02 - Profile

Gateway route:

- `/api/users/**`

## 1. Lấy hồ sơ người dùng hiện tại

`GET /api/users/me`

Yêu cầu:

- `Authorization: Bearer <access_token>`

Response `ProfileResponse`:

- `userId`
- `email`
- `role`
- `accountStatus`
- `fullName`
- `phoneNumber`
- `dateOfBirth`
- `gender`
- `address`
- `provinceCity`
- `bio`
- `avatarUrl`
- `createdAt`
- `updatedAt`

## 2. Cập nhật hồ sơ

`PUT /api/users/me`

Body:

```json
{
  "fullName": "Nguyen Van A",
  "phoneNumber": "0901234567",
  "dateOfBirth": "1998-01-15",
  "gender": "MALE",
  "address": "Ben Tre",
  "provinceCity": "Ben Tre",
  "bio": "Nong dan trong sau rieng"
}
```

## 3. Upload avatar

`POST /api/users/me/avatar`

Content-Type: `multipart/form-data`

Fields:

- `avatar`

Response:

```json
{
  "avatarUrl": "https://..."
}
```

## 4. Xóa avatar

`DELETE /api/users/me/avatar`

Response:

```json
{
  "message": "Avatar removed."
}
```

## 5. Ghi chú cho mobile

- `role` và `accountStatus` có sẵn trong `GET /me`, nên app không cần gọi endpoint khác để quyết định màn hình.
- Avatar là ảnh riêng của user, không liên quan ảnh chẩn đoán bệnh.

