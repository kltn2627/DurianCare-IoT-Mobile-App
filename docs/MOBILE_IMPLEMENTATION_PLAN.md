# DurianCare Mobile Remaining Implementation Plan

Last updated: 2026-09-22

This plan contains remaining work only. Completed historical phases are represented by the current codebase and the parity audit.

Latest reconciliation: FINAL MOBILE PARITY GAP RECONCILIATION AUDIT on 2026-09-22.

Official raw parity is now `119 / 130 = 91.5%`.

Actionable Mobile parity is now `119 / (119 + 0) = 100.0%` because the two remaining immediate Mobile implementation items were closed:

- Done: Connections -> Chat card wiring.
- Done: Care history direct Mobile surface.

## Current Baseline

Mobile now has real API coverage for:

- auth/session;
- profile/avatar;
- user connections;
- farm authorization/delegation;
- core care calendar;
- AI diagnosis/history;
- AI assistant/RAG ask;
- knowledge;
- community;
- chat and socket updates;
- dashboard real-data aggregation;
- notifications;
- search;
- IoT device/telemetry/connectivity/alerts.

The remaining work now splits into clear categories:

- MUST_FIX_MOBILE_NOW: none remaining.
- E2E_PENDING: AI diagnosis share, dashboard quick actions, chat socket realtime, notification push/cold-start, activity approval runtime, community media authorization, IoT runtime.
- BACKEND_CAPABILITY_GAP: public QR contract; lab result read/detail workflow.
- ADMIN_ONLY: residue create/import and agricultural input create/manage need admin-mobile scope decision before implementation.
- WEB_MOCK_CLEANUP: Web cultivation/public traceability/QR/admin mock fallbacks must be cleaned or gated before final cross-platform E2E.

## Phase A - Harvest / Export / Traceability Mobile Parity

Priority: P1

Status: implemented for private backend-supported APIs; public QR remains backend capability gap.

Goal: replace hardcoded mobile traceability seasons and QR flow with real cultivation export-release data.

Scope:

- Done: list and create harvest batches from `/api/v1/harvest-batches`.
- Done: list and create export releases from `/api/v1/export-releases`.
- Done: submit, approve, release, and recall through backend workflow endpoints.
- Done: load private traceability snapshot from `/api/v1/export-releases/{id}/traceability`.
- Done: removed hardcoded season/crop IDs and fake QR from Mobile.
- Deferred: public QR/link generation. `duriancare-traceability-service` still has no concrete public lookup controller/token contract.
- Deferred: Web public traceability mock cleanup, because this phase was constrained to Mobile-only changes.

Verification:

- Mobile `npm run typecheck`: pass.
- Web `npm run typecheck` if shared contract changes.
- Backend targeted cultivation tests if backend changes.
- Runtime E2E with at least one harvest batch and export release.

## Phase B - Public QR Contract and Web Mock Cleanup

Priority: P1 backend/Web decision

Status after final reconciliation: not a Mobile implementation task until a safe backend public QR contract exists.

Goal: establish a real public traceability contract before QR is re-enabled.

Scope:

- Decide whether public lookup belongs to cultivation-service export snapshots or traceability-service.
- Add an opaque public code/token contract if public QR is required.
- Ensure public DTO is sanitized and does not expose private user IDs, internal notes, authorization records, audit data, or private lab attachments.
- Replace or visibly disable Web public traceability mock fallback after real contract exists.

## Phase C - Notification and Navigation Deep Links

Priority: P2

Status: implemented for in-app Mobile metadata routing; push/cold-start remains E2E pending because the app has no push notification runtime registered.

Goal: make notification/internal navigation land on the real target resource.

Targets:

- Done: chat conversation when `conversationId` metadata is present.
- Done: community post when `postId` metadata is present.
- Done: knowledge article or review target when `slug`/review metadata or known backend `targetUrl` is present.
- Done: farm authorization route for authorization/invitation metadata.
- Done: cultivation calendar/activity route for activity/plan metadata.
- Done: IoT sensor route for device, alert, and weather metadata.
- Done: diagnosis result/history target for diagnosis metadata or DISEASE notification type.
- Done: export release or traceability workspace route for harvest/export metadata after Phase A.
- Pending: push tap/cold-start routing, because Mobile currently has no `expo-notifications`/FCM response handler.

Rules:

- Done: create one metadata-to-route mapper.
- Done: mark notifications read consistently from inbox/detail before route open.
- Done: fall back to notification detail when target metadata is missing or unsupported.
- Done: no title/body parsing; only structured metadata and known backend target URLs are used.

## Phase D - Compliance / Lab / Residue / Chemical History

Priority: P2

Status: implemented for Mobile real read/assessment path; final reconciliation separates the remaining gaps:

- Care history direct Mobile surface is done in the Calendar `Nhật ký` tab using the backend `care-history` endpoint.
- Lab result completion is `BACKEND_CAPABILITY_GAP` because no result list/detail endpoint was found.
- Residue create/import is `ADMIN_ONLY`; do not add farmer UI.
- Agricultural input create/manage is `ADMIN_ONLY`; Mobile currently supports list/select only.

Goal: expose backend-supported compliance workflows that Web already surfaces.

Scope:

- Done: direct care-history screen/surface using the existing backend endpoint.
- Done: chemical history by season from `/api/v1/cultivation-seasons/{id}/chemical-history`.
- Done: safe harvest date from `/api/v1/cultivation-seasons/{id}/safe-harvest-date`.
- Done: compliance assessment POST from `/api/v1/cultivation-seasons/{id}/compliance-assessments`.
- Done: residue standards read path from `/api/v1/residue-standards`.
- Done: lab sample read path from `/api/v1/lab-samples`.
- Partial: lab result workflow. Backend has `POST /api/v1/lab-results`, but no list-results-by-sample endpoint was found for a complete Mobile result detail loop.
- Admin-only: residue standards create/import and agricultural input management beyond selection remain admin-heavy scope decisions.

Product decision:

- Confirm which admin/desktop-heavy data-entry functions are mobile-required.

## Phase E - Activity Approval Workflow

Priority: P2

Status: implemented on Mobile against real backend approve/reject endpoints; backend transition hardening remains recommended.

Goal: add mobile approve/reject flow for activities where backend requires approval.

Scope:

- Done: typed `approveCultivationActivity` and `rejectCultivationActivity` API helpers.
- Done: pending-approval card/detail actions, gated to `approvalRequired && PENDING_APPROVAL`.
- Done: reject activity with cross-platform reason modal.
- Done: refresh calendar/list after successful approve/reject.
- Done: role/permission-aware visibility uses existing Mobile execution permission gate.
- Backend follow-up: approve/reject endpoints currently rely on update permission and `approvalRequired`, but do not enforce pending-only transitions server-side.

Verification:

- Mobile `npm run typecheck`: pass.
- Runtime E2E with one pending chemical activity remains pending.

## Phase F - Farm / Zone / Season Catalog Contract

Priority: P1 backend capability decision

Status: fixed for backend Gateway E2E and Mobile implementation; device UI E2E remains pending.

Completed scope:

- Done: backend owner Farm catalog through `/api/v1/farms/**`.
- Done: backend FarmZone catalog through `/api/v1/farms/{farmId}/zones/**`.
- Done: backend CultivationSeason catalog through `/api/v1/cultivation-seasons/**`.
- Done: owner semantics remain separate from FarmAuthorization; Farmer owner access does not require self-authorization.
- Done: Mobile canonical context is `ownedFarms -> zones -> seasons`.
- Done: first-time bootstrap can create Farm, FarmZone, and CultivationSeason.
- Done: Calendar, Harvest/Compliance, IoT catalog context, Farm Authorization, and Dashboard use the canonical catalog source.
- Done: Gateway E2E on 2026-09-22 proved clean Farmer registration/login, empty farm state, Farm create/re-read, FarmZone create/re-read, CultivationSeason create/re-read, new-session persistence, cross-farm 403 denial, and calendar/harvest/compliance read-context compatibility.

Remaining verification:

- Pending: physical/emulator Mobile UI selector walkthrough.
- Pending: Web mock fallback cleanup remains separate Phase H work and was not part of this catalog closure.

## Phase G - AI Assistant / RAG Route Alignment

Priority: P2

Status: implemented for Mobile.

Goal: align Mobile AI assistant with actual backend RAG route.

Completed scope:

- Backend AI service exposes `POST /api/v1/chat/ask`.
- Mobile assistant now sends authenticated JSON through the shared auth client.
- Mobile no longer routes RAG assistant questions through the image-analysis/photo flow.
- Mobile renders backend `sources` as RAG source context.
- Message history remains screen-session local; no backend conversation persistence exists for this RAG endpoint.

## Phase H - Web Mock Fallback Cleanup for Final E2E

Priority: P1 for verification quality

Goal: avoid false parity confidence from Web local mocks.

Scope:

- `src/lib/cultivation/mock.ts`.
- Web crop/QR/public traceability mock data from `src/constants/durianMockData.js`.
- Mock traceability chart timeline.

Decision:

- Either remove fallback or gate it behind explicit dev-only mode with visible labeling.

## Phase I - Runtime E2E Closure

Priority: P1/P2 depending module

Run matrix:

- Auth login -> refresh -> profile -> logout.
- Profile edit/avatar mobile -> Web sees update.
- Farm authorization invite -> accept -> revoke.
- Care plan/activity create -> Web calendar reflects it.
- AI predict -> history -> share to chat.
- Community create/comment/react/report/delete -> Web reflects it.
- Knowledge create/edit/cover -> admin approve -> public mobile.
- Chat REST + socket Web/Mobile realtime.
- Notification event -> inbox -> deep link.
- IoT device/telemetry/alert/ack.
- Harvest/export/traceability after Phase A.
- Farm/Zone/Season device UI bootstrap and selector walkthrough after Phase F Gateway E2E.

## Phase J - Immediate Mobile Parity Fixes

Priority: P1/P2

Status: done.

Scope:

- Done: Connections -> Chat card wiring from the Mobile community/connection card into the existing chat conversation creation route.
- Done: Direct Care History Mobile surface using `GET /api/v1/cultivation-seasons/{id}/care-history`.

Out of scope:

- Public QR until backend contract exists.
- Lab result completion until result read/detail backend endpoints exist.
- Residue/input admin data-management until admin-mobile scope is confirmed.
- Web mock cleanup unless the phase explicitly allows Web changes.

## Do Not Start Yet

- Secure IoT pairing.
- OTA.
- Per-device IoT thresholds.
- New sensors.
- General role-management UI.
- Native PDF/Excel/CSV exports unless product confirms requirement.
