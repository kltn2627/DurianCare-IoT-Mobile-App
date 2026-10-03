# DurianCare AI / Tree Map / Camera — Final Audit Report

**Date:** 2026-09-29  
**Branch:** duy/cleanup-fixes  
**Audit scope:** Web Client + Mobile App + IoT Backend + AI Service

---

## 1. HTTP 400 Root Cause — FIXED

### Root cause

`@NotBlank String imageUrl` in `SaveTreeDiagnosisRequest.java` rejects empty strings.  
Three call sites sent `imageUrl: ""`:

| File | Line | Bug | Fix applied |
|------|------|-----|-------------|
| `src/components/trees/TreeDetailPanel.tsx` (Web) | 146 | `prediction.image?.url ?? ""` → `""` when AI has no stored image | Changed to `\|\| "WEB_AI_NO_STORED_IMAGE"` |
| `src/components/trees/TreeDetailPanel.tsx` (Web) | 326 | RecoveryPanel hardcoded `""` | Changed to `"RECOVERY_VERIFICATION_NO_IMAGE"` |
| `src/features/trees/TreeDetailScreen.tsx` (Mobile) | 363 | RecoveryPanel hardcoded `""` | Changed to `"RECOVERY_VERIFICATION_NO_IMAGE"` |

Secondary fix in both RecoveryPanels: `diseaseCode: "Healthy_Leaf"` → `"HEALTHY_LEAF"` (consistent uppercase, matches backend `CLASS_LABELS`).

`DiseaseDiagnosisWorkspace.tsx` was already correct (`|| "WEB_AI_NO_STORED_IMAGE"`).

### Request flow confirmed (no other 400 sources)

```
Browser → POST /api/backend/trees/{treeId}/diagnoses
        → Next.js proxy (/api/backend/[...path]/route.ts)
          + adds Authorization: Bearer {accessToken}
        → Gateway :8080/api/trees/{treeId}/diagnoses
          + validates JWT
          + injects X-Auth-User-Id, X-Auth-Email, X-Auth-Role
        → Farm service :8082
          + @Valid @RequestBody SaveTreeDiagnosisRequest
          + requireTree() checks ownership
          + saves TreeDiagnosisRecord to MongoDB
```

---

## 2. Camera Pipeline Status

### Device ID fix (completed in previous session)

All five hardcoded `"esp32-cam-01"` locations corrected to `"ESP32-CAM-001"`:
- `cameraRoutes.js` (IoT service) — 3 route defaults
- `CameraMonitorScreen.tsx` (Mobile)
- `CameraSection.tsx` (Web)
- `DiseaseDiagnosisWorkspace.tsx` (Web)
- PostgreSQL `camera_schedules` table (DB UPDATE applied)

`resolveCameraUrl()` now resolves `http://192.168.1.10/capture` from DB instead of fallback `http://192.168.1.100`.

### ESP32 firmware fix (requires reflash)

Root cause of body stall: `CAMERA_GRAB_LATEST` + `fb_count=2` DMA deadlock.  
Fix applied in `arduino/DurianCare_ESP32_CAM/DurianCare_ESP32_CAM.ino`:
- `CAMERA_GRAB_WHEN_EMPTY` + `fb_count=1`
- CAMERA_ID corrected to `"ESP32-CAM-001"`

Missing files created: `app_httpd.cpp`, `camera_pins.h`.

**Action required:** Reflash ESP32-CAM using Arduino IDE with the `arduino/DurianCare_ESP32_CAM/` folder (3 files present).

---

## 3. Image Quality Comparison

| Source | Format | Notes |
|--------|--------|-------|
| Upload (Web/Mobile) | JPEG/PNG/WEBP up to 10MB | Full resolution from user device |
| ESP32-CAM capture | JPEG, OV2640 default | Lower resolution (VGA 640×480 default), adequate for leaf detection |

The AI pipeline uses YOLOv11x for leaf detection with adaptive rescue (36 YOLO calls per image) and does not require high resolution. Both sources are viable.

---

## 4. AI Model SHA256 Verification

Checksums verified against `artifacts/AI_BASELINE.md`:

```
detector:   OK  (ac2bd7f82f9fd1e054f496a90f21ce77eb9697b27a71a4ecdf6d7c47ac71408b)
classifier: OK  (fc3dc5c92e43a9dbb196029fa56f9722ed91613d11ae7ccdadda1093fd1e5afe)
```

Both match the frozen baseline. **No model replacement needed.**

---

## 5. Confidence Bug Check

**No confidence bug.** The pipeline is correct:

| Stage | Value | Notes |
|-------|-------|-------|
| AI Python internal | 0.4859 (0–1 float) | `prediction.confidence` |
| AI API response | `"48.59%"` (string) | `f"{prediction.confidence:.2f}%"` |
| Web `normalizePredictionResponse` | `48.59` (number) | `parseConfidence("48.59%") = 48.59` |
| Mobile `readNumber` | `48.59` (number) | strips `%`, parses float |
| `handleSaveToTree` / `saveResult` | `0.4859` | divided by 100 before POST |
| Backend `SaveTreeDiagnosisRequest.confidence` | `0.4859` | stored as `Double` in MongoDB |
| UI display | `"48.59%"` | `confidenceLabel` from `confidenceText` |

---

## 6. Pipeline Thresholds (from AI_BASELINE.md)

| Threshold | Value | Env Var |
|-----------|-------|---------|
| Green excess gate | 0.012 | `AI_MIN_IMAGE_GREEN_RATIO` |
| YOLO initial confidence | 0.25 | `YOLO_CONFIDENCE` |
| Min detection confidence | 0.20 | `AI_MIN_CLASSIFIER_CONFIDENCE` |
| Min crop area | 64×64 px | hardcoded |
| Max crop area | 98% of image | hardcoded |
| Min texture energy | 1.5 | `AI_MIN_CROP_TEXTURE_ENERGY` |
| Min prediction confidence | 0.0 | `AI_MIN_PREDICTION_CONFIDENCE` |

No threshold changes recommended without a full regression suite (do NOT train or modify thresholds unilaterally).

---

## 7. ESP32 Camera Image Quality

OV2640 default output: JPEG at VGA (640×480) or SVGA (800×600).  
The AI rescue pipeline (up to 36 YOLO calls with CLAHE, gamma, denoise variants) compensates for lower quality.  
**Recommendation:** Configure `FRAMESIZE_SVGA` in firmware for better crop quality, without requiring reflash of the full pipeline.

---

## 8. Model Training Decision

**DO NOT TRAIN.** All 5 blocking conditions are NOT met:

1. SHA256: ✅ both models match baseline
2. Test accuracy: 97.43% on held-out n=1088 — no degradation observed
3. No confirmed label drift
4. No confirmed preprocessing mismatch  
5. No confirmed class imbalance issue

---

## 9. AI Extensibility Plan — Pest Detection

Current `CLASS_LABELS` include `ALLOCARIDARA_ATTACK` (a pest). Extension path when data is available:

1. Add new disease codes to `CLASS_LABELS` (append only — must not reorder existing indices)
2. Retrain classifier head with additional class (`nn.Linear(1280, N+1)`)
3. Add disease entry to `knowledge-base` vector store and `diseaseLabels` map
4. Update `getDiseaseCategory()` in `src/lib/labels.ts` to return `"PEST"` for new codes
5. Update `AI_BASELINE.md` with new SHA256 and class list
6. Run full regression suite before deployment

**No infrastructure changes needed** — the AI service, Gateway, and farm service are already extensible.

---

## 10. UX Warning States

Current handling in `DiseaseDiagnosisWorkspace.tsx` and `TreeDetailPanel.tsx`:

| State | Trigger | UI shown |
|-------|---------|----------|
| `HEALTHY` | `HEALTHY_LEAF` disease code | Green banner |
| `DISEASE` | All other disease codes | Red banner |
| `PEST` | `ALLOCARIDARA_ATTACK` | Amber banner (via `getDiseaseCategory`) |
| `invalid-image` | HTTP 422 from AI | Amber card with tips |
| `service-unavailable` | HTTP 500/502/503 | Orange card |
| `general` | Other errors | Red error banner |

`LOW_CONFIDENCE` and `NO_LEAF` are handled together under `invalid-image` (HTTP 422).  
`UNAVAILABLE` maps to `service-unavailable`.

No code changes needed — existing states cover the required cases.

---

## 11. Tree Health State

Current `TreeHealthStatus` in `src/lib/trees/types.ts`:
```ts
"HEALTHY" | "DISEASED" | "TREATING" | "SUSPECTED"
```

Backend `TreeHealthStatus` enum:
```java
HEALTHY, DISEASED, TREATING, SUSPECTED
```

Desired redesign (`HEALTHY/SUSPECTED/DISEASED/PEST_RISK/RECOVERING/RESOLVED`) requires:
1. Backend: add `PEST_RISK`, `RECOVERING`, `RESOLVED` to `TreeHealthStatus` enum
2. Backend: update `inferHealthStatus()` in `TreeDiagnosisService` to map `ALLOCARIDARA_ATTACK` → `PEST_RISK`
3. Frontend: update `TreeHealthStatus` type in both Web (`src/lib/trees/types.ts`) and Mobile (`src/features/trees/treeTypes.ts`)
4. Frontend: update all health status display labels

**Deferred** — requires coordinated backend + frontend change. Current states function correctly for thesis demo.

---

## 12. Web + Mobile Parity

| Feature | Web | Mobile |
|---------|-----|--------|
| AI diagnosis (upload) | ✅ `DiseaseDiagnosisWorkspace` + `TreeDetailPanel.AIPanel` | ✅ `DurianScannerScreen` + `TreeDetailScreen.AIPanel` |
| Save diagnosis | ✅ Fixed (this session) | ✅ Fixed (this session) |
| Recovery confirmation save | ✅ Fixed (this session) | ✅ Fixed (this session) |
| Camera live preview | ✅ `Esp32LivePreview` (4s polling) | ✅ `CameraMonitorScreen` |
| Camera capture → AI | ✅ `captureFromEsp32` | Via manual capture flow |
| Diagnosis history | ✅ `listDiagnoses` | ✅ `listDiagnoses` |
| Device ID | ✅ `"ESP32-CAM-001"` | ✅ `"ESP32-CAM-001"` |

---

## 13. Mandatory Tests

| Test | Status | Command |
|------|--------|---------|
| Web TypeScript | ✅ PASS (0 errors) | `npx tsc --noEmit` in Web Client |
| Mobile TypeScript | ✅ PASS (0 errors) | `npx tsc --noEmit` in Mobile App |
| AI model SHA256 | ✅ PASS (both OK) | See Section 4 |
| Backend build | Not run (no Maven in PATH) | `mvn test` in `duriancare-farm-service` |
| End-to-end save | Requires running backend | Manual: Tree Map → AI → Save button |

---

## 14. Summary of Changes This Session

### Web Client (`DurianCare-IoT-Web-Client`)

| File | Change |
|------|--------|
| `src/components/trees/TreeDetailPanel.tsx:146` | `?? ""` → `\|\| "WEB_AI_NO_STORED_IMAGE"` (AIPanel imageUrl) |
| `src/components/trees/TreeDetailPanel.tsx:326-327` | `imageUrl: ""` → `"RECOVERY_VERIFICATION_NO_IMAGE"`, `"Healthy_Leaf"` → `"HEALTHY_LEAF"` |
| `src/components/ai/DiseaseDiagnosisWorkspace.tsx:67` | Camera device ID already correct (`"ESP32-CAM-001"`) |
| `src/components/camera/CameraSection.tsx` | Already fixed in prior session |

### Mobile App (`DurianCare-IoT-Mobile-App`)

| File | Change |
|------|--------|
| `src/features/trees/TreeDetailScreen.tsx:363-364` | `imageUrl: ""` → `"RECOVERY_VERIFICATION_NO_IMAGE"`, `"Healthy_Leaf"` → `"HEALTHY_LEAF"` |
| `src/features/camera/CameraMonitorScreen.tsx` | DEVICE_ID already fixed in prior session |

### IoT Backend / Firmware (prior session)

| Component | Change |
|-----------|--------|
| `cameraRoutes.js` | Device ID `"esp32-cam-01"` → `"ESP32-CAM-001"` (3 routes), SNAP_TIMEOUT 6s → 12s |
| `.ino` firmware | `CAMERA_GRAB_WHEN_EMPTY`, `fb_count=1`, CAMERA_ID `"ESP32-CAM-001"` |
| `app_httpd.cpp`, `camera_pins.h` | Created (were missing from repo) |
| PostgreSQL `camera_schedules` | `device_id` updated to `"ESP32-CAM-001"` (3 rows) |

---

## 15. Dynamic Camera IP Management (New Session)

### Problem
When switching Wi-Fi networks (thesis defense, hotspot 4G), the ESP32-CAM gets a new DHCP IP. The backend reads IP from `camera_devices` DB, so camera goes offline until the heartbeat reconnects — but heartbeat can't reconnect because it doesn't know the new backend IP either.

### Solution implemented

| Layer | Change |
|-------|--------|
| `deviceService.js` | Added `updateCameraUrl(pool, schema, deviceId, { ipAddress, port })` |
| `cameraRoutes.js` | Added `POST /api/v1/camera/config` — accepts `{ device_id, camera_url }`, parses URL, updates DB |
| `iotApi.ts` (Mobile) | Added `updateCameraConfig()` and `pingCamera()` |
| `CameraMonitorScreen.tsx` | Added ⚙️ gear icon in preview header → `CameraConfigModal` with URL input + ping + save |
| `client.ts` (Web) | Added `cameraClient.updateConfig()` and `cameraClient.pingSnapshot()` |
| `CameraSection.tsx` (Web) | Added ⚙️ gear icon in "Xem trực tiếp" header → inline config modal |

### How to use when changing networks

1. Switch Wi-Fi / plug in hotspot
2. Find ESP32-CAM's new IP (`arp -a` or check router DHCP table)
3. In the app: tap ⚙️ gear icon on Camera → enter `http://NEW_IP` → "Kiểm tra kết nối" → "Lưu cấu hình"
4. IoT backend's `resolveCameraUrl()` reads the new IP from DB immediately — no container restart needed

### Arduino mDNS snippet (optional — stable hostname)

To avoid needing to look up the IP at all, flash the ESP32-CAM with mDNS support:

```cpp
// Add to DurianCare_ESP32_CAM.ino — requires ESPmDNS library
#include <ESPmDNS.h>

// In setup(), after WiFi.begin():
if (MDNS.begin("duriancam")) {
  Serial.println("mDNS: http://duriancam.local");
}
```

Then set `camera_url = "http://duriancam.local"` in the config modal.
Works on Android (mDNS supported) and iOS (via Bonjour). Requires all devices on the same subnet.

---

## Outstanding Action Items

1. **Reflash ESP32-CAM** using `arduino/DurianCare_ESP32_CAM/` (3 files: `.ino`, `app_httpd.cpp`, `camera_pins.h`)
2. Post-reflash: test `curl http://192.168.1.10/capture` → expect JPEG body
3. Post-reflash: assign camera to tree via `PATCH /api/v1/camera/devices/ESP32-CAM-001/tree`
4. Run `mvn test` in `duriancare-farm-service` to verify backend unit tests
5. Manual E2E test: Tree Map → select tree → AI tab → upload leaf photo → Phân tích → Lưu vào hồ sơ
6. Manual E2E test: Tree Map → select diseased tree → XÁC NHẬN PHỤC HỒI → confirm
