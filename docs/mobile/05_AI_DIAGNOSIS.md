# 05 - AI Diagnosis

AI service đang chạy bằng FastAPI. Gateway route:

- `/api/v1/predict`
- `/api/v1/predict/**`
- `/api/v1/chat/**`
- `/api/ai/**`
- `/admin/rag/**`
- `/api/v1/rag/**`

## 1. Chẩn đoán từ ảnh upload

`POST /api/v1/predict`

Content-Type: `multipart/form-data`

Fields:

- `image` (bắt buộc)
- `source` = `MOBILE | WEB | IOT_CAMERA`
- `device_id` (bắt buộc khi `source = IOT_CAMERA`)

## 2. Chẩn đoán từ ảnh đã lưu trên S3

`POST /api/v1/predict/from-s3`

Body:

```json
{
  "object_key": "uploads/sample.jpg",
  "source": "MOBILE",
  "device_id": null
}
```

## 3. Endpoint cũ

`POST /api/ai/diagnoses`

Endpoint này đã đánh dấu deprecated.

## 4. Cấu trúc response chuẩn

Response AI trả về:

- `status`
- `data.predictedDisease`
- `data.confidence`
- `data.source`
- `data.deviceId`
- `data.usedDetectionCrop`
- `data.boundingBox`
- `data.image`
- `data.recommendation`
- `data.decisionSupport`

## 5. Recommendation payload

`recommendation` chứa:

- `diseaseCode`
- `vietnameseName`
- `englishName`
- `scientificName`
- `issueType`
- `severity`
- `diseaseSummary`
- `favorableConditions`
- `symptoms[]`
- `causes[]`
- `prevention[]`
- `biologicalTreatments[]`
- `organicTreatments[]`
- `chemicalTreatments[]`
- `maximumResidueLimits[]`
- `exportConsiderations[]`
- `references[]`

## 6. Error code thường gặp

- `400` invalid image / validation
- `413` file quá lớn
- `415` không phải ảnh
- `422` thiếu `device_id` khi dùng `IOT_CAMERA`
- `502` lỗi lưu ảnh S3 hoặc RAG backend
- `503` model / RAG / S3 chưa sẵn sàng

## 7. Ghi chú cho mobile

- Mobile chỉ cần gọi `/api/v1/predict` qua Gateway.
- Backend đã tự upload ảnh lên storage nếu cấu hình S3 bật.
- Ảnh từ IoT cũng đi qua cùng response model, không cần frontend xử lý khác.

