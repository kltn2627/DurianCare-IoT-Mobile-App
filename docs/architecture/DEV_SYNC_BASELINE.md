# Dev Sync Baseline — Mobile App

**Branch:** `duy/cleanup-fixes`  
**Merged from:** `origin/dev`  
**Merge commit:** `8ca575f`  
**TypeScript fix commit:** `aceb7d1`  
**Date:** 2026-09-30

---

## PHASE 0–7 Summary

### Merge scope

8 files had conflicts between `duy/cleanup-fixes` (our work) and `origin/dev` (team dev branch).

| File | Resolution strategy |
|------|---------------------|
| `app/(main)/_layout.tsx` | Union of both sides' screen registrations; dev's icon imports |
| `src/features/chat/hybridChatApi.ts` | Dev's `authorizedRequest` implementation |
| `src/features/community/DurianFarmerCommunityScreen.tsx` | Dev's full version (connections, tabs, chat) |
| `src/features/cultivation/DurianCultivationCalendarScreen.tsx` | Dev's full version (season/activity management) |
| `src/features/knowledge/DurianKnowledgeBaseScreen.tsx` | Dev's full version (real API, pagination, categories) |
| `src/features/knowledge/DurianKnowledgeDetailScreen.tsx` | Dev's full version (real API, share, related articles) |
| `src/features/more/DurianMoreScreen.tsx` | Dev's version (new nav items, icon set) |
| `src/features/scanner/DurianScannerScreen.tsx` | Our tree-save logic + dev's text changes |

### Our features preserved across merge

- `saveDiagnosis` call in `DurianScannerScreen` after AI diagnosis
- `treeId` / `treeCode` URL params passed through scanner flow
- Enhanced `useDurianLiveTelemetry` hook (reconnect, sensor filtering)
- Camera IP management architecture (no hard-coded IP)

### TypeScript validation (PHASE 4)

`npx tsc --noEmit` after merge: 5 errors. All resolved:

| File | Error | Fix |
|------|-------|-----|
| `diseasePredictionApi.ts` | Missing `category` field in fallback return | Added `category: "DISEASE"` |
| `TreeDetailScreen.tsx` | Wrong arg type for `predictDurianDisease` | Changed `AbortSignal` → `PredictionRequestOptions` |
| `useDurianLiveTelemetry.ts` | Old field names + non-existent mock import | Rewrote hook using `IotTelemetryReading` fields |

**Remaining errors (pre-existing, not fixable without package changes):**

| File | Error | Root cause |
|------|-------|-----------|
| `app/(main)/_layout.tsx(2,40)` | Cannot find `expo-router/build/react-navigation/bottom-tabs` | Package version type declaration missing |
| `src/features/chat/useChatRealtime.ts(2,33)` | Cannot find `socket.io-client` | Package not installed |

### API contract verification (PHASE 5)

All mobile API paths verified against gateway route table:

| Mobile path prefix | Gateway → Service |
|-------------------|-------------------|
| `/api/v1/agricultural-inputs/**` | cultivation-service |
| `/api/v1/agronomists/**` | farm-service |
| `/api/v1/camera/**` | iot-service |
| `/api/v1/chat/**` | ai-service |
| `/api/v1/cultivation-activities/**` | cultivation-service |
| `/api/v1/cultivation-plans/**` | cultivation-service |
| `/api/v1/cultivation-seasons/**` | cultivation-service |
| `/api/v1/export-assessment/**` | iot-service |
| `/api/v1/export-releases/**` | cultivation-service |
| `/api/v1/farm-authorizations/**` | farm-service |
| `/api/v1/farms/**` | farm-service |
| `/api/v1/harvest-batches/**` | cultivation-service |
| `/api/v1/lab-samples/**` | cultivation-service |
| `/api/v1/me/**` | farm-service |
| `/api/v1/notification/**` | notification-service |
| `/api/v1/predict/**` | ai-service |
| `/api/v1/residue-standards/**` | cultivation-service |
| `/api/v1/sensors/**` | iot-service |
| `/api/community/**` | auth-service |
| `/api/connections/**` | auth-service |
| `/api/knowledge/**` | auth-service |
| `/api/trees/**` | farm-service |
| `/api/zones/**` | farm-service |

**Result: No contract mismatches.**

---

## Git status (PHASE 7)

Working tree is clean. No uncommitted changes. Branch is 6 commits ahead of `origin/duy/cleanup-fixes`.

Branch has NOT been pushed. Push requires explicit user instruction.

---

## Known gaps (not blocking baseline)

1. `socket.io-client` not installed → `useChatRealtime.ts` cannot compile; real-time chat will not work until package is added.
2. `expo-router` type declaration gap → tab layout type errors; runtime behavior is unaffected.
3. `useDurianLiveTelemetry` is not imported anywhere — hook exists but is dead code until a screen uses it.
