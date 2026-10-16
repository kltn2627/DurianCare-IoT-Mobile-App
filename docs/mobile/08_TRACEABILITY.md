# 08 - Traceability

## 1. Hiện trạng backend

Trong source hiện tại, module traceability đã có:

- domain model
- repository
- data storage cho QR traceability / treatment protocol / execution

Nhưng **chưa phát hiện public REST controller** nào được expose cho mobile.

## 2. Các domain chính

- `QrTraceability`
- `TreatmentProtocol`
- `TreatmentExecution`
- `TraceabilitySnapshot`
- `TraceabilityProfile`

## 3. Ý nghĩa dữ liệu

Các domain này đang giữ:

- phác đồ điều trị
- bước thực hiện
- lịch sử thực thi
- QR public URL / QR image URL
- token hash / expiry

## 4. Ghi chú cho mobile

- Nếu frontend mobile cần xem QR hoặc truy xuất nguồn gốc, hiện tại backend chưa có endpoint REST public được định nghĩa rõ trong source.
- Tạm thời đây là module data-layer / back-office data model.
- Khi cần public API, nên bổ sung sau để tránh đoán contract.

## Current Private Cultivation Workflow - 2026-10-16

The historical public traceability-service gap above is distinct from the existing private Cultivation
API now used by DurianTraceabilityScreen. GET /api/v1/export-releases/{id}/traceability returns
releaseId and snapshot and requires Gateway authentication plus farm/zone access. It is not a public
certificate. The screen validates the selected release ID, invalidates obsolete snapshot requests and
shows request failure inside the detail modal rather than presenting stale snapshot data.

Farmer self-inspection uses POST /api/v1/export-releases/{id}/inspect with dated source references,
actual checks and optional measured Brix. The backend still enforces PHI/compliance/ownership.
Operational productionStatus is separate from date-based season status and release/shipping status.
Synthetic fixtures stay labelled Mo phong and excluded from operational release summary counts.

Dispatch record/confirmation/delivery and season-production actions have backend API support;
this update does not claim full native forms or a tested physical-device end-to-end workflow.
Typecheck and all-platform Expo export evidence is recorded in the Backend team-readiness report.

