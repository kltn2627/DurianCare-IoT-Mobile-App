# 10 - Error Codes

Tổng hợp lỗi backend mà mobile team có thể gặp.

## 1. Authentication

- `400 BAD_REQUEST`
  - dữ liệu sai định dạng
  - validation fail
- `401 UNAUTHORIZED`
  - sai token
  - thiếu token
  - OTP / login không hợp lệ
- `403 FORBIDDEN`
  - không đủ quyền admin
- `404 NOT_FOUND`
  - user / application không tồn tại
- `409 CONFLICT`
  - email bị trùng
  - dữ liệu xung đột
- `500 INTERNAL_SERVER_ERROR`
  - lỗi bất thường

## 2. Notification

- `400 BAD_REQUEST`
  - request không hợp lệ
- `401 UNAUTHORIZED`
  - thiếu `X-Auth-User-Id`
- `403 FORBIDDEN`
  - không có quyền xem/xóa notification của người khác
- `404 NOT_FOUND`
  - notification không tồn tại
- `502 BAD_GATEWAY`
  - lỗi gửi mail
- `503 SERVICE_UNAVAILABLE`
  - mail service / redis / kafka chưa sẵn sàng

## 3. Search

- `400 BAD_REQUEST`
  - thiếu `q`
  - query sai kiểu
- `500 INTERNAL_SERVER_ERROR`
  - lỗi search bất thường

## 4. AI

- `400 BAD_REQUEST`
  - ảnh hỏng / invalid image
- `413 PAYLOAD_TOO_LARGE`
  - ảnh quá lớn
- `415 UNSUPPORTED_MEDIA_TYPE`
  - file không phải image
- `422 UNPROCESSABLE_ENTITY`
  - thiếu `device_id` khi `source = IOT_CAMERA`
- `502 BAD_GATEWAY`
  - lỗi storage / RAG
- `503 SERVICE_UNAVAILABLE`
  - model chưa load / S3 chưa config / RAG chưa sẵn sàng

## 5. Format lỗi

Các service Spring Boot thường trả về JSON dạng:

```json
{
  "timestamp": "...",
  "status": 401,
  "error": "Unauthorized",
  "message": "..."
}
```

