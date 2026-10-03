# Tree Recovery State + Tree Map Synchronization — Bug Report & Fix

**Date:** 2026-09-30  
**Branch:** `duy/cleanup-fixes`  
**Affected services:** `DurianCare-IoT-Mobile-App`, `DurianCare-IoT-Web-Client`  
**Backend status:** No changes required

---

## 1. Bug Description

After a farmer confirms tree recovery via "Xác nhận phục hồi", the diagnosis record is saved correctly to MongoDB, but the Tree Map node color and health status badge do **not** update until the user performs a full page/screen reload.

**Symptom:**
- Confirm recovery → success toast ✓
- Tree detail panel shows `Khỏe mạnh` ✓
- **Tree Map node color stays red** ✗
- **Tree list row health badge stays "Bệnh"** ✗
- Safety summary rate is stale ✗

---

## 2. Root Cause Analysis

### 2.1 Backend — Correct

The backend correctly performs an atomic update on every `saveDiagnosis` call:

```
POST /api/trees/{treeId}/diagnoses  (diseaseCode = "RECOVERED_BY_FARMER")
  → TreeDiagnosisService.saveDiagnosis()
  → inferHealthStatus("RECOVERED_BY_FARMER") → HEALTHY
  → treeService.updateTreeHealthStatus(treeId, HEALTHY)
  → treeRepository.save(updatedTree)   ← persists to MongoDB
```

`GET /api/zones/{zoneId}/trees` reads `tree.healthStatus()` directly from the `DurianTree` document, so a subsequent fetch always returns the correct value.

### 2.2 Frontend — Missing propagation

Both platforms have a two-level component hierarchy for the tree map view:

```
ZoneTreesScreen / ZoneTreesWorkspace   ← owns `trees` state (drives map colors)
  └── TreeDetailContent / TreeDetailPanel   ← owns its own tree detail state
         └── RecoveryPanel
                └── confirm() → saveDiagnosis() → onSaved() → refresh()
```

`refresh()` in the detail component refetches the detail panel's own state (health badge in the panel updates ✓), but it **never notifies the parent**. The parent's `trees` state — which is the source of truth for the map node colors, tree list health badges, and safety summary — is never refreshed.

**Root cause:** `TreeDetailContent` / `TreeDetailPanel` had no `onDiagnosisSaved` callback prop. The parent screen had no way to know a diagnosis was saved without a full page reload.

The same gap affected AI diagnosis saves (`AIPanel.saveResult()`), not just recovery confirmation.

---

## 3. Fix

### Change 1 — `TreeDetailScreen.tsx` (mobile)

Added `onDiagnosisSaved?: () => void` to `ContentProps`. In `refresh()`, call it after triggering the panel's own reload:

```typescript
function refresh() {
  const active = { value: true };
  load(active);
  onDiagnosisSaved?.();   // ← NEW: notify parent
}
```

### Change 2 — `ZoneTreesScreen.tsx` (mobile)

Pass callback to `TreeDetailContent` in the Modal:

```tsx
<TreeDetailContent
  treeId={sheetTreeId}
  onClose={() => setSheetTreeId(null)}
  onDiagnosisSaved={() => {            // ← NEW
    listTrees(zoneId).then(setTrees).catch(() => {});
    getZoneSafety(zoneId).then((s) => { if (s) setSafety(s); }).catch(() => {});
  }}
/>
```

### Change 3 — `TreeDetailPanel.tsx` (web)

Same pattern: added `onDiagnosisSaved?: () => void` to `TreeDetailPanelProps` and called it in `refresh()`.

### Change 4 — `ZoneTreesWorkspace.tsx` (web)

```tsx
<TreeDetailPanel
  treeId={selectedTreeId}
  onClose={() => setSelectedTreeId(null)}
  onDiagnosisSaved={() => {            // ← NEW
    treeClient.listTrees(zoneId).then(setTrees).catch(() => {});
    treeClient.getZoneSafety(zoneId).then((s) => { if (s) setSafety(s); }).catch(() => {});
  }}
/>
```

---

## 4. Data Flow After Fix

```
RecoveryPanel.confirm()
  → POST /api/trees/{id}/diagnoses (RECOVERED_BY_FARMER)
  → backend: updateTreeHealthStatus(HEALTHY) → MongoDB
  → TreeDetailPanel.refresh()
      ├── load(treeId)   ← panel re-fetches tree detail (badge updates)
      └── onDiagnosisSaved?.()
            ├── listTrees(zoneId) → setTrees   ← map colors update
            └── getZoneSafety(zoneId) → setSafety   ← safety rate updates
```

Both the detail panel and the map/safety update without any page reload.

---

## 5. Regression Test Cases

### Case A — Disease → Recovery → Map turns green
1. Open a zone with at least one DISEASED tree.
2. Open that tree's detail. Confirm that map node is red.
3. Expand "Xác nhận phục hồi", enter a note, press "Gửi xác nhận phục hồi".
4. **Expected:** map node color changes from red → green without closing the panel.
5. **Expected:** tree list row health badge changes to "Khỏe mạnh".
6. **Expected:** safety summary rate increases.

### Case B — Disease → Recovery → Disease again
1. Complete Case A.
2. Run an AI diagnosis on the same tree that returns a disease code.
3. Save the AI result.
4. **Expected:** map node color returns to red.
5. **Expected:** health badge in panel updates to "Bệnh".

### Case C — Safety summary rate reflects recovery
1. Zone with N assessed trees, M healthy. Safety rate = M/N × 100%.
2. Confirm recovery on one DISEASED tree.
3. **Expected:** safety rate increases to (M+1)/N × 100% immediately.

### Case D — Web saves, verify state correct
1. On web, open a zone. Confirm recovery for a DISEASED tree.
2. **Expected on web:** map node turns green, safety summary updates.
3. Open the same zone on mobile (pull-to-refresh or re-navigate).
4. **Expected on mobile:** map node is green (data comes from MongoDB).

### Case E — Mobile saves, verify state correct
1. On mobile, confirm recovery for a DISEASED tree.
2. **Expected on mobile:** map node turns green, safety card updates.
3. Open the same zone on web (manual reload or navigate away and back).
4. **Expected on web:** map node is green.

---

## 6. No-op Constraint Verification

| Constraint | Status |
|------------|--------|
| No hard-coded zone/tree/farmer IDs | ✓ |
| No MongoDB data modification | ✓ |
| No auth rule changes | ✓ |
| No new dependencies added | ✓ |
| History records not deleted or modified | ✓ |
| Backend changes | None |

---

## 7. Files Changed

| File | Change |
|------|--------|
| `DurianCare-IoT-Mobile-App/src/features/trees/TreeDetailScreen.tsx` | Added `onDiagnosisSaved` prop + call in `refresh()` |
| `DurianCare-IoT-Mobile-App/src/features/trees/ZoneTreesScreen.tsx` | Passed `onDiagnosisSaved` callback to `TreeDetailContent` |
| `DurianCare-IoT-Web-Client/src/components/trees/TreeDetailPanel.tsx` | Added `onDiagnosisSaved` prop + call in `refresh()` |
| `DurianCare-IoT-Web-Client/src/components/trees/ZoneTreesWorkspace.tsx` | Passed `onDiagnosisSaved` callback to `TreeDetailPanel` |
