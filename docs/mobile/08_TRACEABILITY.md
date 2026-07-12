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

