# 03 - Engineer Workflow

Luồng engineer hiện tại đã có sẵn ở backend, dùng để:

- đăng ký hồ sơ kỹ sư
- upload chứng chỉ
- chờ admin duyệt
- đăng nhập sau khi được duyệt

## 1. Đăng ký engineer

`POST /api/auth/register/engineer`

Content-Type: `multipart/form-data`

Các trường text:

- `email`
- `password`
- `fullName`
- `phoneNumber`
- `workplace`
- `specialization`
- `yearsExperience`
- `biography`

File:

- `qualificationFiles`

## 2. Trạng thái hồ sơ

Backend lưu hồ sơ review với các trạng thái:

- `PENDING_REVIEW`
- `APPROVED`
- `REJECTED`

## 3. Admin review hồ sơ

### 3.1 Danh sách hồ sơ

`GET /api/auth/admin/engineer-applications`

Query:

- `status` (optional)

### 3.2 Chi tiết hồ sơ

`GET /api/auth/admin/engineer-applications/{applicationId}`

### 3.3 Duyệt hồ sơ

`POST /api/auth/admin/engineer-applications/{applicationId}/approve`

### 3.4 Từ chối hồ sơ

`POST /api/auth/admin/engineer-applications/{applicationId}/reject`

Body:

```json
{
  "rejectionReason": "Thiếu chứng chỉ phù hợp với chuyên môn."
}
```

## 4. Sau khi engineer được duyệt

- `role` vẫn là `ENGINEER`
- `accountStatus` chuyển sang `ACTIVE`
- mobile có thể mở giao diện kỹ sư

## 5. Ghi chú cho mobile

- Hồ sơ chứng chỉ đã được backend lưu trong object storage.
- App chỉ cần đọc `documents[]` từ response chi tiết để hiển thị link tài liệu.
- Nếu hồ sơ đang `PENDING_APPROVAL`, hiển thị màn chờ duyệt.

