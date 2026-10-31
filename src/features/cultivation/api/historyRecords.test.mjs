import assert from "node:assert/strict";
import test from "node:test";
import { deriveRecentMaterials, groupHistoryRecords } from "./historyRecords.ts";

test("mobile care history keeps each product beneath the correct activity execution", () => {
  const grouped = groupHistoryRecords({
    executions: [{ id: "exec-a", cultivationActivityId: "activity-a" }, { id: "exec-b", cultivationActivityId: "activity-b" }],
    inputUsages: [{ id: "usage-a", activityExecutionId: "exec-a", agriculturalInputId: "input-a", quantityUsed: 500 }, { id: "usage-b", activityExecutionId: "exec-b", agriculturalInputId: "input-b", quantityUsed: 2 }],
  });
  assert.deepEqual(grouped.executionsByActivity.get("activity-a").map((item) => item.id), ["exec-a"]);
  assert.deepEqual(grouped.usagesByExecution.get("exec-a").map((item) => item.agriculturalInputId), ["input-a"]);
  assert.equal(grouped.usagesByExecution.get("exec-a")[0].quantityUsed, 500);
  assert.equal(grouped.usagesByExecution.get("exec-b")[0].agriculturalInputId, "input-b");
});

test("recent materials use latest actual usage from completed activities only", () => {
  const history = {
    activities: [{ id: "activity-a", status: "COMPLETED" }, { id: "activity-b", status: "IN_PROGRESS" }],
    executions: [
      { id: "exec-old", cultivationActivityId: "activity-a", completedAt: "2026-09-01T08:00:00Z", locked: true },
      { id: "exec-new", cultivationActivityId: "activity-a", completedAt: "2026-10-01T08:00:00Z", locked: true },
      { id: "exec-incomplete", cultivationActivityId: "activity-b", completedAt: "2026-10-02T08:00:00Z", locked: true },
      { id: "exec-unlocked", cultivationActivityId: "activity-a", completedAt: "2026-10-03T08:00:00Z", locked: false },
    ],
    inputUsages: [
      { activityExecutionId: "exec-new", agriculturalInputId: "input-a", agriculturalInputSnapshot: { productName: "New", verificationStatus: "USER_RECORDED" }, quantityUsed: 5, quantityUnit: "ml" },
      { activityExecutionId: "exec-old", agriculturalInputId: "input-a", agriculturalInputSnapshot: { productName: "Old" }, quantityUsed: 3, quantityUnit: "kg" },
      { activityExecutionId: "exec-old", agriculturalInputId: "input-b", agriculturalInputSnapshot: { productName: "B" }, quantityUsed: 2, quantityUnit: "l" },
      { activityExecutionId: "exec-incomplete", agriculturalInputId: "input-c", quantityUsed: 10, quantityUnit: "kg" },
      { activityExecutionId: "exec-unlocked", agriculturalInputId: "input-c", quantityUsed: 10, quantityUnit: "kg" },
    ],
  };
  assert.deepEqual(deriveRecentMaterials(history).map((item) => item.agriculturalInputId), ["input-a", "input-b"]);
  assert.deepEqual(deriveRecentMaterials(history)[0], { agriculturalInputId: "input-a", name: "New", category: undefined, lastQuantity: 5, quantityUnit: "ml", lastUsedAt: "2026-10-01T08:00:00Z" });
  assert.equal(deriveRecentMaterials(history, 1).length, 1);
});
