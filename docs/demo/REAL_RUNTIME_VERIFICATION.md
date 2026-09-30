# Xác minh runtime thực tế – DurianCare

Tài liệu này mô tả các bước xác minh hệ thống đang hoạt động với dữ liệu thực tế từ backend và MongoDB, **không phải mock/demo frontend**.

---

## 1. Điều kiện tiên quyết

```bash
# Kiểm tra tất cả container đang chạy
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Cần thấy: `duriancare-mongodb`, `duriancare-backend` (hoặc các service tương đương), `duriancare-notification`.

---

## 2. Xác minh Farm và Zones (không hard-code)

```bash
# Lấy JWT của tài khoản minhdii1510@gmail.com (đăng nhập qua app để lấy token)
# Gọi API farms với JWT:
curl -H "Authorization: Bearer <JWT>" http://localhost:8080/api/v1/farms
```

**Kết quả mong đợi:**
- Trả về array chứa farm `demo-farm-khoa-luan-2026`
- Farm có 4 zones: `demo-zone-a-vung-trong-demo` (Khu Bắc), `zone-b-khu-nam`, `zone-c-khu-dong`, `zone-d-khu-tay`
- Response **không** hard-coded trong frontend — đến từ MongoDB `duriancare_farm`

---

## 3. Xác minh Care Schedules — API thực

```bash
curl -H "Authorization: Bearer <JWT>" http://localhost:8080/api/cultivation-schedules
```

**Kết quả mong đợi:**
- Trả về array ≥ 11 schedules với status `done`, `in-progress`, `planned`
- Web và Mobile đọc cùng endpoint này
- Không có dữ liệu nào được hard-code trong frontend

### Kiểm tra state transition PLANNED → DONE

```bash
# Thay <SCHEDULE_ID> bằng ID của một schedule có status = "planned"
curl -X PATCH \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}' \
  http://localhost:8080/api/cultivation-schedules/<SCHEDULE_ID>/status
```

**PASS:** Backend trả về object cập nhật với `"status":"done"`. Reload Web và Mobile → cả hai hiển thị `Hoàn thành`.

---

## 4. Xác minh Trees — 100 cây thực tế

```bash
curl -H "Authorization: Bearer <JWT>" \
  "http://localhost:8080/api/v1/trees?farmId=demo-farm-khoa-luan-2026&page=0&size=100"
```

**Kết quả mong đợi:**
- Tổng 100 cây: 53 HEALTHY, 23 SUSPECTED, 14 DISEASED, 10 TREATING
- ID cây: `DC-T001`…`DC-T012`, `tree-13`…`tree-100`
- Phân bố: Khu Bắc (T001–T025), Khu Nam (T026–T050), Khu Đông (T051–T075), Khu Tây (T076–T100)

---

## 5. Xác minh Diagnosis Records — AI thực

```bash
curl -H "Authorization: Bearer <JWT>" \
  "http://localhost:8080/api/v1/diagnosis?treeId=DC-T010"
```

**Kết quả mong đợi:**
- Cây `DC-T010` có record `LEAF_BLIGHT` → status TREATING
- Không có field nào là mock/fake

---

## 6. Xác minh Cultivation Seasons

```bash
curl -H "Authorization: Bearer <JWT>" \
  "http://localhost:8080/api/v1/cultivation-seasons"
```

**Kết quả mong đợi:**
- 5 seasons: `season-2026-khu-dong` (ACTIVE), `season-2025-khu-dong` (DONE), + 3 ACTIVE khác
- Sửa tên season qua PATCH → reload → tên mới hiển thị cả Web và Mobile

---

## 7. Xác minh Web CultivationCalendar — không mock

Vào Web Dashboard → tab Lịch canh tác:

1. Trang load → danh sách schedules hiện ra (từ API, không phải hardcode)
2. Zone filter dropdown lấy từ `/api/v1/farms` (không hardcode zone IDs)
3. Bấm **"Đang làm"** hoặc **"Xong"** → status update tới PATCH API → backend lưu
4. Reload trang → status vẫn giữ nguyên (đã persist vào MongoDB)

---

## 8. Xác minh Mobile — cùng data source

1. Mở Mobile App → đăng nhập `minhdii1510@gmail.com`
2. Tab Vườn → 4 zone, 100 cây
3. Tab Canh tác → schedules khớp với Web
4. Thay đổi status trên Web → reload Mobile → status khớp

---

## 9. Checklist tổng hợp

| # | Kiểm tra | Mong đợi | Kết quả |
|---|---------|---------|---------|
| 1 | GET /api/v1/farms | Farm + 4 zones từ MongoDB | |
| 2 | GET /api/cultivation-schedules | ≥ 11 schedules thực | |
| 3 | PATCH /api/cultivation-schedules/:id/status | State persist | |
| 4 | Web reload sau PATCH | Status cập nhật | |
| 5 | Mobile hiển thị cùng schedules | Đồng bộ | |
| 6 | GET /api/v1/trees (100 cây) | Đúng phân bố sức khỏe | |
| 7 | Web: không có banner "Dữ liệu mẫu" | Banner đã xóa | |
| 8 | Web: zone filter từ API | Không hardcode | |
| 9 | Tạo schedule mới qua form | Persist vào DB | |
| 10 | Mobile thấy schedule mới | Đồng bộ | |

---

## Lưu ý quan trọng

- **KHÔNG** kết luận PASS chỉ vì compile thành công — phải verify runtime
- Mọi farm/zone/tree ID đều đến từ JWT claims + database, không bao giờ hardcode trong frontend
- `MockDataBanner` đã xóa hoàn toàn khỏi tất cả UI production
- Tất cả schedule mutations (create, update status) gọi backend thật và persist

---

*Tài liệu tạo: 2026-09-30*
