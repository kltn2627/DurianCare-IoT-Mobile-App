# 06 - Notification

Gateway routes:

- `/api/v1/notification/**`

## 1. OTP service

### 1.1 Generate OTP

`POST /api/v1/notification/otp/generate`

```json
{
  "email": "farmer@example.com"
}
```

### 1.2 Validate OTP

`POST /api/v1/notification/otp/validate`

```json
{
  "email": "farmer@example.com",
  "otp": "123456"
}
```

## 2. Notification inbox

### 2.1 Danh sách notification

`GET /api/v1/notification/notifications`

Header bắt buộc:

- `X-Auth-User-Id`

Query:

- `page` default `0`
- `size` default `20`
- `sortBy` default `createdAt`
- `sortDirection` default `desc`

### 2.2 Danh sách chưa đọc

`GET /api/v1/notification/notifications/unread`

### 2.3 Đánh dấu đã đọc

`PATCH /api/v1/notification/notifications/{id}/read`

### 2.4 Đánh dấu tất cả đã đọc

`PATCH /api/v1/notification/notifications/read-all`

### 2.5 Xóa notification

`DELETE /api/v1/notification/notifications/{id}`

### 2.6 Đếm notification chưa đọc

`GET /api/v1/notification/notifications/count`

## 3. Notification history

`GET /api/v1/notification/history?recipient=email@example.com`

Trả về lịch sử gửi mail/thông báo cho recipient đó.

## 4. Ghi chú cho mobile

- `X-Auth-User-Id` do gateway/backend xác định, mobile không nên tự suy diễn.
- `NotificationPageResponse` đã có sẵn paging metadata để render list.
- Khi mở inbox, dùng `count` để hiển thị badge.

