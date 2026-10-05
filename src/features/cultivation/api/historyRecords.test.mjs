import assert from "node:assert/strict";
import test from "node:test";
import { groupHistoryRecords } from "./historyRecords.ts";

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
