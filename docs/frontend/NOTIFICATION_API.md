# NOTIFICATION API

## Base path

```text
/api/v1/notification
```

Gateway route cũng chấp nhận prefix alias `/api/notifications` cho inbox APIs, nhưng frontend nên ưu tiên prefix chuẩn qua gateway.

## 1) OTP

### Generate OTP

**POST** `/api/v1/notification/otp/generate`

Request body:

```json
{
  "email": "testfarmer@gmail.com"
}
```

Response:

```json
{
  "status": "success",
  "valid": false,
  "message": "OTP sent"
}
```

### Validate OTP

**POST** `/api/v1/notification/otp/validate`

Request body:

```json
{
  "email": "testfarmer@gmail.com",
  "otp": "123456"
}
```

Response:

```json
{
  "status": "success",
  "valid": true,
  "message": "OTP is valid"
}
```

OTP validate chấp nhận chuỗi số từ 4 đến 10 chữ số.

## 2) Notification inbox

### List notifications

**GET** `/api/v1/notification/notifications`

Required header:

```http
X-Auth-User-Id: <user-id>
```

Query params:

- `page` default `0`
- `size` default `20`, max `100`
- `sortBy` default `createdAt`, allowed `createdAt | title`
- `sortDirection` default `desc`, allowed `asc | desc`

### Unread notifications

**GET** `/api/v1/notification/notifications/unread`

Same header and query params như list notifications.

### Mark as read

**PATCH** `/api/v1/notification/notifications/{id}/read`

Required header:

```http
X-Auth-User-Id: <user-id>
```

### Mark all as read

**PATCH** `/api/v1/notification/notifications/read-all`

Required header:

```http
X-Auth-User-Id: <user-id>
```

### Delete notification

**DELETE** `/api/v1/notification/notifications/{id}`

Required header:

```http
X-Auth-User-Id: <user-id>
```

Response:

- `204 No Content`

### Unread count

**GET** `/api/v1/notification/notifications/count`

Required header:

```http
X-Auth-User-Id: <user-id>
```

Response:

```json
{
  "count": 3
}
```

## 3) Notification history

**GET** `/api/v1/notification/history?recipient=testfarmer@gmail.com`

Endpoint này trả lịch sử gửi notification/OTP theo recipient.
Frontend thường không cần hiển thị màn này, nhưng nó hữu ích cho trang admin hoặc debug.

## Response shapes

### Notification page

```json
{
  "page": 0,
  "size": 20,
  "totalElements": 5,
  "totalPages": 1,
  "numberOfElements": 5,
  "hasNext": false,
  "hasPrevious": false,
  "sortBy": "createdAt",
  "sortDirection": "desc",
  "notifications": [
    {
      "id": "notif-1",
      "title": "OTP sent",
      "message": "Your OTP has been sent",
      "type": "SYSTEM_ALERT",
      "isRead": false,
      "createdAt": "2026-07-08T03:00:00Z"
    }
  ]
}
```

### History item

```json
{
  "id": "hist-1",
  "recipient": "testfarmer@gmail.com",
  "type": "OTP",
  "channel": "EMAIL",
  "subject": "Your OTP code",
  "status": "SENT",
  "failureReason": null,
  "sentAt": "2026-07-08T03:00:00Z",
  "createdAt": "2026-07-08T03:00:00Z"
}
```

## Frontend notes

- Inbox APIs depend on gateway-injected `X-Auth-User-Id`
- Notification history lowercases the recipient before lookup
- Direct browser calls should go through the gateway, not the service port

