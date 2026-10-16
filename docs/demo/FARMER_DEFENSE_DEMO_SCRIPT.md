# Kịch bản demo – Bảo vệ luận văn

**Tài khoản:** minhdii1510@gmail.com  
**Thiết bị:** Mobile App (Expo) + Web Client (Next.js)

---

## Cảnh 1 – Đăng nhập và tổng quan vườn (2 phút)

**Trên Mobile:**

1. Mở app → đăng nhập `minhdii1510@gmail.com`
2. Màn hình Dashboard hiển thị:
   - 4 khu vực: Khu Bắc, Khu Nam, Khu Đông, Khu Tây
   - Tổng 100 cây sầu riêng
3. Mở tab **Vườn** → chọn farm **Vườn sầu riêng Khoa Luận**
4. Xem 4 zone với số cây và trạng thái sức khỏe

**Điểm nhấn hội đồng:** Hệ thống quản lý đa khu vực, mỗi khu có đặc tính sản xuất riêng.

---

## Cảnh 2 – Phát hiện bệnh bằng AI (3 phút)

**Trên Mobile:**

1. Vào tab **Chẩn đoán** → chọn **Khu Đông**
2. Hiển thị nhóm cây T059–T065 với trạng thái **DISEASED** (7 cây)
3. Chọn cây `tree-059` → xem chi tiết chẩn đoán:
   - Disease code: `LEAF_BLIGHT`
   - Mức độ tin cậy AI
   - Ngày phát hiện: 12/09/2026
4. Chọn cây `DC-T009` (Khu Bắc) → hiển thị `ALLOCARIDARA_ATTACK` (bọ chích hút)

**Điểm nhấn hội đồng:** AI phân loại đa bệnh, phân biệt bệnh nấm vs sâu hại.

---

## Cảnh 3 – Cây đang điều trị và hành trình hồi phục (3 phút)

**Trên Mobile:**

1. Vào **Khu Bắc** → tìm cây `DC-T010` (trạng thái **TREATING**)
2. Xem lịch sử chẩn đoán:
   - 10/09: LEAF_BLIGHT phát hiện
   - 25/09: Bắt đầu điều trị Trichoderma (IN_PROGRESS)
   - 28/09: Có dấu hiệu hồi phục tốt (notification)
3. Hỏi Hội đồng: "Khi nông dân xác nhận cây hồi phục, hệ thống cập nhật thế nào?"
   - Trả lời: Farmer nhập `RECOVERED_BY_FARMER` → `inferHealthStatus()` trả về HEALTHY → tree status = HEALTHY

**Điểm nhấn hội đồng:** Vòng đời HEALTHY → DISEASED → TREATING → RECOVERED có dữ liệu thực tế.

---

## Cảnh 4 – Lịch canh tác và hoạt động (3 phút)

**Trên Mobile:**

1. Vào tab **Canh tác** → chọn **Vụ 2026 – Khu Đông**
2. Xem danh sách hoạt động với màu sắc theo trạng thái:
   - ✅ COMPLETED: 6 hoạt động (tưới, bón phân, kiểm tra)
   - 🔴 OVERDUE: Theo dõi bệnh T059–T065 (22/09)
   - 🟡 IN_PROGRESS: Phun Trichoderma, lấy mẫu đất pH
   - 📅 SCHEDULED: Tưới lần 3, bón Kali, thu hoạch 20/10
3. Nhấn vào hoạt động OVERDUE → xem chi tiết, cây liên quan

**Điểm nhấn hội đồng:** Dashboard lịch canh tác đầy đủ vòng đời trạng thái.

---

## Cảnh 5 – Quản lý mùa vụ và sửa thông tin (2 phút)

**Trên Mobile:**

1. Vào **Trang trại** → chọn zone **Khu Đông**
2. Xem mùa vụ: **Vụ 2026** (đang hoạt động) + **Vụ 2025** (đã kết thúc)
3. Nhấn nút **Sửa** trên Vụ 2026:
   - Sửa tên → "Vụ sầu riêng 2026 – Khu Đông (Chính vụ)"
   - Lưu → gọi PATCH `/api/v1/cultivation-seasons/{id}`
4. Tên mùa vụ cập nhật ngay trong UI

**Điểm nhấn hội đồng:** Phase S mới hoàn thành — edit season wired to PATCH API.

---

## Cảnh 6 – Thông báo thông minh (2 phút)

**Trên Mobile:**

1. Mở tab **Thông báo** → hiển thị 10 thông báo thực tế
2. Làm nổi bật các loại:
   - 🔴 DISEASE: Phát hiện bệnh, cảnh báo cụm bệnh
   - 🌧 WEATHER: Mưa lớn 3 ngày tới
   - 📱 DEVICE: Camera Khu Đông reconnected
   - 👨‍💼 EXPERT: Chuyên gia tư vấn xử lý bệnh
3. Chọn thông báo "DC-T010 hồi phục" → link đến chi tiết cây

**Điểm nhấn hội đồng:** Hệ thống thông báo đa loại, context-aware.

---

## Cảnh 7 – So sánh Web và Mobile (1 phút)

**Trên Web Client:**

1. Đăng nhập `minhdii1510@gmail.com`
2. Dashboard Web hiển thị cùng 4 zone, 100 cây
3. Danh sách hoạt động canh tác Khu Đông khớp với Mobile

**Điểm nhấn hội đồng:** Single source of truth — MongoDB shared state, cả Web và Mobile đọc cùng API.

---

## Cảnh 8 – Lô thu hoạch vụ 2025 (1 phút)

**Trên Mobile hoặc Web:**

1. Vào mùa vụ 2025 Khu Đông (đã kết thúc)
2. Xem lô thu hoạch `HB-2025-DONG-001`:
   - 1.850 kg, ngày 15/10/2025
   - Thị trường: CN (Trung Quốc)
   - Chemical risk: LOW

**Điểm nhấn hội đồng:** Traceability end-to-end: từ canh tác → lô hàng → xuất khẩu.

---

## Câu hỏi hội đồng thường gặp

| Câu hỏi | Trả lời ngắn |
|---------|-------------|
| AI chạy ở đâu? | Backend Python inference service, kết quả trả về qua REST API |
| Dữ liệu IoT real-time thế nào? | ESP32-CAM gửi ảnh → backend inference → diagnosis record |
| Bảo mật như thế nào? | JWT + Spring Security, per-farm authorization scope |
| Hệ thống scale được không? | MongoDB horizontal sharding, Spring Boot microservices |
| Sao không hard-code farmerId? | Dynamic auth context từ JWT claims, không phụ thuộc seed data |

---

## Lưu ý kỹ thuật trước demo

- Đảm bảo backend, MongoDB, và notification service đang chạy: `docker ps`
- Đảm bảo Mobile app kết nối đúng IP backend trong `.env`
- Đảm bảo Web client `.env.local` trỏ đúng `NEXT_PUBLIC_API_URL`
- Kiểm tra nhanh: `GET /api/v1/farms` với token farmer → phải trả về farm ID `demo-farm-khoa-luan-2026`
