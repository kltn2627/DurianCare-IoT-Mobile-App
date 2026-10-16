# 04 - Admin Workflow

## 1. Vai trò và quyền

Backend đang dùng role:

- `ADMIN`
- `ENGINEER`
- `EXPERT`
- `FARMER`
- `GUEST`

Admin workflow chỉ áp dụng cho role `ADMIN`.

## 2. Các chức năng admin hiện có

### 2.1 Duyệt engineer

Endpoint:

- `POST /api/auth/admin/users/{userId}/approve-engineer`
- alias tương thích:
  - `POST /api/auth/admin/users/{userId}/approve-expert`

### 2.2 Duyệt hoặc từ chối hồ sơ engineer

- `GET /api/auth/admin/engineer-applications`
- `GET /api/auth/admin/engineer-applications/{applicationId}`
- `POST /api/auth/admin/engineer-applications/{applicationId}/approve`
- `POST /api/auth/admin/engineer-applications/{applicationId}/reject`

## 3. Dữ liệu admin nên xem trước khi duyệt

Từ response chi tiết application:

- `email`
- `fullName`
- `workplace`
- `specialization`
- `yearsExperience`
- `biography`
- `status`
- `rejectionReason`
- `reviewedBy`
- `reviewedAt`
- `documents[]`

## 4. Ghi chú cho mobile

- Không có API quản lý admin riêng biệt ngoài auth service ở thời điểm hiện tại.
- Màn admin mobile nên lấy danh sách application, mở chi tiết, rồi gọi approve/reject.

