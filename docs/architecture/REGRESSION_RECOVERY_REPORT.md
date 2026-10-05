# Regression Recovery Report — DurianCare

*Date: 2026-09-30 | Branch: duy/cleanup-fixes*

---

## Executive Summary

Multiple system regressions were introduced by Docker containers running **outdated code images** — the containers were built 2–8 weeks before the latest commits. The primary symptoms:
- Khu canh tác (farm zones) → 404
- Lịch chăm sóc (care schedule zones) → blank
- Cultivation Calendar zones → empty dropdown
- Knowledge Base public articles → 401
- `HarvestBatchStatus.PENDING_INSPECTION` enum deserialization crash

---

## Root Causes (Confirmed)

### RC-01: Docker Containers Running Stale Code (CRITICAL)

**Who broke it:** Container images were not rebuilt after multiple commits.

**How we found it:** `GET /api/v1/farms` returned 404 (not 401). Testing showed `/api/v1/agronomists` (older predicate) returned 401 correctly. Inspecting the old gateway config via `git show` confirmed `/api/v1/farms` was added to the gateway predicates AFTER the container was built.

**Evidence:**
```
duriancare-gateway        created 2026-09-15  (code last changed 2026-09-30)
duriancare-farm-service   created 2026-09-16  (FarmCatalogController added 2026-09-29)
duriancare-cultivation-service  created 2026-08-06  (55 days stale!)
```

**Fix:** Rebuild all 3 stale services:
```bash
cd DurianCare-IoT-Backend
docker compose -f infrastructure/docker-compose.yml build \
  duriancare-gateway duriancare-farm-service duriancare-cultivation-service duriancare-auth-service
docker compose -f infrastructure/docker-compose.yml up -d \
  duriancare-gateway duriancare-farm-service duriancare-cultivation-service duriancare-auth-service
```

**Status:** BUILD IN PROGRESS

---

### RC-02: MongoDB Harvest Batch — Invalid Enum Value (CRITICAL)

**How we found it:** Error log: `No enum constant com.duriancare.cultivation.domain.HarvestBatchStatus.PENDING_INSPECTION`

**Root cause:** Migration script (`seed-cultivation.js`) inserted document `demo-harvest-batch-2026-001` with `status: "PENDING_INSPECTION"`. The Java enum `HarvestBatchStatus` only defines: `DRAFT, BLOCKED, APPROVED, HARVESTED, CANCELLED`.

**Database:** `duriancare_cultivation.harvest_batches`

**Fix (MUST RUN MANUALLY — auto-mode blocked):**
```bash
mongosh --username duriancare --password duriancare_dev \
  --authenticationDatabase admin --port 27018 --eval \
  'use duriancare_cultivation; db.harvest_batches.updateOne({_id:"demo-harvest-batch-2026-001"}, {$set:{status:"APPROVED"}})'
```

**Status:** PENDING USER ACTION

---

### RC-03: AI Service Embedding Model Failure (Pre-existing, non-blocking)

**Symptom:** Knowledge Base AI chat (RAG) returns 504.

**Error:** `cannot import name 'Dataset' from 'datasets'`

**Scope:** Only affects `/api/v1/rag/**` (AI chat). Does NOT affect `/api/v1/predict` (disease detection — working correctly).

**Fix:** Update `datasets` Python package in ai-service:
```bash
docker exec duriancare-ai-service pip install --upgrade datasets
```
Or update `duriancare-ai-service/requirements.txt` and rebuild.

**Status:** DEFERRED — not blocking core features

---

## Recovery Steps

### Step 1: Fix MongoDB (User Action Required)
```bash
mongosh --username duriancare --password duriancare_dev \
  --authenticationDatabase admin --port 27018 --eval \
  'use duriancare_cultivation; db.harvest_batches.updateOne({_id:"demo-harvest-batch-2026-001"}, {$set:{status:"APPROVED"}})'
```

### Step 2: Rebuild Stale Containers (Running)
```bash
cd DurianCare-IoT-Backend
docker compose -f infrastructure/docker-compose.yml build \
  duriancare-gateway duriancare-farm-service duriancare-cultivation-service duriancare-auth-service
docker compose -f infrastructure/docker-compose.yml up -d \
  duriancare-gateway duriancare-farm-service duriancare-cultivation-service duriancare-auth-service
```

### Step 3: Verify After Restart

After containers restart, verify these no longer return 404:
```bash
# Should return 401 (service UP, auth required):
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/v1/farms
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/v1/cultivation-zones
# Should return 200 (public GET):
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/knowledge/articles
```

### Step 4: Full Runtime Verification
See [REAL_RUNTIME_VERIFICATION.md](../demo/REAL_RUNTIME_VERIFICATION.md)

---

## What Was NOT Changed

The following constraints were strictly respected:
- No MongoDB reset, reseed, or `docker compose down -v`
- No hard-coded farm/zone/tree IDs in frontend
- No MockData added or restored
- No demo routes, demo mode, or demo UI created
- No `minhdii1510@gmail.com` hard-coded anywhere
- No authentication bypasses
- No fake data or try/catch hiding real errors

---

## Code Changes Summary (This Session)

| File | Change | Status |
|------|--------|--------|
| `src/lib/cultivation/client.ts` (Web) | Added `listCultivationSchedules`, `createCultivationSchedule`, `updateCultivationScheduleStatus` | ✅ |
| `src/components/dashboard/CultivationCalendar.tsx` (Web) | Rewrote to use real API (no mock data) | ✅ |
| `src/lib/cultivation/types.ts` (Web) | Added `CultivationSchedule`, `CreateCultivationScheduleRequest` types | ✅ |
| 11 Web component files | Removed `MockDataBanner` import + usage | ✅ |
| `docs/demo/REAL_RUNTIME_VERIFICATION.md` (Mobile) | Runtime verification checklist | ✅ |
| `docs/demo/migrate-demo-ids.js` (Mobile) | MongoDB ID migration (demo → production IDs) | ✅ |
| `docs/demo/seed-tree-positions.js` (Mobile) | Tree row/column position seeding | ✅ |

---

## Verification Checklist

After recovery, all of these must return 200 with valid data (not compile-only PASS):

- [ ] `GET /api/v1/farms` with JWT → farm list with zones
- [ ] `GET /api/v1/cultivation-zones` with JWT → zone list
- [ ] `GET /api/knowledge/articles` without JWT → public articles (200)
- [ ] `GET /api/cultivation-schedules` with JWT → schedule list
- [ ] `GET /api/v1/harvest-batches` with JWT → no 500 error (PENDING_INSPECTION fixed)
- [ ] Web: Khu canh tác page loads zone list from API
- [ ] Web: CultivationCalendar zone dropdown populated from API
- [ ] Mobile: Farm zones visible after login
- [ ] Web + Mobile typecheck pass

---

*Document generated after full runtime investigation — not compile-only.*
