# Frontend Integration Checklist

## Authentication

- [ ] Gọi register qua gateway `/api/auth/register`
- [ ] Hiển thị OTP screen sau register
- [ ] Verify OTP trước khi login
- [ ] Lưu `accessToken` và `refreshToken`
- [ ] Tự refresh khi access token hết hạn
- [ ] Logout bằng access token hiện tại

## Search

- [ ] Gửi `q` bắt buộc
- [ ] Hỗ trợ `page`, `size`, `sortBy`, `sortDirection`
- [ ] Hiển thị pagination metadata từ response
- [ ] Filter theo `type` khi user chọn loại dữ liệu
- [ ] Không gọi internal index endpoint từ UI

## Notification

- [ ] Gọi inbox APIs qua gateway
- [ ] Không tự set `X-Auth-User-Id` trong production browser app
- [ ] Hiển thị unread count trên bell icon
- [ ] Refresh inbox sau khi mark read / read-all
- [ ] Xử lý response `204 No Content` cho delete

## Error handling

- [ ] Map 400 về validation UI
- [ ] Map 401 về login/refresh flow
- [ ] Map 403 về không đủ quyền
- [ ] Map 404 về empty state
- [ ] Map 502 / 503 về thông báo tạm thời

## Security

- [ ] Không log token ra console
- [ ] Không hardcode API URL vào nhiều nơi
- [ ] Luôn gọi qua gateway
- [ ] Không giả lập header gateway trong production

