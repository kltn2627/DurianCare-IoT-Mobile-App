# Frontend Ready Checklist

Backend hiện tại đã đủ để frontend bắt đầu tích hợp cho các module:

- Authentication
- Search
- Notification

## Ready items

- Gateway routes đã rõ ràng
- DTO response đã ổn định
- Validation và error response đã nhất quán
- Search có pagination, sorting, type filter
- Notification có inbox pagination và unread count
- Auth có register, OTP, login, refresh, logout, admin approve expert

## Important notes

- Frontend nên gọi qua gateway
- Direct service ports chỉ nên dùng khi debug local
- Notification inbox phụ thuộc `X-Auth-User-Id`
- Search internal index không phải API frontend

## Delivery status

```text
FRONTEND INTEGRATION READY
```

