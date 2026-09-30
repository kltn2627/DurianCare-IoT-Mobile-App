# DurianCare Web ↔ Mobile Parity Matrix

**Generated:** 2026-09-27 (Phase 17 — corrected runtime column; treeCode context, pest UI, cultivation seed added)  
**Previous:** 2026-09-17  
**Web Reference:** DurianCare-IoT-Web-Client (Next.js 16 App Router)  
**Mobile:** DurianCare-IoT-Mobile-App (Expo SDK 54 / React Native)  
**Backend:** DurianCare-IoT-Backend (multi-service, gateway port 8080)

Status values:
- **MATCH** — functionally equivalent on both platforms  
- **PARTIAL** — feature exists on mobile but is incomplete or uses wrong API  
- **BROKEN** — mobile has a screen but uses wrong endpoint / mock data only  
- **MISSING** — feature implemented on web; no screen or API call on mobile  
- **MOBILE ONLY** — exists on mobile but not web (no parity issue)  
- **NOT IMPLEMENTED IN BACKEND** — no backend API; skip for both  

---

## Authentication

| Feature | Web | Mobile | Backend API | Status | Notes |
|---------|-----|--------|-------------|--------|-------|
| Login (email/password) | ✅ | ✅ | POST /api/auth/login | **MATCH** | |
| Register (farmer) | ✅ | ✅ | POST /api/auth/register | **MATCH** | |
| Register (engineer) | ✅ | ✅ | POST /api/auth/register/engineer | **MATCH** | Multipart with docs |
| OTP verify | ✅ | ✅ | POST /api/auth/otp/verify | **MATCH** | |
| OTP resend + countdown | ✅ | ✅ | POST /api/auth/otp/resend | **MATCH** | |
| Token refresh (proactive) | ✅ | ✅ | POST /api/auth/refresh | **MATCH** | Web: ≤30s; Mobile: ≤60s |
| Logout (server-side) | ✅ | ✅ | POST /api/auth/logout | **MATCH** | |
| Session restore on app open | ✅ | ✅ | — | **MATCH** | Web: cookie; Mobile: SecureStore |
| Approval/pending page | ✅ | ✅ | — | **MATCH** | |
| Rate-limit countdown (429) | ✅ | ✅ | Retry-After header | **MATCH** | |
| Password strength meter | ✅ | ✅ | — | **MATCH** | |
| 401 → auto-redirect to login | ✅ | ✅ | — | **MATCH** | |
| Admin engineer applications | ✅ | ✅ | GET/POST /api/auth/admin/... | **MATCH** | |

## Profile

| Feature | Web | Mobile | Backend API | Status | Notes |
|---------|-----|--------|-------------|--------|-------|
| View profile | ✅ | ✅ | GET /api/users/me | **MATCH** | |
| Edit profile | ✅ | ✅ | PUT /api/users/me | **MATCH** | |
| Avatar upload | ✅ | ✅ | POST /api/users/me/avatar | **MATCH** | |
| Avatar delete | ✅ | ✅ | DELETE /api/users/me/avatar | **MATCH** | |
| Change password | ❌ (not in web) | ❌ (placeholder, disabled) | NOT IMPLEMENTED IN BACKEND | **NOT IMPLEMENTED IN BACKEND** | |

## Notifications

| Feature | Web | Mobile | Backend API | Status | Notes |
|---------|-----|--------|-------------|--------|-------|
| Notification list (paginated) | ✅ | ✅ | GET /api/v1/notification/notifications | **MATCH** | |
| Unread count badge | ✅ | ✅ | GET /api/v1/notification/notifications/count | **MATCH** | |
| Filter ALL / UNREAD | ✅ | ✅ | GET .../unread | **MATCH** | |
| Mark one notification read | ✅ | ✅ | PATCH .../read | **MATCH** | |
| Mark all read | ✅ | ✅ | PATCH .../read-all | **MATCH** | |
| Delete notification | ✅ | ✅ | DELETE .../:id | **MATCH** | |
| Sort options | ✅ | ✅ | sortBy + sortDirection params | **MATCH** | |
| Skeleton loading | ✅ | ✅ | — | **MATCH** | |
| Empty state | ✅ | ✅ | — | **MATCH** | |

## Search

| Feature | Web | Mobile | Backend API | Status | Notes |
|---------|-----|--------|-------------|--------|-------|
| Full-text search | ✅ | ✅ | GET /api/search?q= | **MATCH** | |
| Type filter (ARTICLE/DISEASE) | ✅ | ✅ | type param | **MATCH** | |
| Pagination | ✅ | ✅ | page + size params | **MATCH** | |
| Sort options | ✅ | ✅ | sortBy + sortDirection | **MATCH** | |

## Tree Map

| Feature | Web | Mobile | Backend API | Status | Notes |
|---------|-----|--------|-------------|--------|-------|
| Farm list | ✅ | ✅ | GET /api/farms | **MATCH** | Both data-driven, no hardcoded IDs |
| Zone list with tree count | ✅ | ✅ | GET /api/farms/{id}/zones | **MATCH** | |
| Zone tree map (visual) | ✅ (Canvas) | ✅ (SVG) | GET /api/zones/{id}/trees | **MATCH** | Web: HTML Canvas; Mobile: react-native-svg |
| Tree color by health status | ✅ | ✅ | healthStatus field | **MATCH** | HEALTHY=green, DISEASED=red, TREATING=orange, SUSPECTED=orange |
| Zone safety summary | ✅ | ✅ | GET /api/zones/{id}/safety-summary | **MATCH** | safetyRate = safeTrees/assessedTrees×100 |
| Tree detail panel/screen | ✅ (slide-in panel) | ✅ (separate screen) | GET /api/trees/{id} | **MATCH** | Both read-only; show code, variety, dates, health badge |
| Tree diagnosis history in detail | ✅ (5 most recent) | ✅ (10 most recent) | GET /api/trees/{id}/diagnoses | **MATCH** | |
| "Chẩn đoán bệnh" from tree | ✅ | ✅ | — | **MATCH** | Web: button → /diagnosis?treeId=…; Mobile: Pressable → /scanner?treeId=… (Phase B) |
| Save diagnosis to tree (backend) | ✅ | ✅ | POST /api/trees/{id}/diagnoses | **MATCH** | Web: "Lưu chuẩn đoán" when ?treeId= present; Mobile: "Lưu vào hồ sơ cây" after diagnosis (Phase B) |
| 100 trees in zone | ✅ | ✅ | durian_trees collection | **MATCH** | 100 trees seeded (DC-T001 to DC-T100) |
| Tree table / list | ✅ (sortable table) | ✅ (list below map) | GET /api/zones/{id}/trees | **MATCH** | |
| Tree QR code (tree-level) | ❌ | ❌ | — | **NOT IMPLEMENTED IN BACKEND** | QR scan is for export traceability only |

## AI Diagnosis

| Feature | Web | Mobile | Backend API | Status | Notes |
|---------|-----|--------|-------------|--------|-------|
| Image capture / upload | ✅ | ✅ (camera) | POST /api/v1/predict | **MATCH** | Both use POST /api/v1/predict with `image` form field; Mobile: diseasePredictionApi.ts L5,169 |
| Disease result display | ✅ | ✅ | predictedDisease + confidence | **MATCH** | Response parsed correctly in both platforms |
| Confidence percentage | ✅ | ✅ | confidence field | **MATCH** | Mobile: stored as %; divides by 100 before saving to backend |
| Bounding box overlay | ✅ | ✅ | bounding_box | **MATCH** | Both render bounding box overlay on result |
| 422 safety rejection | ✅ | ✅ | HTTP 422 + detail | **MATCH** | Web: "Không phát hiện được lá sầu riêng"; Mobile: "Không phát hiện lá sầu riêng trong ảnh" — both correct |
| 5xx service unavailable | ✅ | ✅ | HTTP 5xx | **MATCH** | Both show Vietnamese error message |
| Diagnosis recommendation | ✅ | ✅ (local catalog) | recommendation field | **PARTIAL** | Web uses API recommendation; Mobile uses local diseaseDetails.ts |
| Diagnosis history | ✅ (session state) | ✅ (AsyncStorage) | — | **MATCH** (behavior parity) | Both non-persistent across sessions effectively |
| Source type (WEB/MOBILE/IOT_CAMERA) | ✅ | ✅ | source param | **MATCH** | Mobile passes source: "MOBILE" (diseasePredictionApi.ts L177) |
| Save AI result to specific tree | ✅ | ✅ | POST /api/trees/{id}/diagnoses | **MATCH** | Both: save button shown only when treeId context present (Phase B) |
| ESP32-CAM live preview + capture | ✅ | ✅ | GET /api/v1/camera/snapshot | **MATCH** | Web: 4s polling; Mobile: camera view |

## Knowledge / RAG

| Feature | Web | Mobile | Backend API | Status | Notes |
|---------|-----|--------|-------------|--------|-------|
| Knowledge article list | ✅ | ⚠️ (5 hardcoded) | GET /api/knowledge/articles | **BROKEN** | Mobile uses local static articles |
| Article detail by slug | ✅ | ⚠️ (local) | GET /api/knowledge/articles/{slug} | **BROKEN** | Mobile reads from local array |
| Article search | ✅ (via /api/search type=ARTICLE) | ✅ (via search API) | GET /api/search | **MATCH** | |
| AI knowledge chat (RAG) | ✅ (not in client—engineer only) | ⚠️ | POST /api/v1/chat/ask | **BROKEN** | Mobile calls `/api/v1/chat/ai` (does not exist in backend) |
| Create/edit knowledge article | ✅ (engineer/admin) | ❌ | POST/PUT /api/knowledge/articles | **MISSING** | Mobile role doesn't need this |

## Community

| Feature | Web | Mobile | Backend API | Status | Notes |
|---------|-----|--------|-------------|--------|-------|
| Browse community users | ✅ | ❌ | GET /api/community/users | **MISSING** | |
| Community post feed | ✅ | ⚠️ (2 hardcoded) | GET /api/community/posts | **BROKEN** | Mobile uses local mock only |
| Create post | ✅ | ⚠️ (local) | POST /api/community/posts | **BROKEN** | |
| React to post (like etc.) | ✅ | ⚠️ (local) | POST /api/community/posts/:id/reaction | **BROKEN** | |
| Comment on post | ✅ | ⚠️ (local) | POST /api/community/posts/:id/comments | **BROKEN** | |
| Delete post | ✅ | ❌ | DELETE /api/community/posts/:id | **MISSING** | |

## Connections

| Feature | Web | Mobile | Backend API | Status | Notes |
|---------|-----|--------|-------------|--------|-------|
| Browse users | ✅ | ❌ | GET /api/community/users | **MISSING** | |
| Search by phone | ✅ | ❌ | GET /api/connections/search?phoneNumber= | **MISSING** | |
| Send connection request | ✅ | ❌ | POST /api/connections/requests | **MISSING** | |
| View incoming requests | ✅ | ❌ | GET /api/connections/requests/incoming | **MISSING** | |
| Accept / reject request | ✅ | ❌ | PATCH /api/connections/requests/:id/accept | **MISSING** | |
| Cancel outgoing request | ✅ | ❌ | PATCH /api/connections/requests/:id/cancel | **MISSING** | |
| List connections | ✅ | ❌ | GET /api/connections | **MISSING** | |
| Disconnect | ✅ | ❌ | DELETE /api/connections/:id | **MISSING** | |

## Chat

| Feature | Web | Mobile | Backend API | Status | Notes |
|---------|-----|--------|-------------|--------|-------|
| Conversation list | ✅ | ❌ | GET /api/chat/conversations | **MISSING** | Mobile has no REST conversation list |
| Create conversation | ✅ | ❌ | POST /api/chat/conversations | **MISSING** | |
| Send message (text) | ✅ | ⚠️ | POST /api/chat/conversations/:id/messages | **BROKEN** | Mobile uses custom WebSocket instead |
| Real-time updates (Socket.IO) | ✅ | ❌ | Socket.IO /chat namespace | **MISSING** | Mobile uses raw WebSocket to nonexistent endpoint |
| Mark conversation read | ✅ | ❌ | POST /api/chat/conversations/:id/read | **MISSING** | |
| Treatment regimen message | ✅ | ⚠️ | POST /api/chat/conversations/:id/regimens | **PARTIAL** | Mobile renders regimens but can't send to backend |
| AI RAG chat (Q&A) | n/a (engineer) | ⚠️ | POST /api/v1/chat/ask | **BROKEN** | Wrong endpoint `/api/v1/chat/ai`, wrong request format |

## Cultivation

| Feature | Web | Mobile | Backend API | Status | Notes |
|---------|-----|--------|-------------|--------|-------|
| List cultivation activities | ✅ | ⚠️ | GET /api/v1/cultivation-activities | **PARTIAL** | API function exists, calendar UI uses hardcoded mock |
| Cultivation plan calendar | ✅ | ⚠️ | GET /api/v1/cultivation-plans/:id/calendar | **PARTIAL** | Same |
| Create activity | ✅ | ❌ | POST /api/v1/cultivation-activities | **MISSING** | |
| Update activity status | ✅ | ❌ | POST .../start / .../complete / .../skip / .../cancel | **MISSING** | |
| Cultivation zones | ✅ | ❌ | GET /api/v1/cultivation-zones | **MISSING** | No zone management in Mobile |
| Agricultural inputs | ✅ | ❌ | GET /api/v1/agricultural-inputs | **MISSING** | |
| Safe harvest date | ✅ | ⚠️ (in cultivationApi.ts) | GET /api/v1/cultivation-seasons/:id/safe-harvest-date | **PARTIAL** | Defined but not used |
| Compliance assessment | ✅ | ⚠️ | POST /api/v1/cultivation-seasons/:id/compliance-assessments | **PARTIAL** | Defined but not used |

## Traceability

| Feature | Web | Mobile | Backend API | Status | Notes |
|---------|-----|--------|-------------|--------|-------|
| Public trace view (QR scan result) | ✅ | ✅ | GET /api/v1/public/traceability/:code | **MATCH** | |
| Batch list | ❌ (web uses export-compliance) | ✅ | GET /api/v1/export-assessment/batches | **MOBILE ONLY** | |
| Batch status update | ❌ | ✅ | PATCH /api/v1/export-assessment/batches/:id/status | **MOBILE ONLY** | |
| Batch finalize + QR | ❌ | ✅ | POST /api/v1/export-assessment/batches/:id/finalize | **MOBILE ONLY** | |
| QR code scanner | ❌ | ✅ | — | **MOBILE ONLY** | |
| Create batch | ❌ | ❌ | POST /api/v1/export-assessment/batches | **MISSING** (both) | Not in web or mobile |

## Export Compliance

| Feature | Web | Mobile | Backend API | Status | Notes |
|---------|-----|--------|-------------|--------|-------|
| Run compliance assessment | ✅ | ✅ | POST /api/v1/export-assessment/evaluate | **MATCH** | |
| Assessment history | ✅ | ❌ | GET /api/v1/export-assessment/history | **MISSING** | Mobile shows only current result |
| Chemical log | ✅ | ⚠️ | GET /api/v1/export-assessment/chemicals | **PARTIAL** | Mobile loads chemicals but no input UI |
| Target market selector | ✅ | ✅ | markets list | **MATCH** | |

## IoT / Sensors / Camera

| Feature | Web | Mobile | Backend API | Status | Notes |
|---------|-----|--------|-------------|--------|-------|
| Latest sensor reading | ✅ | ✅ | GET /api/v1/sensors/latest | **MATCH** | |
| Sensor history + charts | ✅ | ✅ | GET /api/v1/sensors/history | **MATCH** | |
| Camera live snapshot | ✅ | ✅ | GET /api/v1/camera/snapshot | **MATCH** | |
| Camera trigger capture | ✅ | ✅ | POST /api/v1/camera/capture-now | **MATCH** | |
| Camera capture history | ✅ | ✅ | GET /api/v1/camera/history | **MATCH** | |
| Camera schedule (view/edit) | ✅ | ❌ | GET/PUT /api/v1/camera/schedule | **MISSING** | Mobile has no schedule UI |
| Device selection | ✅ (user input) | ❌ | device_id param | **MISSING** | Mobile hardcodes "esp32-01" |

## Navigation / UX

| Feature | Web | Mobile | Status | Notes |
|---------|-----|--------|--------|-------|
| Role-aware navigation | ✅ | ✅ | **MATCH** | |
| Skeleton loading | ✅ | ✅ | **MATCH** | |
| Error states (per feature) | ✅ | ✅ | **MATCH** | |
| Empty states | ✅ | ✅ | **PARTIAL** | Community/Knowledge missing proper empty states |
| Pull-to-refresh | ✅ | ✅ | **MATCH** | |

---

## Summary: Items to Implement

### DONE
- **Web** ✅: `TreeDetailPanel` → "Chẩn đoán bệnh" button → `/diagnosis?treeId=…` (Phase 9)
- **Web** ✅: `DiseaseDiagnosisWorkspace` accepts `treeId`; "Lưu chuẩn đoán" button calls `POST /api/trees/{id}/diagnoses` (Phase 9)
- **Web** ✅: Diagnosis page reads `?treeId` from `searchParams` (Phase 9)
- **Mobile** ✅: `TreeDetailScreen` → "Chẩn đoán bệnh" button → `/scanner?treeId=…` (Phase B)
- **Mobile** ✅: `DurianScannerScreen` reads `treeId` via `useLocalSearchParams`; "Lưu vào hồ sơ cây" button calls `saveDiagnosis(treeId, …)` (Phase B)
- **Mobile** ✅ AI endpoint corrected to `/api/v1/predict`, field `image`, source `"MOBILE"` (prior session)

### BROKEN (local mock replacing real API — medium work)
1. Community posts: replace 2 hardcoded posts with GET /api/community/posts
2. Community create/react/comment: wire to real API
3. Knowledge articles: replace 5 static articles with GET /api/knowledge/articles
4. AI RAG Chat: `/api/v1/chat/ai` → `/api/v1/chat/ask`, multipart → JSON body

### MISSING (complete feature implementations)
5. Connections: browse users, send/accept/reject/cancel requests, list connections
6. Chat: conversation list, send messages, Socket.IO real-time (backend chat service)
7. Cultivation: wire calendar to real API (list activities from cultivation-activities)

### PARTIAL (exists but needs wiring)
8. Cultivation: create/update activity via backend
9. Export compliance: assessment history
10. Camera: schedule view/edit
11. IoT: device_id selector (currently hardcodes "esp32-01")

### NOT IMPLEMENTABLE (data missing)
- **Phases F–J (Harvest/Vụ mùa sync, export)**: `duriancare_cultivation` has 0 documents in ALL collections. Cannot implement until harvest data is seeded.
- **Phase K (QR tree identity)**: No tree-level QR in backend. `duriancare_traceability` has 0 documents. Current QR is export-batch only (VN-*-YYYY-XXXX codes).

---

## Runtime Test Log

Verified by direct tool/query (not just code inspection):

| What | Method | Result | Date |
|------|--------|--------|------|
| `durian_trees` count | MongoDB query | **100 docs** (DC-T001 to DC-T100) | 2026-09-17 |
| `tree_diagnosis_records` count | MongoDB query | **83 docs** | 2026-09-17 |
| `farms` count | MongoDB query | **1 doc** | 2026-09-17 |
| `duriancare_cultivation` — ALL collections | MongoDB query | **0 docs each** (14 collections listed) | 2026-09-17 |
| `duriancare_traceability` — ALL collections | MongoDB query | **0 docs each** | 2026-09-17 |
| Safety formula verification | API `GET /api/zones/{id}/safety-summary` | safetyRate=63.86%, assessed=83, safe=53, notAssessed=17 | prior session |
| Backend `@NotBlank imageUrl` constraint | Code inspection `SaveTreeDiagnosisRequest.java` | `@NotBlank` confirmed; Web uses `"WEB_AI_NO_STORED_IMAGE"` fallback; Mobile uses `photo.uri` | 2026-09-17 |
| `treeId` URL param survival through camera flow | Code inspection (`useLocalSearchParams`) | URL-based, inherently survives camera capture | 2026-09-17 |
| Diagnosis history preservation | Code inspection `TreeDiagnosisService.java` | `save()` appends; no delete | 2026-09-17 |
| Mobile AI endpoint | Code inspection `diseasePredictionApi.ts:5` | `PREDICTION_PATH = "/api/v1/predict"` ✅ | 2026-09-17 |
| Mobile AI field name | Code inspection `diseasePredictionApi.ts:169` | `formData.append("image", ...)` ✅ | 2026-09-17 |
| Mobile source param | Code inspection `diseasePredictionApi.ts:177` | `formData.append("source", "MOBILE")` ✅ | 2026-09-17 |
| Phase B save-to-tree in scanner | Code inspection `DurianScannerScreen.tsx` | `saveDiagnosis(treeId, {...})` present at line 107 ✅ | 2026-09-17 |
| Docker services running | `docker ps` | 17 containers up (gateway:8080, farm:8082, ai:8000, mongo:27018) | 2026-09-17 |

| treeCode in diagnosis URL (Web) | Code inspection `TreeDetailPanel.tsx` | `href` now includes `&treeCode=…` ✅ | 2026-09-27 |
| treeCode shown in result banner (Web) | Code inspection `DiseaseDiagnosisWorkspace.tsx` | "Cây: DC-T042" chip + "Đã lưu kết quả cho cây DC-T042" ✅ | 2026-09-27 |
| treeCode in scanner URL (Mobile) | Code inspection `TreeDetailScreen.tsx` | `&treeCode=…` appended to `/scanner?treeId=…` ✅ | 2026-09-27 |
| treeCode shown in scanner result (Mobile) | Code inspection `DurianScannerScreen.tsx` | `treeContextBadge` + updated save labels ✅ | 2026-09-27 |
| Pest vs disease UI distinction | Code inspection `diseaseCatalog.ts` | `category: "PEST"` for Allocaridara_Attacked; category alerts in both Web + Mobile ✅ | 2026-09-27 |
| Category alert messages | `diseaseCatalog.ts` + `labels.ts` | HEALTHY/PEST/DISEASE each get distinct Vietnamese alert | 2026-09-27 |
| Cultivation seed (non-destructive) | MongoDB insert | `cultivation_plans: 1 doc`, `harvest_batches: 1 doc` inserted ✅ | 2026-09-27 |
| Web dev server + login page | Browser test at localhost:3000 | Login page renders; 2 form fields, submit button ✅ | 2026-09-27 |
| API gateway health | `curl localhost:8080/api/farms` | HTTP 401 (auth required, gateway running) ✅ | 2026-09-27 |
| Web production build | `npm run build` | 0 errors ✅ | 2026-09-27 |
| Web TypeScript | `npx tsc --noEmit` | 0 errors ✅ | 2026-09-27 |
| Mobile TypeScript | `npx tsc --noEmit` | 0 errors ✅ | 2026-09-27 |

**Not runtime-tested** (requires authenticated FARMER session / running mobile app on device):
- Full FARMER login → Farm → Zone → Tree Map → Tree Detail → Scanner → Save flow
- AI prediction live response (requires connected AI service + real image)
- Mobile camera capture (requires physical device or emulator)
- Community/Chat/Connections (zero data in relevant DBs)
- Harvest/export compliance through Web UI (requires FARMER login + new cultivation data)

---

## Phase 17 — Final Feature Parity Table

| Feature | Backend API | Web | Mobile | Runtime Verified |
|---------|------------|-----|--------|-----------------|
| Farmer access | ✅ (auth-service) | ✅ (OWNER nav, "Bản đồ cây") | ✅ (same auth) | Code-verified |
| Farm list | ✅ GET /api/farms | ✅ | ✅ | Code-verified; 1 farm in DB |
| Cultivation area (zone) | ✅ GET /api/farms/{id}/zones | ✅ | ✅ | Code-verified |
| Tree Map visual | ✅ GET /api/zones/{id}/trees | ✅ Canvas | ✅ SVG | Code-verified; 100 trees in DB |
| Tree Detail | ✅ GET /api/trees/{id} | ✅ slide-in panel | ✅ screen | Code-verified |
| Tree position (X/Y) | ✅ positionX/positionY | ✅ map dot | ✅ map dot | Code-verified |
| Camera/diagnosis entry from tree | ✅ (via diagnosis save) | ✅ button → /diagnosis?treeId=…&treeCode=… | ✅ button → /scanner?treeId=…&treeCode=… | Code-verified |
| Image capture | ✅ POST /api/v1/predict | ✅ upload + ESP32-CAM | ✅ device camera | Code-verified |
| AI diagnosis | ✅ Python AI service (port 8000) | ✅ | ✅ | Code-verified; endpoint + field correct |
| Pest detection | ✅ ALLOCARIDARA_ATTACK label | ✅ amber banner "sâu/bọ" | ✅ amber alert "sâu/bọ" | Code-verified |
| Disease detection | ✅ ALGAL_LEAF_SPOT / LEAF_BLIGHT / PHOMOPSIS | ✅ red banner | ✅ red alert | Code-verified |
| Non-leaf rejection | ✅ HTTP 422 | ✅ "Không phát hiện lá sầu riêng" | ✅ same | Code-verified |
| Low confidence | Backend returns value | ✅ displayed as % | ✅ displayed as % | Code-verified; no threshold gate (by design) |
| AI failure (5xx/timeout) | — | ✅ orange banner, retry | ✅ error card, retry | Code-verified |
| Save diagnosis to tree | ✅ POST /api/trees/{id}/diagnoses | ✅ "Lưu chuẩn đoán" | ✅ "Lưu vào hồ sơ cây DC-T042" | Code-verified |
| Diagnosis history | ✅ GET /api/trees/{id}/diagnoses | ✅ 5 most recent | ✅ 10 most recent | DB-verified; 83 records |
| Tree status (healthStatus) | ✅ inferHealthStatus() | ✅ health badge | ✅ health badge | DB-verified |
| Harvest (Vụ mùa) | ✅ cultivation-service (port 18084) | ✅ calendar UI | ⚠️ PARTIAL (API defined, not wired) | DB-verified: 1 plan + 1 batch seeded |
| Safety summary | ✅ GET /api/zones/{id}/safety-summary | ✅ safetyRate displayed | ✅ same | API-verified: 63.86% |
| Export compliance | ✅ export-assessment-service | ✅ | ✅ | Code-verified |
| QR scan | ✅ traceability (export batch only) | ❌ not applicable | ✅ batch QR scan | DB-verified: 0 traceability docs; no tree QR |

---

*Status as of 2026-09-27. Phase L/17 complete. Phases F–J: cultivation data seeded (1 plan, 1 harvest batch). Runtime E2E blocked on FARMER credentials — requires user login.*
