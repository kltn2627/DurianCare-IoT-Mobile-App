# Tree Map Feature — Test Report

## Phase 3: Backend

All backend files were created in `duriancare-farm-service`:

| File | Status |
|------|--------|
| `domain/DurianTree.java` | ✅ Modified — added `nickname`, `variety`, `positionX`, `positionY` |
| `domain/TreeDiagnosisRecord.java` | ✅ New — `@Document("tree_diagnosis_records")` |
| `repository/DurianTreeRepository.java` | ✅ Modified — added zone/status count queries |
| `repository/TreeDiagnosisRecordRepository.java` | ✅ New |
| `repository/FarmRepository.java` | ✅ Modified — added `findByZoneId` with `@Query` |
| `controller/FarmController.java` | ✅ New — `GET /api/farms`, `GET /api/farms/{farmId}`, `GET /api/farms/{farmId}/zones` |
| `controller/TreeController.java` | ✅ New — zone + tree + diagnosis endpoints |
| `service/TreeService.java` | ✅ New |
| `service/TreeDiagnosisService.java` | ✅ New — health status inference, `inferHealthStatus()` |
| All DTOs (`FarmSummaryResponse`, `ZoneSummaryResponse`, `ZoneDetailResponse`, `TreeSummaryResponse`, `TreeDetailResponse`, `CreateTreeRequest`, `UpdateTreeRequest`, `SaveTreeDiagnosisRequest`, `TreeDiagnosisResponse`, `ZoneSafetySummaryResponse`) | ✅ New |

## Phase 4: Web Frontend

All new files created in `duriancare-farm-service` web client:

| File | Status |
|------|--------|
| `src/lib/trees/types.ts` | ✅ New — all TypeScript types |
| `src/lib/trees/client.ts` | ✅ New — `treeClient` with all API methods |
| `src/components/trees/TreeMapCanvas.tsx` | ✅ New — SVG tree map |
| `src/components/trees/ZoneSafetySummary.tsx` | ✅ New |
| `src/components/trees/TreeDetailPanel.tsx` | ✅ New — slide-in aside panel |
| `src/components/trees/ZoneTreesWorkspace.tsx` | ✅ New |
| `src/components/trees/FarmsWorkspace.tsx` | ✅ New |
| `src/app/dashboard/client/farms/page.tsx` | ✅ New |
| `src/app/dashboard/client/farms/[farmId]/zones/[zoneId]/page.tsx` | ✅ New |
| `src/components/dashboard/DashboardShell.tsx` | ✅ Modified — added "Bản đồ cây" nav item |

## Phase 5: Mobile App

All new files created:

| File | Status |
|------|--------|
| `src/features/trees/treeTypes.ts` | ✅ New |
| `src/features/trees/treeApi.ts` | ✅ New |
| `src/features/trees/FarmsScreen.tsx` | ✅ New |
| `src/features/trees/ZoneTreesScreen.tsx` | ✅ New — SVG tree map via `react-native-svg` |
| `src/features/trees/TreeDetailScreen.tsx` | ✅ New — all `durianTheme.colors` keys correct |
| `app/(main)/farms/_layout.tsx` | ✅ New |
| `app/(main)/farms/index.tsx` | ✅ New |
| `app/(main)/farms/[farmId]/zones/[zoneId].tsx` | ✅ New |
| `app/(main)/trees/_layout.tsx` | ✅ New |
| `app/(main)/trees/[treeId].tsx` | ✅ New |
| `src/features/more/DurianMoreScreen.tsx` | ✅ Modified — added "Bản đồ cây" menu item |

### Cultivation Calendar API Wiring

| File | Status |
|------|--------|
| `src/features/cultivation/api/cultivationTypes.ts` | ✅ Modified — added `CultivationSchedule`, `ScheduleTaskType`, `ScheduleTaskStatus`, `CreateCultivationScheduleRequest` |
| `src/features/cultivation/api/cultivationApi.ts` | ✅ Modified — added `listCultivationSchedules`, `createCultivationSchedule`, `updateCultivationScheduleStatus` |
| `src/features/cultivation/DurianCultivationCalendarScreen.tsx` | ✅ Modified — wired to `GET /api/cultivation-schedules`, `POST /api/cultivation-schedules`, `PATCH /api/cultivation-schedules/{id}/status` |

## Phase 6: TypeScript Validation

```
npx tsc --noEmit  → 0 errors (mobile)
```

- All `durianTheme.colors` property keys corrected across all new tree screens
- `React.Fragment` import fixed in `ZoneTreesScreen.tsx`
- `DurianScreenHeader` required props (`eyebrow`, `icon`, `subtitle`, `title`) satisfied in all screens
- Conflicting `farms.tsx` / `farms/` route conflict resolved (deleted `farms.tsx`)

## API Endpoints Summary

### Farm Service (Gateway port 8080 → farm-service port 8082)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/farms` | List farms for authenticated user |
| GET | `/api/farms/{farmId}` | Farm detail |
| GET | `/api/farms/{farmId}/zones` | List zones with tree counts |
| GET | `/api/zones/{zoneId}` | Zone detail |
| GET | `/api/zones/{zoneId}/trees` | Trees for map (all positioned) |
| POST | `/api/zones/{zoneId}/trees` | Create tree |
| GET | `/api/zones/{zoneId}/safety-summary` | Zone safety stats |
| GET | `/api/trees/{treeId}` | Tree detail |
| PUT | `/api/trees/{treeId}` | Update tree |
| GET | `/api/trees/{treeId}/diagnoses` | Paginated diagnosis history |
| POST | `/api/trees/{treeId}/diagnoses` | Save diagnosis result |
| GET | `/api/trees/{treeId}/diagnoses/latest` | Latest diagnosis |

### Cultivation Service (via `/api/cultivation-schedules`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cultivation-schedules` | List schedules (filterable by zoneId, type, status) |
| POST | `/api/cultivation-schedules` | Create schedule |
| PATCH | `/api/cultivation-schedules/{id}/status` | Update status |
| DELETE | `/api/cultivation-schedules/{id}` | Delete schedule |
