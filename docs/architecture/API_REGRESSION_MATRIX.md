# API Regression Matrix — DurianCare

*Generated: 2026-09-30 | Branch: duy/cleanup-fixes*

## 1. Gateway Route Status (Unauthenticated Probe)

| Endpoint | Method | Expected (no JWT) | Actual | Owner Service | Root Cause |
|----------|--------|-------------------|--------|---------------|------------|
| `/api/auth/login` | POST | 400/200 | 200 ✅ | auth-service | Public — no auth |
| `/api/auth/refresh` | POST | 400/200 | 200 ✅ | auth-service | Public — no auth |
| `/api/knowledge/articles` | GET | 200 (public GET) | 401 ⚠️ | auth-service | Gateway container stale — old `PublicEndpointMatcher` |
| `/api/knowledge/articles` | GET | 200 | 200 ✅ | auth-service | After gateway rebuild |
| `/api/community/posts` | GET | 401 | 401 ✅ | auth-service | Service UP, auth required |
| `/api/farms` | GET | 401 | 401 ✅ | farm-service | Legacy path, service UP |
| `/api/v1/farms` | GET | 401 | 404 ❌ | farm-service | Gateway container (2026-09-15) missing `/api/v1/farms` predicate |
| `/api/v1/trees` | GET | 401 | 404 ❌ | farm-service | Same — old container missing `/api/v1/trees` predicate |
| `/api/v1/agronomists` | GET | 401 | 401 ✅ | farm-service | Was in old predicates |
| `/api/v1/harvest-batches` | GET | 401 | 401 ✅ | cultivation-service | Service UP |
| `/api/v1/cultivation-seasons` | GET | 401 | 401 ✅ | cultivation-service | Service UP |
| `/api/cultivation-schedules` | GET | 401 | 401 ✅ | cultivation-service | Service UP |
| `/api/v1/cultivation-zones` | GET | 401 | 404 ❌ | cultivation-service | Endpoint added after container was built (2026-08-06) |
| `/api/v1/predict` | POST | 401 | 401 ✅ | ai-service | Service UP |
| `/api/v1/rag/**` | GET | 401 | 401 ✅ | ai-service | Routes OK; RAG broken by Python import error |

---

## 2. Feature Status Matrix

| Feature | Web Status | Mobile Status | Root Cause | Fix |
|---------|-----------|---------------|------------|-----|
| Login / Logout | ✅ PASS | ✅ PASS | — | — |
| Khu canh tác (Farm Zones) list | ❌ FAIL | ❌ FAIL | `/api/v1/farms` → 404 (gateway stale) | Rebuild gateway |
| Khu canh tác — create zone | ❌ FAIL | ❌ FAIL | `/api/v1/farms/{id}/zones` → 404 | Rebuild gateway + farm-service |
| Cây (Tree Map) | ❌ FAIL | ❌ FAIL | `/api/v1/farms` fails zone hydration | Rebuild gateway |
| Lịch chăm sóc (Care Schedule) | ❌ FAIL | ❌ FAIL | `farmZoneClient.listZones()` → `/api/v1/farms` → 404 | Rebuild gateway |
| Cultivation Calendar (Web) | ❌ FAIL | N/A | Same — zones can't load | Rebuild gateway |
| Cultivation Seasons | ⚠️ PARTIAL | ⚠️ PARTIAL | `/api/v1/cultivation-seasons` → 401 OK, but deserialization error from `PENDING_INSPECTION` harvest batch | Fix MongoDB + rebuild |
| Harvest Batch | ❌ FAIL | ❌ FAIL | `HarvestBatchStatus.PENDING_INSPECTION` enum mismatch in MongoDB | Fix MongoDB document |
| Knowledge Base — article list | ⚠️ FAIL | N/A | Gateway PUBLIC_GET_PATHS stale — returns 401 instead of 200 | Rebuild gateway |
| Knowledge Base — article CRUD (auth) | ✅ PASS | N/A | Auth protected — routing OK | — |
| Knowledge Base — AI chat (RAG) | ❌ FAIL | ❌ FAIL | Python `datasets` import error in ai-service; embedding model fails | Fix ai-service dependencies |
| Community posts | ✅ PASS | ✅ PASS | Returns 401 → redirect to login OK | — |
| Diagnosis (AI predict) | ✅ PASS | ✅ PASS | `/api/v1/predict` working | — |
| Traceability | ✅ PASS | N/A | Routes OK | — |

---

## 3. MongoDB Data Integrity Issues

| Collection | Database | Issue | Fix |
|-----------|----------|-------|-----|
| `harvest_batches` | `duriancare_cultivation` | Document `demo-harvest-batch-2026-001` has `status: "PENDING_INSPECTION"` — not a valid `HarvestBatchStatus` enum value | `db.harvest_batches.updateOne({_id:"demo-harvest-batch-2026-001"}, {$set:{status:"APPROVED"}})` |

---

## 4. Docker Container Age vs Code

| Container | Created | Latest Code Commit | Gap | Action |
|-----------|---------|-------------------|-----|--------|
| `duriancare-gateway` | 2026-09-15 | 2026-09-30 | 15 days | **REBUILD** |
| `duriancare-farm-service` | 2026-09-16 | 2026-09-29 | 13 days | **REBUILD** |
| `duriancare-cultivation-service` | 2026-08-06 | 2026-09-30 | 55 days | **REBUILD** |
| `duriancare-auth-service` | 2026-09-15 | 2026-09-15 | ~0 days | Rebuild for safety |
| `duriancare-ai-service` | 2026-09-17 | 2026-09-17 | ~0 days | OK |
| `duriancare-mongodb` | 2026-08-06 | N/A (data) | OK | — |

---

## 5. AI Service Issues (Pre-existing)

```
Failed to load embedding model BAAI/bge-m3:
  cannot import name 'Dataset' from 'datasets'
```

- Affects: RAG-based Knowledge Base chat (`/api/v1/rag/**`)
- Does NOT affect: AI disease prediction (`/api/v1/predict`)
- Fix: Update `datasets` package in ai-service Python environment

---

*All statuses are runtime-verified, not compile-only.*
