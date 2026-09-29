# DurianCare Mobile-Web Function Parity Audit

Last updated: 2026-09-27

Scope: final mobile parity gap reconciliation audit after Farm / Zone / Season Catalog Gateway E2E. This is an audit-only document. No Web, Backend, or Mobile business logic was changed for this reconciliation.

Core rule: backend business contract wins over Web mocks. Web is used as UX evidence only when backed by a real backend contract.

# Inventory Integrity

The previous parity report claimed:

| Status | Count |
|---|---:|
| DONE | 119 |
| PARTIAL | 8 |
| MISSING | 3 |
| TOTAL | 130 |

The previous document did not contain 130 individual line items. It contained a reduced function matrix plus a module summary, and those two sections did not reconcile: the visible matrix exposed only 6 `PARTIAL` rows and 1 `MISSING` row, while the completion calculation claimed 10 `PARTIAL` and 3 `MISSING`.

This document does not invent a new denominator. It preserves the verified 130-function inventory number and records the remaining non-DONE inventory after Connections -> Chat and direct Care History were implemented on Mobile.

# Exact 130-Function Recount

| Status | Count | Source of truth |
|---|---:|---|
| DONE | 119 | Current parity baseline after completed phases plus two final Mobile parity fixes |
| PARTIAL | 8 | Reconciled below from source-code evidence and prior canonical gaps |
| MISSING | 3 | Reconciled below from source-code evidence and prior canonical gaps |
| TOTAL | 130 | Preserved denominator |

Formula:

`119 + 8 + 3 = 130`

Raw completion:

`119 / 130 = 91.5%`

# Catalog Evidence Reconciliation

`FARM_ZONE_SEASON_CATALOG = CODE VERIFIED; PHYSICAL CROSS-PLATFORM PARITY NOT VERIFIED`.

2026-09-27 source re-audit found that the Web “Khu canh tác” screen had been falling back to browser `localStorage` (`duriancare.mock.cultivation-zones`) after the non-existent `GET /api/v1/cultivation-zones` returned 404. Its displayed records were not backend data and were not scoped to the authenticated user.

The only persisted zone source is `Farm.zones` (`FarmZone`) in the farm-service Mongo `farms` collection, exposed through `GET /api/v1/farms` and `POST/PATCH/DELETE /api/v1/farms/{farmId}/zones`. Mobile already used that source. Web has now been moved to the same contract; no mock is used by the zone screen.

| Chain | Status |
|---|---|
| Mobile canonical Farm -> FarmZone -> CultivationSeason code path | CODE VERIFIED |
| Web canonical Farm -> FarmZone code path | CODE VERIFIED |
| Gateway create/re-read/persistence | BACKEND CONTRACT VERIFIED from controller/service source |
| Same-user Web ↔ Mobile persisted-record comparison | NOT TESTED ON PHYSICAL IPHONE |
| Create/edit/archive round trip in both directions | NOT TESTED ON PHYSICAL IPHONE |

The rich Web-only fields (tree count, variety, planting date/age, growth stage and harvest history) are absent from the persisted `FarmZone` DTO. Both clients must show an explicit unavailable value rather than inventing or retaining mock data until a separately designed backend contract adds those fields.

# Complete Remaining PARTIAL Inventory

| # | Module | Function | Current Status | Web Behavior | Backend Capability | Mobile Current State | Why Not DONE | Evidence | Classification | Recommended Action |
|---:|---|---|---|---|---|---|---|---|---|---|
| P1 | Residue | Residue standard create/import workflows | PARTIAL | Web advanced residue tab supports create/import behind admin permission | `POST /api/v1/residue-standards` and `/import` exist | Mobile reads residue standards only | Write/import workflow is admin-heavy and Mobile does not expose it | Web permission `RESIDUE_STANDARD_MANAGE` is ADMIN-only; Mobile traceability screen is read-only | ADMIN_ONLY | Do not add farmer UI; decide whether admin mobile needs residue management |
| P2 | Lab | Lab sample/result workflow completion | PARTIAL | Web lab tab lists samples and can create sample | Backend has sample create/list/detail and result create | Mobile reads lab samples only | Complete result read/list/detail loop was not found; Mobile cannot present coherent result workflow | Backend controller has `POST /api/v1/lab-results` but no result list/detail endpoint found | BACKEND_CAPABILITY_GAP | Define lab result read/detail contract before Mobile completion |
| P3 | AI Diagnosis | Share diagnosis to engineer | PARTIAL | Web has engineer share panel | Chat text messages supported | Mobile builds `shareText`, opens expert chat, can send pending report | Implementation exists but live target-conversation E2E is pending | Mobile `DiagnosisResultScreen.tsx`, `DurianFieldChannelScreen.tsx`, `DurianExpertChannel.tsx` | E2E_PENDING | Run farmer -> accepted engineer -> share report E2E |
| P4 | Dashboard | Quick actions | PARTIAL | Web role dashboards navigate to modules | Target APIs mostly exist | Mobile quick actions navigate to calendar/chat/community/knowledge/authorization | Buttons are implemented, but several targets are themselves partial or untested on device | Mobile `DurianOperationsScreen.tsx` quick actions | E2E_PENDING | Run device walkthrough for every quick action |
| P5 | Notifications | Push tap / cold-start target routing | PARTIAL | Web inbox target links are in-app | Notification metadata exists | Mobile inbox/detail router exists | Runtime push response handler/cold-start path is not verified | Mobile `notificationTargetResolver.ts`; no full push runtime E2E | E2E_PENDING | Add push runtime test matrix before closure |
| P6 | Chat | Socket realtime room auth | PARTIAL | Web chat uses realtime | Socket gateway exists | Mobile realtime hook exists | REST path works by implementation; Web-Mobile socket E2E remains pending | Mobile `useChatRealtime.ts`; backend socket gateway | E2E_PENDING | Run two-device/Web-Mobile realtime E2E |
| P7 | Activities | Approve/reject runtime hardening | PARTIAL | Web approve/reject exists | Backend endpoints exist but are permissive | Mobile gates actions to pending approval | Mobile implementation exists, but backend transition hardening and runtime E2E remain open | Mobile pending-only gate; backend only checks update permission and `approvalRequired` | E2E_PENDING | Test pending chemical activity; separately harden backend transitions |
| P8 | Community | Media authorization verification | PARTIAL | Web uses real media route | Media endpoint exists | Mobile resolves media URLs | Access control verification is not complete | Prior security audit flagged private/CONNECTIONS media verification | E2E_PENDING | Run cross-user media access tests |

# Complete Remaining MISSING Inventory

| # | Module | Function | Current Status | Web Behavior | Backend Capability | Mobile Current State | Why Not DONE | Evidence | Classification | Recommended Action |
|---:|---|---|---|---|---|---|---|---|---|---|
| M1 | Agricultural Input | Create/manage agricultural inputs | MISSING | Web advanced inputs tab can create inputs behind admin permission | `POST /api/v1/agricultural-inputs`, list, detail exist | Mobile can list/select inputs in task form, but no create/manage UI | Web exposes this as admin-heavy data management; Mobile lacks admin input management | Web `RESIDUE_STANDARD_MANAGE` permission gates inputs; backend create endpoint exists | ADMIN_ONLY | Confirm admin-mobile scope before implementation |
| M2 | Traceability | Public QR lookup contract | MISSING | Web public QR route uses mock/internal crop IDs | No safe public traceability controller/token contract found | Mobile explicitly blocks fake QR generation | Public API must not expose private export-release snapshot directly | Web `CropQrBuilder`, public `/traceability/[cropId]`; Mobile warning state | BACKEND_CAPABILITY_GAP | Define public opaque QR/token contract first |
| M3 | Admin | System dashboard/stats | MISSING | Web admin dashboard is mixed/mock-backed | Mixed/unclear backend aggregation | Mobile has admin approval/review/moderation, not system stats | No concrete mobile-required evidence; desktop admin dashboard remains separate | Web admin page imports mock dashboard/system farms | DESKTOP_ONLY | Keep out of mobile parity unless product marks mobile-required |

# Web / Backend / Mobile Matrix

| Function | Web | Backend | Mobile | Root Cause |
|---|---|---|---|---|
| Residue create/import | SUPPORTED | SUPPORTED | MISSING | Admin-only mobile scope |
| Lab result completion | PARTIAL | PARTIAL | PARTIAL | Backend result read loop missing |
| AI diagnosis share | SUPPORTED | SUPPORTED | SUPPORTED | E2E only |
| Dashboard quick actions | SUPPORTED | SUPPORTED | PARTIAL | E2E / target maturity |
| Notification push cold-start | SUPPORTED | SUPPORTED | PARTIAL | Push runtime E2E |
| Chat socket realtime | SUPPORTED | SUPPORTED | PARTIAL | Web-Mobile socket E2E |
| Activity approve/reject | SUPPORTED | PARTIAL | SUPPORTED | Backend hardening / E2E |
| Community media auth | SUPPORTED | PARTIAL | PARTIAL | Security E2E |
| Agricultural input create/manage | SUPPORTED | SUPPORTED | MISSING | Admin-only mobile scope |
| Public QR lookup | MOCK | MISSING | MISSING | Backend public contract gap |
| Admin system dashboard/stats | MOCK | PARTIAL | MISSING | Desktop-only / mock-backed |

# Connections → Chat Audit

Web exposes chat opening from connection contexts. Backend supports creating or finding the conversation only when the users have an accepted connection. Mobile now uses the canonical chat route and `chatApi.createConversation` directly from the accepted connection card.

Implementation evidence: `DurianFarmerCommunityScreen.tsx` calls `chatApi.createConversation({ peerUserId })`, then navigates to `/(main)/chat?conversationId=...`.

Classification: `DONE`.

# Care History Audit

Backend `GET /api/v1/cultivation-seasons/{id}/care-history` exists and was verified reachable through the Gateway in the catalog/compliance runtime chain. Mobile now uses this endpoint directly in the Calendar `Nhật ký` tab for the currently selected real Farm -> FarmZone -> CultivationSeason context.

Implementation evidence: `DurianCultivationCalendarScreen.tsx` calls `getCareHistory(selection.seasonId)` and renders activities, executions, and input usages from the backend DTO with loading, empty, error, retry, and success states.

Classification: `DONE`.

# Residue Workflow Audit

Residue read is implemented on Mobile. Residue create/import exists in Backend and Web, but Web gates the advanced residue view with `RESIDUE_STANDARD_MANAGE`, which maps only to `ADMIN`.

Security note: backend create/import endpoints should still be checked for server-side authorization before any admin mobile write UI is exposed.

Classification: `ADMIN_ONLY`.

# Lab Workflow Audit

Backend supports:

- LabSample create/list/detail.
- LabResult create.

No LabResult list/detail endpoint was found. That prevents a complete result review loop on Mobile. Mobile currently reads lab samples in the harvest/export/traceability workspace.

Classification: `BACKEND_CAPABILITY_GAP`.

# Agricultural Input Audit

Web exposes input creation in the advanced cultivation workspace, but the same permission gate as residue management is admin-only. Backend has create/list/detail endpoints. Mobile can list/select inputs for activities but lacks create/manage screens.

Classification: `ADMIN_ONLY`.

# Dashboard Quick Action Audit

Mobile dashboard quick actions currently target:

| Quick Action | Mobile target | Status |
|---|---|---|
| Lịch chăm sóc | `/(main)/calendar` | Implemented; E2E pending |
| Chat AI & kỹ sư | `/(main)/chat` | Implemented; chat E2E pending |
| Cộng đồng | `/(main)/community` | Implemented |
| Kiến thức | `/(main)/knowledge` | Implemented |
| Ủy quyền vườn | `/(main)/authorization` | Implemented |

Classification: `E2E_PENDING`.

# AI Diagnosis Share Audit

Mobile diagnosis result builds a report message, routes to `/(main)/chat?shareText=...`, switches to expert chat, displays a pending report banner, and can send it to an active or newly opened accepted connection conversation.

Classification: `E2E_PENDING`.

# Public QR Audit

Mobile correctly avoids generating fake QR links. Web still has public QR/mock traceability surfaces based on local mock crop data. Backend does not currently expose a safe public lookup controller with opaque QR token/code.

Classification: `BACKEND_CAPABILITY_GAP`.

# Web Mock Cleanup Audit

Remaining Web mock/fallback areas:

| Location | Impact | Classification |
|---|---|---|
| `src/lib/cultivation/mock.ts` | Can hide backend/catalog failures | WEB_MOCK_CLEANUP |
| `src/constants/durianMockData.js` | Feeds QR/public traceability/admin dashboard mocks | WEB_MOCK_CLEANUP |
| `app/traceability/[cropId]/page.tsx` | Public traceability route is mock-backed | WEB_MOCK_CLEANUP |
| `components/traceability/TraceabilityChart.tsx` | Uses mock sensor timeline | WEB_MOCK_CLEANUP |
| `components/dashboard/CropQrBuilder.tsx` | Builds QR from mock/internal IDs | WEB_MOCK_CLEANUP |

These are not counted as Mobile MISSING/PARTIAL unless they correspond to one of the 130 canonical functions above.

# E2E Debt

Implemented or mostly implemented areas needing runtime proof:

| Area | E2E status |
|---|---|
| Farm/Zone/Season mobile device selector walkthrough | PENDING |
| Activity approve/reject with real pending chemical activity | PENDING |
| AI RAG live request | PENDING |
| AI diagnosis multipart upload on real device | PENDING |
| AI diagnosis share to engineer | PENDING |
| Notification inbox deep links | PARTIAL STATIC ONLY |
| Push tap / cold start | PENDING |
| IoT PostgreSQL runtime | PENDING |
| IoT Kafka notification | PENDING |
| Dashboard quick actions | PENDING |
| Chat REST + socket Web/Mobile realtime | PENDING |

# Security Debt

| Concern | Status | Notes |
|---|---|---|
| Community media access | E2E_PENDING | Need private/CONNECTIONS cross-user verification |
| Residue standard write/import authorization | OPEN | Web gates admin-only; backend write/import authorization should be verified/hardened |
| Agricultural input create authorization | OPEN | Backend create endpoint should be protected before mobile admin write UI |
| Notification identity/gateway trust | OPEN | Mobile sends user identity headers; gateway/service should be authoritative |
| Public traceability exposure | BACKEND_CAPABILITY_GAP | Need sanitized public DTO/token contract |
| Lab workflow authorization | BACKEND_CAPABILITY_GAP | Complete result read/detail contract and role rules are not established |
| Activity approve/reject state transitions | OPEN | Backend should enforce pending-only transition semantics |

# MUST_FIX_MOBILE_NOW

No remaining `MUST_FIX_MOBILE_NOW` items after this phase.

# BACKEND_CAPABILITY_GAP

| Item | Required backend decision |
|---|---|
| Lab result list/detail/read workflow | Add coherent result read APIs and role rules |
| Public QR lookup | Add opaque public QR/token lookup contract and sanitized public DTO |

# WEB_MOCK_CLEANUP

| Item | Required cleanup |
|---|---|
| Cultivation mock fallback | Remove or gate as dev-only with visible labeling |
| Public traceability mock route | Replace after public backend contract exists |
| QR mock/internal-ID generation | Disable until safe public contract exists |
| Mock traceability chart timeline | Replace with real telemetry/cultivation data or label dev-only |
| Mock admin dashboard/system farms | Replace or keep desktop demo-only |

# E2E_PENDING

| Item |
|---|
| AI diagnosis share to engineer |
| Dashboard quick actions |
| Notification push tap / cold start |
| Chat socket realtime room auth |
| Activity approve/reject runtime |
| Community media authorization |
| Farm/Zone/Season device UI walkthrough |
| IoT PostgreSQL/Kafka runtime |

# OPTIONAL

| Item | Note |
|---|---|
| Native PDF/Excel/CSV report downloads | No clear user-facing backend report-export endpoint found |
| Offline read cache for knowledge/community | Enhancement only |
| Rich notification target previews | Enhancement only |

# DESKTOP_ONLY

| Item | Note |
|---|---|
| Admin system dashboard/stats | Current Web evidence is mixed/mock-backed and no mobile-required evidence was found |

# ADMIN_ONLY

| Item | Note |
|---|---|
| Residue standard create/import | Web permission is ADMIN-only |
| Agricultural input create/manage | Web advanced input management uses the admin-only residue-management permission gate |

# NOT_MOBILE_REQUIRED

## 2026-09-26 Physical-Device Functional Audit

This section supersedes “MUST_FIX_MOBILE_NOW: No remaining items” for the current Expo Go / physical-iPhone audit. Statuses below are based on source and route evidence; they are not claims of successful live-device execution.

| Feature | Web | Mobile | Status | Evidence / remaining gap |
|---|---|---|---|---|
| AI diagnosis upload | `POST /api/v1/predict` through the server-side Gateway proxy; multipart `image`, `source`, optional `device_id` | Same endpoint and multipart fields via authenticated Axios; React Native file has `uri`, `name`, `type` | PARTIAL → FIXED CONFIG | Mobile was resolving API services inconsistently. API base is now centralized on the Gateway; live iPhone upload still required |
| AI diagnosis history | `GET /api/v1/predict/history`, delete by id | Same routes and pagination parameters | PASS STATIC | Response normalization and history/delete paths match; live auth/device test pending |
| AI assistant | `POST /api/v1/chat/ask` | Same Gateway route via authenticated client | FIXED CONFIG | Local `.env` used stale `/api/v1/chat/ai`; corrected to `/api/v1/chat/ask` |
| Authentication | Web proxy forwards Bearer token and refreshes cookies server-side | SecureStore access/refresh tokens, Bearer header, 401 refresh retry | PASS STATIC | No token is logged; live expiry/refresh test pending |
| Chat REST | Web `/api/chat/conversations/**` | Same `/api/chat/conversations/**` routes | PASS STATIC | Gateway topology matches; live two-user test pending |
| Chat Socket.IO | `/chat` namespace via Socket.IO | `/chat` namespace via shared Gateway base and `/socket.io` path | FIXED CONFIG | Mobile previously defaulted to `localhost:3002`; it now uses the centralized Gateway base |
| Community media | Web uses browser `File` multipart | Mobile uses `{ uri, name, type }` multipart entries | PARTIAL | Upload shape is present, but private/CONNECTIONS media authorization remains live-test debt |
| Knowledge | Real list/category/detail/admin routes | Real routes, pagination, filtering, and unique category tabs | PASS STATIC | Physical network and role walkthrough pending |
| Notifications | In-app API plus Web routing | In-app list/read/deep-link resolver | PARTIAL | Push token/cold-start behavior remains unverified |
| IoT | Web/API-backed monitoring | Mobile API-backed monitoring | PARTIAL | Live telemetry, stale/offline and alert runtime still pending |
| Search | Web API search and filters | Mobile search API and result navigation | PASS STATIC | Live Gateway query/error test pending |
| Traceability | Web includes mock public QR surfaces | Mobile keeps private traceability flow and does not fake public QR | PARTIAL | Public QR remains a backend contract gap by design |
| Profile/avatar | Web authenticated profile and avatar flows | Mobile profile update and avatar flows | PARTIAL | Multipart avatar and physical-device permission test pending |

### AI Diagnosis contract comparison

| Item | Web | Mobile | Result |
|---|---|---|---|
| URL | Gateway proxy → `/api/v1/predict` | Central Gateway base + `/api/v1/predict` | MATCH |
| Method | `POST` | `POST` | MATCH |
| Auth | Server proxy injects Bearer token | Axios interceptor injects Bearer token and refreshes on 401 | MATCH STATIC |
| Multipart image | `image: File` | `image: { uri, name, type }` | RN-compatible |
| Source | `WEB`, `MOBILE`, or `IOT_CAMERA` | `MOBILE` for camera/library; optional IoT source | MATCH |
| Device id | Only for `IOT_CAMERA` as `device_id` | Same | MATCH |
| Content-Type | Browser/runtime boundary | Runtime boundary is left automatic | CORRECT |
| Response | Reads `data`, normalizes snake/camel variants | Reads `data`, normalizes snake/camel variants | MATCH |

### Confirmed configuration gaps fixed in this audit

1. Mobile’s `.env` pointed the generic API base at the AI service port `8000`, while Web and the backend topology use the API Gateway on port `8080`; Auth separately overrode authenticated requests with another base URL.
2. Mobile AI diagnosis inherited the global Axios timeout of 15 seconds even though the Web request and Gateway allow the long-running model request to complete; Mobile now gives diagnosis the same 45-second budget and passes the abort signal through.
3. Mobile AI assistant configuration used `/api/v1/chat/ai`, but the current AI service route is `/api/v1/chat/ask`.
4. Mobile Socket.IO fallback used `http://localhost:3002`, which resolves to the iPhone itself; it now uses the centralized Gateway base.

### Validation boundary

`npm run typecheck` and source inspection are static evidence only. The following still require a live backend and physical iPhone: login, AI multipart prediction, AI history/delete, token refresh, Socket.IO connect/join/update, community media, push cold start, IoT telemetry, and all permission-sensitive flows.

| Item | Note |
|---|---|
| General role assignment UI | No backend endpoint beyond engineer approval was found |
| Web-only public marketing/traceability presentation pieces | Not mobile parity unless product requires mobile public QR surface |

# Recommended Phase Order

| Phase | Scope | Category |
|---:|---|---|
| 1 | Runtime E2E pass for implemented Mobile flows | E2E_PENDING |
| 2 | Backend lab result read/detail and public QR contract decisions | BACKEND_CAPABILITY_GAP |
| 3 | Admin-only mobile scope decision for residue/input management | ADMIN_ONLY |
| 4 | Web mock cleanup before final cross-platform E2E | WEB_MOCK_CLEANUP |

# Raw Completion

Official raw parity remains:

`119 / 130 = 91.5%`

This metric includes every canonical parity function regardless of whether the remaining work is mobile implementation, backend capability, admin-only scope, desktop-only scope, or E2E.

# Actionable Mobile Completion

Actionable Mobile denominator includes only DONE plus current `MUST_FIX_MOBILE_NOW` items:

`119 / (119 + 0) = 100.0%`

Excluded from actionable mobile denominator:

- `BACKEND_CAPABILITY_GAP`
- `WEB_MOCK_CLEANUP`
- `E2E_PENDING`
- `OPTIONAL`
- `DESKTOP_ONLY`
- `ADMIN_ONLY`
- `NOT_MOBILE_REQUIRED`

This does not replace the official raw metric.

# Documentation Changes

This document now records:

- Inventory integrity discrepancy.
- Exact 119 / 8 / 3 / 130 reconciliation.
- Complete 8 PARTIAL rows and 3 MISSING rows.
- Web / Backend / Mobile matrix for every non-DONE canonical function.
- Separate parity gaps from E2E, security, backend, Web mock, admin-only, desktop-only, optional, and not-mobile-required debt.

# Final Recommendation

The two true mobile implementation gaps are closed. Next work should be runtime E2E for implemented Mobile flows before touching backend capability gaps, admin-only data-management screens, or Web mock cleanup.

# 2026-09-27 Current-source Media Parity Reconciliation

This addendum supersedes the prior static claim that merely resolving a relative URL was sufficient for Mobile media. The Web client uses its authenticated `/api/backend/**` proxy for protected responses; a React Native `Image` request does not inherit that proxy's bearer header. This is a behavioral difference, not a UI difference.

## Shared resolver and transport policy

| Concern | Web evidence | Mobile implementation | Status |
|---|---|---|---|
| Relative API media URL | Web proxy rewrites service-relative `/api/**` to `/api/backend/**` | `src/lib/mediaUrl.ts` prefixes only relative paths with `EXPO_PUBLIC_API_BASE_URL` | DONE STATIC |
| Absolute/external URL | Browser keeps S3/CDN URLs unchanged | Resolver preserves `http:`, `https:`, `file:`, `data:`, and `content:` URIs unchanged | DONE STATIC |
| Knowledge image | Web proxy serves `GET /api/knowledge/images/{articleId}` | `knowledgeMedia.ts` delegates to shared resolver; `DurianRemoteImage` renders cover/body media | DONE STATIC |
| Community image | Web proxy sends authenticated request to `GET /api/community/media/{mediaId}` | Community cards use `DurianRemoteImage`, which sends bearer header only for this Gateway path | PARTIAL — live access-control test remains required |
| Prediction-history image | Web proxy requests protected `GET /api/v1/predict/history/images/{historyId}` | Prediction history maps internal `artifacts/prediction-history-images/*` to that public API contract and renders with bearer header | DONE STATIC; physical-iPhone test required |
| Avatar | Auth service writes an absolute S3 URL | Resolver keeps the external URL intact; profile and More screens use `DurianRemoteImage` | DONE STATIC |
| Chat message image | Chat persistence stores a supplied URI/string | Renderer preserves device/data/external URI and safely resolves a future relative URI | PARTIAL — see broken upload contract below |

`DurianRemoteImage` never appends a token to a URL. It waits for the SecureStore token only when the resolved Gateway route is known to require it, then uses the native image request header. Development-only image-load diagnostics include the resolved URL and native error, never the token.

## Contract evidence

| Module/function | Web route/component/API | Mobile route/component/API | Data/action/media/permission evidence | Status / gap |
|---|---|---|---|---|
| Knowledge article cover and inline content | Knowledge client → `/api/backend/knowledge/**`; article image endpoint is public | Knowledge API → `/api/knowledge/**`; `DurianKnowledgeBaseScreen`, `DurianKnowledgeDetailScreen`, `KnowledgeContentRenderer` | Backend returns a real resource MIME type for `/api/knowledge/images/{id}`; no bearer header required by Gateway | DONE STATIC |
| Community post attachment | Community client/browser proxy → `/api/backend/community/media/{id}` | `communityApi` → `CommunityPostCard` → `DurianRemoteImage` | Backend provides `contentType`; Gateway does not declare this path public, so the native image request must supply Authorization | PARTIAL / E2E_REQUIRED; verify same user succeeds and unauthorized/cross-user policy is correct |
| Diagnosis result/history image | AI client/browser proxy → `/api/backend/v1/predict/history/images/{id}` | `diseasePredictionApi` → `DiagnosisHistoryScreen` / `DiagnosisResultScreen` | AI service authorizes by Gateway-injected user id and returns `FileResponse`; Mobile no longer points at an internal `artifacts/...` path | DONE STATIC / DEVICE_REQUIRED |
| Profile avatar | Absolute S3 `avatarUrl` returned by auth profile/upload API | Profile, Avatar Management, More | S3 URL is external and requires neither API-base prefix nor Gateway bearer header | DONE STATIC |
| Expert chat media upload | No corresponding current backend route was found | `uploadExpertGardenPhoto` declares `/api/v1/chat/expert/media` | No controller/router exposes that POST and no Mobile call site invokes the helper | BROKEN CONTRACT; do not expose or call this flow until backend contract exists |

## Current status counts and open work

The canonical 130-function denominator remains `119 DONE / 8 PARTIAL / 3 MISSING`; this media transport correction adds no product function and therefore does not silently change that denominator. It does change the evidence for the existing Community-media partial: URL resolution plus native authenticated rendering are now implemented, while authorization still needs a live test.

| Status | Count in this media reconciliation | Items |
|---|---:|---|
| DONE STATIC | 4 | Shared resolver, Knowledge media, diagnosis-history media mapping, external avatars |
| PARTIAL | 2 | Community authorization E2E, chat message media transport pending a real upload contract |
| BROKEN CONTRACT | 1 | Orphan `EXPO_PUBLIC_EXPERT_MEDIA_PATH` upload helper has no backend endpoint and no caller |
| DEVICE REQUIRED | 2 | Community attachment render and diagnosis-history image render on a signed-in physical iPhone |

## Required physical-iPhone evidence before closure

1. Sign in with a user who owns a diagnosis-history entry; open history and detail; verify the thumbnail and full image load from `GET /api/v1/predict/history/images/{id}`.
2. Open a Community post with an image; verify the image loads while authenticated. Then repeat with a user that should not have access, according to the product's `PUBLIC`/`CONNECTIONS` policy.
3. Inspect Gateway/AI/Auth logs for HTTP status and real `Content-Type` (`image/jpeg`, `image/png`, or appropriate video type). A TypeScript build cannot prove these responses on the device.

# 2026-09-27 Primary-navigation source re-audit and implementation

The following rows were rechecked against the current Web component, Mobile component, and actual backend controllers. A Web mock/fallback is not treated as a Mobile requirement when the backend has no matching contract.

| Primary feature | Web route/component/API | Mobile route/component/API | Current field/action evidence | Status |
|---|---|---|---|---|
| Tổng quan | `/dashboard/client`, `StatCards`, feature cards; dashboard counts are from `durianMockData`, while its IoT snapshot calls `GET /api/iot/devices` | `/(main)` → `DurianOperationsScreen`; farms, authorized farms, plans, activities, diagnosis history, notifications, chat and IoT device APIs | Mobile displays live farm/zone context, open/overdue work, active plans, diagnosis, notification, chat and telemetry summaries, refresh and navigation shortcuts. It intentionally does not copy Web's mock stat cards. | DONE STATIC; physical/API E2E remains required |
| Khu canh tác — Farm | Web zone UI now reads the same `GET /api/v1/farms` contract as Mobile | `/(main)/farm` → `DurianFarmCatalogScreen` → `GET/POST/PATCH/DELETE /api/v1/farms/{id}` | Name, address, province, district, area, coordinates, status, updated date; create/edit/archive gated to FARMER; loading/error/retry/empty states. | CODE VERIFIED; physical cross-platform test required |
| Khu canh tác — Zone | Web zone UI now uses persisted `Farm.zones` and no `cultivationMockClient` fallback | Same Farm screen → `POST/PATCH/DELETE /api/v1/farms/{farmId}/zones/{zoneId}` | Name, code, area, description, status; create/edit/archive with confirmation; owner-only actions; compact farm detail. Tree/variety/planting data are explicitly unavailable because the real DTO has no fields for them. | CODE VERIFIED; physical cross-platform test required |
| Khu canh tác — Season | Web cultivation workspace creates and lists seasons from the cultivation contract | Same Farm screen → `GET/POST /api/v1/cultivation-seasons` | Shows season name, crop, variety, start/end date for selected Farm → Zone; create action originates from the selected Zone. | PARTIAL — backend has no update/delete Season controller |
| Lịch chăm sóc | Web `CultivationCalendarWorkspace` supports plan/activity create, activity update, status transitions, approval/rejection, search/filter and care history | `/(main)/calendar` → `DurianCultivationCalendarScreen` uses identical cultivation endpoints | Farm/Zone/Season selection, week/calendar/today/task/history modes, create plan/activity, edit activity, start/complete/skip/cancel, approve/reject, search/status filters, care history, loading/error/empty states. | DONE STATIC; state-transition E2E remains open |
| Phân tích AI | `DiseaseDiagnosisWorkspace` presents source/device, full recommendations, decision support, references, history/search/filter/pagination/delete/share | `/(main)/scanner`, `/diagnosis-history`, `/diagnosis-result` | Camera/library, preview/retry, confidence/severity, history/detail/delete/share are present. Result now also renders favorable conditions, export considerations, biological/organic/chemical plans, export readiness, references, source, IoT device, crop-detection state and top predictions. | DONE STATIC; live device prediction/history test required |

## Primary form and contract comparison

| Form | Web requirement / backend truth | Mobile current fields | Status |
|---|---|---|---|
| Farm | Backend `CreateFarmRequest` / `UpdateFarmRequest`: name, address, province, district, latitude, longitude, areaHectares, status on update | Same fields; `name` validated; numeric input uses non-negative values; status appears only for edit as backend requires | DONE STATIC |
| Zone | Backend `CreateFarmZoneRequest` / `UpdateFarmZoneRequest`: name, code, areaSquareMeters, boundaryGeoJson, description, status on update | Same user-editable scalar fields. `boundaryGeoJson` is not collected because neither Web canonical catalog flow nor a mobile map/editor provides a real geometry source. | PARTIAL — geometry editor is a product/UX decision, not fabricated input |
| Season | Backend create: name, startDate, endDate, crop, variety, farmId, plotId, createdBy | Same fields; Farm/Zone and current user are supplied from the selected authenticated context | DONE for existing create contract |
| Activity | Backend provides create, patch, start, complete, skip, cancel, approve/reject | Same form/action set, including agricultural input selection for chemical treatment | DONE STATIC |

## Reconciled non-DONE and broken-contract inventory

| ID | Status | Exact gap | Web evidence | Mobile evidence | Backend reality / next required fix |
|---|---|---|---|---|---|
| P1 | PARTIAL | Residue-standard create/import | Advanced Web admin surface | Mobile is read-only | Existing write/import API; decide/admin-harden scope before exposing mobile write UI |
| P2 | PARTIAL | Lab result read/detail loop | Web has more advanced lab workflow | Mobile reads samples only | Result create exists but coherent list/detail read contract is absent |
| P3 | PARTIAL | AI report share E2E | Web has engineer selector/send | Mobile builds report and opens chat | Run accepted-engineer physical/runtime flow |
| P4 | PARTIAL | Dashboard action/device E2E | Web links to features | Mobile links to real sources | Exercise all role shortcuts and per-source error responses on a device |
| P5 | PARTIAL | Notification push/cold-start routing | Web is in-app only | Mobile in-app routing exists | Push response handler/cold start needs real runtime proof |
| P6 | PARTIAL | Chat socket realtime | Web uses Socket.IO | Mobile realtime hook exists | Run Web/Mobile two-user room/auth/update E2E |
| P7 | PARTIAL | Activity approval transition hardening | Web invokes approval actions | Mobile invokes matching actions | Backend transition rules and pending-chemical runtime test still required |
| P8 | PARTIAL | Community media authorization | Web proxy carries bearer token | Mobile now uses authenticated native image requests | Test owner/connection/unauthorized access without weakening Gateway security |
| P9 | PARTIAL | Farm-zone boundary GeoJSON editing | Web rich zone UI is mock-backed | Mobile shows canonical real fields only | Backend supports optional geometry, but no canonical map/geometry editor exists in either proven real flow |
| P10 | PARTIAL | Season edit/delete | Web workspace only exposes create under real contract | Mobile displays/create only | No backend `PATCH`/`DELETE` Season endpoint; backend contract required. This restates the primary Season row and is excluded from the unique-row count below. |
| M1 | MISSING | Admin agricultural-input create/manage | Web advanced/admin-gated workflow | Mobile only lists/selects inputs | Existing API but authorization/scope decision required |
| M2 | MISSING | Public QR lookup | Web public route is mock/internal-ID based | Mobile correctly avoids fake QR | Safe public opaque-token/read DTO backend contract required |
| M3 | MISSING | Admin system statistics | Web is mixed/mock-backed | Mobile has approval/moderation only | Real aggregation contract and mobile requirement are not established |
| B1 | BROKEN | Expert chat image upload helper | No current Web/backend endpoint was found | `uploadExpertGardenPhoto` names `/api/v1/chat/expert/media`, with no active caller | Do not expose/call it until backend defines a secured upload/download contract |

## Count boundary

The prior canonical 130-function inventory remains `DONE 119`, `PARTIAL 8`, `MISSING 3`, `TOTAL 130`; it was not individually enumerable and therefore should not be presented as a freshly recomputed project-wide percentage. This re-audit adds two concrete primary partial rows (P9/P10) and one dead-code contract row (B1) outside that historical denominator.

For the re-audited primary/contract subset above: `DONE 5`, `PARTIAL 10`, `MISSING 3`, `BROKEN 1`, `TOTAL 19`.

The next honest total must be produced only after every historical DONE row is expanded into an individual verified matrix row; no aggregate percentage should conceal that remaining audit work.
