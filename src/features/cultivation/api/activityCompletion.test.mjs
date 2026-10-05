import assert from "node:assert/strict";
import test from "node:test";
import { buildCompletionPayload, emptyUsage, requiresRecordedInput } from "./activityCompletion.ts";

const catalog = [{ id: "input-1", productName: "Thuốc A", status: "VERIFIED", unit: "ml" }, { id: "input-2", productName: "Phân B", status: "VERIFIED", unit: "kg" }];
const draft = (inputUsages = []) => ({ startedAt: "2026-10-01T07:00", completedAt: "2026-10-01T08:00", actualArea: "", areaUnit: "ha", notes: "", inputUsages });
const usage = (agriculturalInputId = "input-1", quantityUsed = "500") => ({ ...emptyUsage(), agriculturalInputId, quantityUsed, quantityUnit: "ml", batchNumber: "LOT-1" });

test("material activity types require usage; nonmaterial types may have none", () => {
  for (const type of ["CHEMICAL_TREATMENT", "BIOLOGICAL_TREATMENT", "FERTILIZATION", "FERTIGATION"]) {
    assert.equal(requiresRecordedInput(type), true);
    assert.throws(() => buildCompletionPayload(type, draft(), catalog, "actor-1"), /ít nhất một vật tư/);
  }
  assert.equal(buildCompletionPayload("PRUNING", draft(), catalog, "actor-1").inputUsages.length, 0);
});

test("mobile submits catalog IDs and multiple actual quantities", () => {
  const payload = buildCompletionPayload("CHEMICAL_TREATMENT", draft([usage(), { ...usage("input-2", "2"), quantityUnit: "kg" }]), catalog, "actor-1");
  assert.equal(payload.executedBy, "actor-1");
  assert.deepEqual(payload.inputUsages.map((item) => item.agriculturalInputId), ["input-1", "input-2"]);
  assert.equal(payload.inputUsages[0].quantityUsed, 500);
  assert.equal(payload.inputUsages[0].batchNumber, "LOT-1");
});

test("removing a row excludes its product from completion", () => {
  const rows = [usage(), usage("input-2", "2")];
  const payload = buildCompletionPayload("FERTILIZATION", draft(rows.filter((_, index) => index !== 0)), catalog, "actor-1");
  assert.deepEqual(payload.inputUsages.map((item) => item.agriculturalInputId), ["input-2"]);
});

test("mobile rejects missing catalog product, invalid quantity, and other actor", () => {
  assert.throws(() => buildCompletionPayload("CHEMICAL_TREATMENT", draft([usage("missing")]), catalog, "actor-1"), /Chọn vật tư/);
  assert.throws(() => buildCompletionPayload("CHEMICAL_TREATMENT", draft([usage("input-1", "0")]), catalog, "actor-1"), /Chọn vật tư/);
  assert.throws(() => buildCompletionPayload("CHEMICAL_TREATMENT", draft([usage()]), catalog, ""), /người thực hiện/);
});
