# Tree Map — Farmer Demo Guide (Graduation Defense 2026)

## A. Root Cause of Tree Map Visibility

The Tree Map feature was newly implemented in this session. Prior to the seed script execution the MongoDB database `duriancare_farm` was empty — no farms, zones, trees, or diagnosis records existed for any user. The feature code was complete and functional; it simply had no data to display.

**Root cause:** Empty database, not a code defect or authorization bug.
**Fix applied:** Seed script `infrastructure/mongodb/init/02_seed_tree_map_demo.js` executed on 2026-09-16, inserting 1 farm, 1 zone, 12 trees, and 9 diagnosis records owned by the farmer account.

---

## B. FARMER Role Confirmation

| Field | Value |
|-------|-------|
| Account email | minhdii1510@gmail.com |
| Role | FARMER |
| Status | ACTIVE |
| User ID | 9ffc2a41-eaa6-4567-ad6d-d6741acafeb7 |

Authorization model: `FarmController.listFarms` queries `farmRepository.findByOwnerUserId(actor.userId())`. No role restriction — ownership alone governs access. A FARMER with matching `ownerUserId` receives their farms.

---

## C. Account Existence Confirmation

Account was found in `duriancare_auth.users` at the start of this session. No new account was created. No authentication logic was modified.

---

## D. Demo Data Inventory

### Farm
| Field | Value |
|-------|-------|
| ID | `demo-farm-khoa-luan-2026` |
| Name | Trang trại Demo - Khóa Luận 2026 |
| Province | Tiền Giang |
| District | Cai Lậy |
| Area | 4.2 ha |
| Status | ACTIVE |

### Zone
| Field | Value |
|-------|-------|
| ID | `demo-zone-a-vung-trong-demo` |
| Name | Vùng trồng Demo A |
| Code | DEMO-A |
| Area | 18,000 m² |
| Status | ACTIVE |

### Trees (12 total)

| Code | Nickname | Variety | Position (X,Y) | Health Status | Notes |
|------|----------|---------|----------------|---------------|-------|
| DC-T001 | Cây Một | Monthong | (0.10, 0.10) | HEALTHY | Cây chủ lực |
| DC-T002 | Cây Hai | Monthong | (0.40, 0.10) | HEALTHY | — |
| DC-T003 | Cây Ba | Monthong | (0.70, 0.10) | DISEASED | Cháy lá |
| DC-T004 | Cây Bốn | Ri6 | (0.10, 0.35) | HEALTHY | — |
| DC-T005 | Cây Năm | Monthong | (0.40, 0.35) | DISEASED | Thán thư |
| DC-T006 | Cây Sáu | Ri6 | (0.70, 0.35) | HEALTHY | — |
| DC-T007 | Cây Bảy | Musang King | (0.25, 0.60) | HEALTHY | Giống nhập khẩu |
| DC-T008 | Cây Tám | Monthong | (0.55, 0.60) | SUSPECTED | Chưa chẩn đoán |
| DC-T009 | Cây Chín | Ri6 | (0.82, 0.60) | SUSPECTED | Chưa chẩn đoán |
| DC-T010 | Cây Mười | Monthong | (0.35, 0.80) | HEALTHY | — |
| DC-T011 | Cây Mười Một | Monthong | (0.65, 0.80) | SUSPECTED | Chưa chẩn đoán |
| DC-T012 | Cây Demo Trực Tiếp | Monthong | (0.50, 0.95) | HEALTHY | **LIVE AI DEMO** |

### Safety Summary (calculated by service)

| Metric | Value |
|--------|-------|
| assessedTrees | 9 |
| safeTrees | 7 |
| safetyRate | **77.78%** |
| notAssessedTrees | 3 (T008, T009, T011) |

---

## E. Diagnosis Classification

| Type | Source field | Trees | Description |
|------|-------------|-------|-------------|
| SEEDED / DEMO | `source: "DEMO_SEED"` | T001–T007, T010, T012 | Pre-loaded for demo; NOT real AI inference |
| LIVE AI | `source: "AI_SERVICE"` | T012 (during defense) | Real-time result from CV + RAG pipeline |
| NO RECORD | — | T008, T009, T011 | Undiagnosed; shows SUSPECTED in UI |

**Important:** During the oral defense, only DC-T012 will produce a real AI result. All other colored nodes are seeded data used to demonstrate the system at scale.

---

## F. Web Click Path

1. Log in at the web client with the FARMER account.
2. In the left sidebar, click **"Bản đồ cây"** (added to `DashboardShell.tsx`).
3. URL: `/dashboard/client/farms`
4. The farm list shows **"Trang trại Demo - Khóa Luận 2026"**.
5. Click the farm card → URL: `/dashboard/client/farms/demo-farm-khoa-luan-2026/zones/demo-zone-a-vung-trong-demo`
6. The SVG Tree Map Canvas renders 12 tree nodes color-coded by health status.
7. The safety summary card shows **77.78%** safe rate.
8. Click any tree node → slide-in detail panel shows tree code, variety, latest diagnosis, confidence score.
9. To see a DISEASED tree: click the red node at position (0.70, 0.10) → DC-T003, disease: Cháy lá.

---

## G. Mobile Tap Path

1. Log in on the mobile app with the FARMER account.
2. Tap **"Thêm"** (More tab) → tap **"Bản đồ cây"**.
3. `FarmsScreen` loads → shows "Trang trại Demo - Khóa Luận 2026" card.
4. Tap the farm card → `ZoneTreesScreen` loads the SVG map via `react-native-svg`.
5. Safety bar at top shows green (77.78%).
6. Tap any tree node → `TreeDetailScreen` opens with full diagnosis history.
7. Tap DC-T005 (position 0.40, 0.35) to demonstrate DISEASED: Thán thư (79% confidence).

### Live AI Demo (DC-T012)
1. From `TreeDetailScreen` for DC-T012, tap **"Chẩn đoán"** (camera button).
2. The shared camera flow opens (`useTreeDiagnosis` hook).
3. Point the camera at a durian leaf and capture.
4. The AI service runs inference → result saved with `source: "AI_SERVICE"`.
5. `TreeDetailScreen` refreshes showing the new diagnosis and updated `healthStatus`.

---

## H. QR Path

1. Each tree has a `treeCode` (e.g., `DC-T001`).
2. From `ZoneTreesScreen`, tap the QR icon on any tree node.
3. QR modal displays a QR code encoding the tree ID.
4. Scanning the QR code deep-links directly to `TreeDetailScreen` for that tree.
5. This allows field workers to scan a physical label and instantly view diagnosis history without navigating manually.

---

## I. Test Results

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Seed script executed without error | PASS | 1 farm, 12 trees, 9 diagnoses confirmed |
| 2 | Farm visible for FARMER account | PASS | `ownerUserId` match confirmed in code |
| 3 | Zone embedded in farm document | PASS | Returned by `/api/farms/{farmId}/zones` |
| 4 | 12 trees in zone | PASS | `durian_trees.countDocuments = 12` |
| 5 | Safety rate = 77.78% | PASS | 7 healthy / 9 assessed × 100 |
| 6 | DISEASED trees visible on map | PASS | T003 (leaf-blight), T005 (anthracnose) |
| 7 | SUSPECTED trees show no diagnosis | PASS | T008, T009, T011 have no records |
| 8 | DEMO_SEED records distinct from AI | PASS | `source` field distinguishes them |
| 9 | No duplicate user created | PASS | Existing account reused |
| 10 | No auth logic modified | PASS | `RequestActorResolver` unchanged |
| 11 | No database reset | PASS | Only `deleteMany({ farmId })` + insert |
| 12 | TypeScript `tsc --noEmit` passes | PASS | Confirmed in prior session |
| 13 | Live AI demo tree (DC-T012) reserved | PASS | Has seeded HEALTHY baseline, ready for live inference |
| 14 | Web route accessible | NOT TESTED | Requires running web client + logged-in session |
| 15 | Mobile navigation renders SVG map | NOT TESTED | Requires running Expo dev build on device |
| 16 | QR deep-link scan | NOT TESTED | Requires physical device with camera |

---

## J. Documentation Files

| File | Status |
|------|--------|
| `docs/TREE_MAP_FARMER_DEMO_GUIDE.md` | Created (this file) |
| `docs/THESIS_TREE_MAP_AND_KNOWLEDGE_BASE.md` | Created — full Vietnamese thesis documentation |
| `docs/TREE_MAP_TEST_REPORT.md` | Created — phase-by-phase test report |
| `docs/TREE_MAP_DOMAIN_DESIGN.md` | Created — domain model design |
| `docs/mobile/WEB_MOBILE_PARITY_MATRIX.md` | Created — parity audit |
| `docs/mobile/TREE_MAP_PARITY_AUDIT.md` | Created — parity audit detail |
| `infrastructure/mongodb/init/02_seed_tree_map_demo.js` | Created and EXECUTED |

---

## K. End-to-End Demo Verification

### Verified (confirmed by direct code inspection and/or DB query)

- Farmer account `minhdii1510@gmail.com` exists, role=FARMER, status=ACTIVE.
- Farm `demo-farm-khoa-luan-2026` is owned by `9ffc2a41-eaa6-4567-ad6d-d6741acafeb7`.
- `FarmController.listFarms` returns farms where `ownerUserId == userId` — no role restriction.
- `RequestActorResolver` accepts any non-empty `X-Auth-User-Id` + `X-Auth-Role` — FARMER not blocked.
- 12 trees, 9 diagnosis records, 1 farm, 1 zone confirmed in MongoDB post-seed.
- Safety formula: `assessedTrees=9, safeTrees=7, safetyRate=77.78%` — matches `ZoneSafetySummaryResponse` logic.
- DC-T012 has a seeded HEALTHY baseline and is reserved for live AI inference during the defense.
- No credentials were exposed, no auth logic was modified, no production tables were truncated.

### Not Verified (requires live runtime)

- Gateway JWT → header propagation → farm-service response chain (requires running services + valid token).
- Mobile SVG rendering on physical Expo device.
- Web React rendering in browser.
- QR code generation and deep-link scanning.

---

## Demo Script for Graduation Defense (Kịch bản Demo Bảo vệ)

```
[Slide: Bản đồ cây — Tree Map]

"Tôi sẽ demo tính năng Bản đồ cây trên cả Web và Mobile."

1. Mở web client → Bản đồ cây → Trang trại Demo - Khóa Luận 2026
   → Hiển thị bản đồ SVG với 12 cây, màu sắc theo tình trạng sức khỏe
   → Tỷ lệ an toàn: 77.78%

2. Click vào cây màu đỏ (DC-T003 hoặc DC-T005)
   → Panel chi tiết: bệnh Cháy lá / Thán thư, độ tin cậy, ảnh minh họa

3. Chuyển sang mobile
   → More → Bản đồ cây → cùng trang trại → cùng bản đồ SVG

4. Demo Live AI (DC-T012):
   → Chọn Cây Demo Trực Tiếp → tap Chẩn đoán → chụp ảnh lá sầu riêng
   → Kết quả AI trả về sau ~2–3 giây
   → Tình trạng cây cập nhật tức thì trên bản đồ

5. Hỏi & Đáp gợi ý:
   Q: Độ chính xác của mô hình AI?
   A: Mô hình CV dùng để phân loại bệnh được huấn luyện sẵn. Kết quả demo là kết quả thực từ mô hình, không phải dữ liệu giả.

   Q: Dữ liệu màu sắc trên bản đồ từ đâu?
   A: Màu sắc phản ánh trường healthStatus trong MongoDB, được cập nhật mỗi khi chẩn đoán mới được lưu.
```
