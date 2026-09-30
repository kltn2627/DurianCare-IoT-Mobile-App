# Dữ liệu demo thực tế – Nông dân Minhdii

Tài liệu mô tả toàn bộ dữ liệu đã được seed cho tài khoản farmer demo chính thức.

## Tài khoản

| Trường | Giá trị |
|--------|---------|
| Email | minhdii1510@gmail.com |
| Farmer ID | 9ffc2a41-eaa6-4567-ad6d-d6741acafeb7 |
| Farm ID | demo-farm-khoa-luan-2026 |

---

## Vườn & Khu vực (Farm / Zones)

| Zone ID | Tên | Mã | Cây |
|---------|-----|----|-----|
| demo-zone-a-vung-trong-demo | Khu Bắc | KHU-BAC | T001–T025 (DC-T001–DC-T012 + tree-13–tree-25) |
| zone-b-khu-nam | Khu Nam | KHU-NAM | tree-26–tree-50 |
| zone-c-khu-dong | Khu Đông | KHU-DONG | tree-51–tree-75 (cụm bệnh + điều trị) |
| zone-d-khu-tay | Khu Tây | KHU-TAY | tree-76–tree-100 (cụm nghi ngờ) |

---

## Phân bố sức khoẻ cây

| Trạng thái | Số lượng | Vùng chính |
|------------|----------|-----------|
| HEALTHY | 53 | Khu Bắc, Khu Nam |
| SUSPECTED | 23 | Khu Tây (tree-80–89), Khu Bắc (DC-T009, DC-T011) |
| DISEASED | 14 | Khu Đông (tree-59–65), Khu Bắc (DC-T005, DC-T008) |
| TREATING | 10 | DC-T010 (demo recovery), tree-71–79 |

Cây demo phục hồi: **DC-T010** (Khu Bắc) — LEAF_BLIGHT → TREATING → sắp RECOVERED_BY_FARMER

---

## Mùa vụ (Cultivation Seasons)

| ID | Tên | Zone | Trạng thái |
|----|-----|------|-----------|
| season-2025-khu-dong | Vụ sầu riêng 2025 – Khu Đông | Khu Đông | Đã kết thúc |
| season-2026-khu-dong | Vụ sầu riêng 2026 – Khu Đông | Khu Đông | **Đang hoạt động** (demo chính) |
| season-2026-khu-bac | Vụ sầu riêng 2026 – Khu Bắc | Khu Bắc | Đang hoạt động |
| season-2026-khu-nam | Vụ sầu riêng 2026 – Khu Nam | Khu Nam | Đang hoạt động |
| season-2026-khu-tay | Vụ sầu riêng 2026 – Khu Tây | Khu Tây | Đang hoạt động |

---

## Kế hoạch canh tác (Cultivation Plans)

| ID | Tên | Season | Status |
|----|-----|--------|--------|
| plan-2025-khu-dong | Kế hoạch 2025 – Khu Đông | season-2025-khu-dong | COMPLETED |
| plan-2026-khu-dong | Kế hoạch 2026 – Khu Đông | season-2026-khu-dong | ACTIVE |
| plan-2026-khu-bac | Kế hoạch 2026 – Khu Bắc | season-2026-khu-bac | ACTIVE |

---

## Hoạt động canh tác (Activities) — Vụ 2026 Khu Đông

| ID | Tên | Loại | Trạng thái |
|----|-----|------|-----------|
| act-2026-dong-irrig-01 | Tưới nước tuần 1 | IRRIGATION | COMPLETED |
| act-2026-dong-fert-01 | Bón phân hữu cơ lần 1 | FERTILIZATION | COMPLETED |
| act-2026-dong-pest-01 | Kiểm tra sâu bệnh lần 1 | PEST_MONITORING | COMPLETED |
| act-2026-dong-prune-01 | Tỉa cành, tạo tán | PRUNING | COMPLETED |
| act-2026-dong-irrig-02 | Tưới nước tuần 2 | IRRIGATION | COMPLETED |
| act-2026-dong-fert-02 | Bón phân NPK lần 2 | FERTILIZATION | COMPLETED |
| act-2026-dong-pest-02 | Theo dõi bệnh nhóm T059–T065 | DISEASE_MONITORING | **OVERDUE** |
| act-2026-dong-bio-01 | Phun Trichoderma nhóm điều trị | BIOLOGICAL_TREATMENT | **IN_PROGRESS** |
| act-2026-dong-soil-01 | Lấy mẫu đất pH | SOIL_SAMPLING | **IN_PROGRESS** |
| act-2026-dong-irrig-03 | Tưới nước lần 3 | IRRIGATION | SCHEDULED |
| act-2026-dong-fert-03 | Bón phân Kali lần 3 | FERTILIZATION | SCHEDULED |
| act-2026-dong-check-01 | Kiểm tra tổng quát | DISEASE_MONITORING | SCHEDULED |
| act-2026-dong-harvest-01 | Thu hoạch vụ 2026 | HARVEST | SCHEDULED |

---

## Lịch chăm sóc (Cultivation Schedules)

| Zone | Loại | Trạng thái | Ngày |
|------|------|-----------|------|
| Khu Đông | IRRIGATION | DONE | 15/09 |
| Khu Bắc | INSPECTION | DONE | 18/09 |
| Khu Tây | INSPECTION | DONE | 20/09 |
| Khu Đông | PESTICIDE (Trichoderma) | IN_PROGRESS | 25/09 |
| Khu Đông | INSPECTION (pH đất) | IN_PROGRESS | 28/09 |
| Khu Đông | IRRIGATION | PLANNED | 05/10 |
| Khu Đông | FERTILIZER (Kali) | PLANNED | 12/10 |
| Khu Bắc | IRRIGATION | PLANNED | 07/10 |
| Khu Nam | FERTILIZER (NPK) | PLANNED | 10/10 |
| Khu Đông | PRUNING | PLANNED | 20/10 |
| Khu Đông | INSPECTION (trước thu hoạch) | PLANNED | 18/10 |

---

## Lô thu hoạch (Harvest Batches)

| ID | Mã lô | Season | Sản lượng | Thị trường | Ngày |
|----|-------|--------|-----------|-----------|------|
| harvest-2025-khu-dong | HB-2025-DONG-001 | 2025 Khu Đông | 1850 kg | CN | 15/10/2025 |

---

## Thông báo (Notifications) — 10 bản ghi

| ID | Loại | Tiêu đề | Đã đọc |
|----|------|---------|-------|
| notif-disease-dc010-leaf-blight | DISEASE | Phát hiện bệnh đốm lá – DC-T010 | Chưa |
| notif-disease-t059-cluster | DISEASE | Cảnh báo: Nhóm T059–T065 nhiễm bệnh | Đã đọc |
| notif-pest-allocaridara-t009 | DISEASE | Phát hiện bọ chích hút Allocaridara | Đã đọc |
| notif-schedule-overdue-pest02 | GENERAL | Lịch kiểm tra quá hạn – T059–T065 | Chưa |
| notif-weather-rain-warning | WEATHER | Cảnh báo mưa lớn 3 ngày tới | Chưa |
| notif-device-cam-khu-dong | DEVICE | Camera Khu Đông hoạt động trở lại | Đã đọc |
| notif-recovery-demo-tree-010 | DISEASE | DC-T010 có dấu hiệu hồi phục tốt | Chưa |
| notif-schedule-upcoming-fert | GENERAL | Nhắc lịch bón phân Kali 12/10 | Chưa |
| notif-expert-response | EXPERT | Chuyên gia tư vấn xử lý bệnh đốm lá | Đã đọc |
| notif-harvest-reminder | GENERAL | Nhắc lịch thu hoạch Khu Đông 20/10 | Chưa |

---

## Mã bệnh hợp lệ đã sử dụng

- `LEAF_BLIGHT` — bệnh đốm lá đốm nâu (Phytophthora)
- `ALGAL_LEAF_SPOT` — bệnh tảo đốm lá
- `PHOMOPSIS_LEAF_SPOT` — bệnh đốm lá Phomopsis
- `ANTHRACNOSE` — bệnh ghẻ/thán thư
- `ALLOCARIDARA_ATTACK` — bọ chích hút Allocaridara
- `HEALTHY_LEAF` / `HEALTHY` — lá khoẻ / cây khoẻ
- `RECOVERED_BY_FARMER` — cây đã hồi phục (trigger HEALTHY status)

---

## Scripts đã dùng để seed

| Script | Database | Mô tả |
|--------|----------|-------|
| seed-farm.js | duriancare_farm | Zones, tree redistribution, diagnosis records |
| seed-cultivation.js | duriancare_cultivation | Seasons, plans, activities, schedules, harvest batch |
| seed-notifications.js | duriancare_notification | 10 notifications thực tế |

*Seed date: 2026-09-30*
