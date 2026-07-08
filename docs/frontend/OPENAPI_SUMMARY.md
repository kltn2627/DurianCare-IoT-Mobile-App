# OpenAPI / Swagger Summary

## Current status

Trong các module Auth, Search, và Notification hiện tại, chưa thấy Swagger/OpenAPI annotations như:

- `@Operation`
- `@Schema`
- `springdoc-openapi`

Vì vậy tài liệu này được suy ra trực tiếp từ controller source code.

## Endpoint summary

### Auth

- `POST /api/auth/register`
- `POST /api/auth/otp/resend`
- `POST /api/auth/otp/verify`
- `POST /api/auth/admin/users/{userId}/approve-expert`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`

### Search

- `GET /api/search`
- `POST /api/search/internal/index`

### Notification

- `POST /api/v1/notification/otp/generate`
- `POST /api/v1/notification/otp/validate`
- `GET /api/v1/notification/notifications`
- `GET /api/v1/notification/notifications/unread`
- `PATCH /api/v1/notification/notifications/{id}/read`
- `PATCH /api/v1/notification/notifications/read-all`
- `DELETE /api/v1/notification/notifications/{id}`
- `GET /api/v1/notification/notifications/count`
- `GET /api/v1/notification/history`

## Recommendation

Nếu team muốn auto-generate docs trong frontend hoặc Postman collection từ OpenAPI, cần thêm springdoc annotations sau này.

