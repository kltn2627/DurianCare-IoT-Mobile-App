# Tree Map Feature — Web/Mobile Parity Audit

Generated: 2026-09-16 | Phase 1 of Tree Map implementation

---

## Feature Matrix

| Feature | Backend | Web | Mobile | Action Required |
|---------|---------|-----|--------|----------------|
| **Farm list** | Exists (entity + repo, no controller) | Partial (mock fallback) | None | Add FarmController GET /api/farms |
| **Zone list per farm** | Exists (embedded in Farm, no controller) | Partial (mock fallback) | None | Add GET /api/farms/{farmId}/zones |
| **Zone detail** | Exists (embedded, no controller) | Partial (mock fallback) | None | Add GET /api/zones/{zoneId} |
| **Tree entity (DB)** | Exists (DurianTree MongoDB, no REST) | None | None | Add TreeController |
| **Tree Map visualization** | — | None | None | Build Web + Mobile |
| **Tree List with status** | — | None | None | Build Web + Mobile |
| **Tree Detail view** | — | None | None | Build Web + Mobile |
| **Tree Create** | None (entity exists, no endpoint) | None | None | Add POST /api/zones/{zoneId}/trees |
| **Tree Edit** | None | None | None | Add PUT /api/trees/{treeId} + UI |
| **Tree positionX/Y** | Missing on entity | — | — | Add fields to DurianTree |
| **Tree nickname/variety** | Missing on entity | — | — | Add fields to DurianTree |
| **Tree code (DC-T001)** | treeCode field exists, compound unique index exists | — | — | Auto-generate if not provided |
| **Tree health status** | TreeHealthStatus enum exists (HEALTHY/SUSPECTED/DISEASED/TREATING/RECOVERED) | — | — | Wire to diagnosis result |
| **Shared camera / AI predict** | Exists (POST /api/v1/predict, frozen) | Exists (two-mode) | Exists (scanner) | Reuse, add tree context |
| **Save diagnosis to tree** | None (disease_records table has durian_tree_id but no write endpoint) | None | None | Add POST /api/trees/{treeId}/diagnoses (new MongoDB collection) |
| **Diagnosis history per tree** | None | None (session-local only) | None (AsyncStorage only) | Add GET /api/trees/{treeId}/diagnoses |
| **Latest diagnosis per tree** | None | None | None | Add GET /api/trees/{treeId}/diagnoses/latest |
| **Zone safety summary** | None | None | None | Add GET /api/zones/{zoneId}/safety-summary |
| **Harvest safety summary** | None | None | None | Derive from zone safety |
| **Export with tree data** | Partial (export-assessment exists, no tree detail) | Partial (export compliance exists) | Partial (exists) | Add tree summary to export |
| **QR → Zone → Tree Map** | QR flow exists (batch-level), no tree-level QR | Exists (batch QR) | Exists (batch QR + scanner) | Keep QR → zone, add tree navigation |
| **Cultivation Calendar** | Exists (activities API with treeIds field) | Exists (real API) | Exists but **hardcoded mock** | Wire mobile calendar to real API |

---

## Gap Summary

### Critical Gaps (blocking Tree Map)

1. **No Farm/Zone/Tree REST controllers in farm-service** — Gateway routes `/api/farms/**`, `/api/zones/**`, `/api/trees/**` all point to farm-service but no Java controllers are implemented. All three need to be created.

2. **DurianTree missing positionX/positionY** — Entity has `latitude`/`longitude` (real GPS) but no relative canvas coordinates for the farm-local tree map. Need to add `positionX`/`positionY` (Double, 0.0–1.0 relative to zone canvas).

3. **DurianTree missing nickname/variety** — Users need these fields to personalize tree records.

4. **No tree diagnosis persistence** — `POST /api/v1/predict` (AI service) is frozen and returns in-memory results only; it doesn't save to `disease_records`. Rather than modifying the AI service, we add a new `tree_diagnosis_records` MongoDB collection in farm-service and a `POST /api/trees/{treeId}/diagnoses` endpoint where the frontend saves AI results after receiving them.

5. **No safety summary** — Need zone-level computation: totalTrees, safeTrees, attentionTrees, notAssessedTrees, safetyRate.

### Important Gaps (degraded experience)

6. **Mobile cultivation calendar uses hardcoded mock** — `cultivationApi.ts` and `cultivationTypes.ts` are fully defined and never called. `DurianCultivationCalendarScreen` ignores them entirely. Wire the calendar to the real API.

7. **Mobile/web diagnosis is session-local** — No diagnosis is persisted to backend. After implementing tree-linked diagnosis, historical data will live in MongoDB.

### Non-breaking Gaps (scope for later)

8. **Export assessment doesn't include per-tree data** — Current export just uses device_id + chemical applications. Adding tree safety summary to the export report is a future enhancement.

9. **No tree-level QR** — QR currently represents a farming batch (harvest). Tree-level QR (scan QR → open tree detail) is out of scope for this phase.

---

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| New `tree_diagnosis_records` MongoDB collection (not using AI service's PostgreSQL `disease_records`) | Avoids cross-service writes; keeps tree domain self-contained in farm-service |
| Frontend orchestrates AI + save (not backend-to-backend call) | AI service stays frozen; farm-service doesn't need WebClient |
| positionX/positionY (relative 0–1) instead of Google Maps | Thesis demo scope; no map library required |
| treeCode format: `DC-T{nnn}` | Consistent with existing batchCode patterns; auto-generated if not provided |
