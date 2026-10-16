# Tree Map — Domain Design

Generated: 2026-09-16

---

## 1. Entity Relationships

```
Farm (1) ──── (N) FarmZone (embedded in Farm.zones[])
                     │
                     └─── (N) DurianTree  ──── (N) TreeDiagnosisRecord
                                 │
                                 └── healthStatus updated on each new diagnosis
```

---

## 2. Entity Definitions

### Farm (existing MongoDB document — unchanged)
```
id, ownerUserId, name, address, province, district,
latitude, longitude, areaHectares, status (ACTIVE|INACTIVE|ARCHIVED),
zones: FarmZone[], createdAt, updatedAt
```

### FarmZone (existing embedded record in Farm — unchanged)
```
id, name, code, areaSquareMeters, boundaryGeoJson, description,
status (ACTIVE|INACTIVE|QUARANTINED|ARCHIVED), createdAt, updatedAt
```

### DurianTree (existing MongoDB collection `durian_trees` — EXTENDED)

**Existing fields:** id, farmId, farmZoneId, speciesId, treeCode, plantedDate, latitude, longitude, healthStatus, status, notes, createdAt, updatedAt

**New fields added:**
| Field | Type | Description |
|-------|------|-------------|
| `nickname` | String (nullable) | User-defined display name, e.g. "Cây đầu hàng" |
| `variety` | String (nullable) | Cultivar name, e.g. "Monthong", "Ri6" |
| `positionX` | Double (nullable, 0.0–1.0) | Relative X position on zone canvas (0 = left edge) |
| `positionY` | Double (nullable, 0.0–1.0) | Relative Y position on zone canvas (0 = top edge) |

**Existing constraints kept:**
- Compound unique index: `{ farmZoneId, treeCode }` (enforces unique tree codes per zone)
- `healthStatus` enum: `HEALTHY | SUSPECTED | DISEASED | TREATING | RECOVERED`
- `status` enum: `ACTIVE | REMOVED | DEAD`

### TreeDiagnosisRecord (NEW MongoDB collection `tree_diagnosis_records`)
```
id              — @Id
treeId          — @Indexed (references DurianTree.id)
farmId          — denormalized for queries
farmZoneId      — denormalized for queries
imageUrl        — URL of diagnosed image (from AI service S3)
diseaseCode     — AI output code, e.g. "Healthy_Leaf", "Leaf_Blight"
diseaseName     — Human-readable name
confidence      — Double (0.0–1.0)
boundingBox     — Map<String, Object> (top, left, width, height as %)
source          — "MOBILE" | "WEB" | "IOT_CAMERA"
diagnosedByUserId — user who triggered the diagnosis
impliedHealthStatus — TreeHealthStatus inferred from diseaseCode
diagnosedAt     — Instant
createdAt       — Instant
```

**Index:** compound `{ treeId: 1, diagnosedAt: -1 }` for efficient history queries.

---

## 3. Health Status Inference Rule

When saving a `TreeDiagnosisRecord`, the backend immediately updates `DurianTree.healthStatus`:

```
diseaseCode == "Healthy_Leaf" (case-insensitive)  →  HEALTHY
diseaseCode == any other value                     →  DISEASED
diseaseCode == null                                →  SUSPECTED
```

This rule is business logic in farm-service and does NOT affect the AI model/service.

---

## 4. Tree Code Convention

Format: `DC-T{nnn}` where `{nnn}` is a zero-padded 3-digit integer.

Examples: `DC-T001`, `DC-T002`, `DC-T099`, `DC-T100`

Rules:
- If client provides a `treeCode`, use it (validated for uniqueness within zone via compound index)
- If client does not provide `treeCode`, auto-generate: count existing trees in zone, use `count + 1` as the sequence number
- `treeCode` is unique per zone (`farmZoneId`), not globally
- `treeCode` is **immutable** after creation (do not allow updates)

---

## 5. API Contract (all via Gateway port 8080)

All authenticated endpoints require JWT. Gateway injects `X-Auth-User-Id`, `X-Auth-Role`, `X-Auth-Email` headers.

### Farm endpoints (→ farm-service)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/farms` | List farms owned by the requesting user |
| GET | `/api/farms/{farmId}` | Get farm detail |
| GET | `/api/farms/{farmId}/zones` | List zones of a farm |

### Zone endpoints (→ farm-service)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/zones/{zoneId}` | Zone detail with tree count |
| GET | `/api/zones/{zoneId}/trees` | **Tree map list** — summary data for all active trees |
| POST | `/api/zones/{zoneId}/trees` | Create a new tree in zone |
| GET | `/api/zones/{zoneId}/safety-summary` | Zone safety statistics |

### Tree endpoints (→ farm-service)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/trees/{treeId}` | Full tree detail |
| PUT | `/api/trees/{treeId}` | Update tree (nickname, variety, position, notes) |
| PATCH | `/api/trees/{treeId}/status` | Soft-delete: set status to REMOVED |
| GET | `/api/trees/{treeId}/diagnoses` | Diagnosis history (paginated, newest first) |
| POST | `/api/trees/{treeId}/diagnoses` | Save AI result to this tree |
| GET | `/api/trees/{treeId}/diagnoses/latest` | Latest diagnosis record |

---

## 6. Tree Map List Response (GET /api/zones/{zoneId}/trees)

Optimised summary — only what the tree map canvas needs:

```json
[
  {
    "id": "...",
    "treeCode": "DC-T001",
    "nickname": "Cây đầu hàng",
    "variety": "Monthong",
    "positionX": 0.20,
    "positionY": 0.30,
    "healthStatus": "HEALTHY",
    "status": "ACTIVE",
    "latestDiagnosisAt": "2026-07-29T10:00:00Z",
    "latestDiseaseCode": "Healthy_Leaf",
    "diagnosisCount": 3
  }
]
```

Tree detail (GET /api/trees/{treeId}) includes all additional fields: plantedDate, latitude, longitude, notes, speciesId, farmId, farmZoneId, createdAt, updatedAt.

---

## 7. Safety Summary Response (GET /api/zones/{zoneId}/safety-summary)

```json
{
  "zoneId": "...",
  "zoneName": "Khu A",
  "totalTrees": 100,
  "assessedTrees": 92,
  "safeTrees": 89,
  "attentionTrees": 3,
  "notAssessedTrees": 8,
  "safetyRate": 96.74,
  "safetyRateLabel": "89 / 92 cây đã đánh giá đạt an toàn",
  "calculatedAt": "2026-09-16T..."
}
```

**Calculation:**
- `totalTrees` = count(DurianTree where farmZoneId = zoneId AND status = ACTIVE)
- `assessedTrees` = count(trees that have ≥ 1 TreeDiagnosisRecord)
- `safeTrees` = count(trees where healthStatus = HEALTHY)
- `attentionTrees` = count(trees where healthStatus IN [DISEASED, TREATING, SUSPECTED])
- `notAssessedTrees` = totalTrees − assessedTrees
- `safetyRate` = safeTrees / assessedTrees × 100 (if assessedTrees > 0, else null)

**Business rule:** Unassessed trees are NOT counted as safe.

---

## 8. Shared Camera Model

Camera is a shared resource. Tree is the target/context, not the camera owner.

**Diagnosis flow:**
```
User selects Tree DC-T001
    ↓
User opens Camera / Scanner
    ↓
Capture image
    ↓
POST /api/v1/predict (multipart: image, source=MOBILE)     ← AI service (frozen)
    ↓ Returns { predictedDisease, confidence, boundingBox, ... }
    ↓
POST /api/trees/{treeId}/diagnoses                          ← farm-service (new)
     Body: { imageUrl, diseaseCode, diseaseName, confidence, boundingBox, source }
    ↓
farm-service: saves TreeDiagnosisRecord + updates DurianTree.healthStatus
    ↓
Returns TreeDiagnosisResponse
    ↓
UI shows result attached to DC-T001
```

Same camera is then reused for DC-T002, DC-T003, etc.

---

## 9. Web/Mobile Parity

| Capability | Web API call | Mobile API call |
|-----------|-------------|----------------|
| List farms | GET /api/farms | GET /api/farms |
| List zones | GET /api/farms/{farmId}/zones | GET /api/farms/{farmId}/zones |
| Zone safety | GET /api/zones/{zoneId}/safety-summary | GET /api/zones/{zoneId}/safety-summary |
| Tree map data | GET /api/zones/{zoneId}/trees | GET /api/zones/{zoneId}/trees |
| Create tree | POST /api/zones/{zoneId}/trees | POST /api/zones/{zoneId}/trees |
| Tree detail | GET /api/trees/{treeId} | GET /api/trees/{treeId} |
| Update tree | PUT /api/trees/{treeId} | PUT /api/trees/{treeId} |
| AI predict | POST /api/v1/predict | POST /api/v1/predict |
| Save diagnosis | POST /api/trees/{treeId}/diagnoses | POST /api/trees/{treeId}/diagnoses |
| Diagnosis history | GET /api/trees/{treeId}/diagnoses | GET /api/trees/{treeId}/diagnoses |
| Latest diagnosis | GET /api/trees/{treeId}/diagnoses/latest | GET /api/trees/{treeId}/diagnoses/latest |

Both platforms call **identical endpoints** through the same gateway (port 8080).

---

## 10. Known Limitations

| Limitation | Reason | Mitigation |
|-----------|--------|------------|
| positionX/Y are relative (0–1), not real GPS for rendering | No Google Maps; thesis scope | Normalize to canvas px: `x = positionX * canvasWidth` |
| `disease_records` PostgreSQL table not used | Cross-service writes would couple farm-service to AI service; AI frozen | New `tree_diagnosis_records` MongoDB collection in farm-service |
| Tree map has no pan/zoom beyond basic scroll | No map library added | Canvas-sized SVG/View with overflow scroll |
| No tree-level QR in this phase | QR currently batch-level | QR → zone → tree map navigation is sufficient |
| Harvest safety is zone-level (not harvest-batch-level) | HarvestBatch has farmId/plotId but no treeIds | Zone safety summary proxied for harvest display |
