import type { ActivityExecution, ActivityInputUsage, CareHistoryResponse } from "./cultivationTypes";

export function groupHistoryRecords(history: Pick<CareHistoryResponse, "executions" | "inputUsages">) {
  const executionsByActivity = new Map<string, ActivityExecution[]>();
  const usagesByExecution = new Map<string, ActivityInputUsage[]>();
  for (const execution of history.executions) {
    executionsByActivity.set(execution.cultivationActivityId, [...(executionsByActivity.get(execution.cultivationActivityId) ?? []), execution]);
  }
  for (const usage of history.inputUsages) {
    usagesByExecution.set(usage.activityExecutionId, [...(usagesByExecution.get(usage.activityExecutionId) ?? []), usage]);
  }
  return { executionsByActivity, usagesByExecution };
}

export type RecentMaterial = {
  agriculturalInputId: string;
  name: string;
  category?: string;
  lastQuantity: number;
  quantityUnit: string;
  lastUsedAt: string;
};

export function deriveRecentMaterials(history: CareHistoryResponse, limit = 8): RecentMaterial[] {
  const completedIds = new Set(history.activities.filter((activity) => activity.status === "COMPLETED").map((activity) => activity.id));
  const executions = new Map(history.executions
    .filter((execution) => completedIds.has(execution.cultivationActivityId) && execution.locked
      && Number.isFinite(Date.parse(execution.completedAt)) && Date.parse(execution.completedAt) <= Date.now())
    .map((execution) => [execution.id, execution]));
  const latest = new Map<string, RecentMaterial>();
  for (const usage of history.inputUsages) {
    const completedAt = executions.get(usage.activityExecutionId)?.completedAt;
    if (!completedAt || !usage.agriculturalInputId || !Number.isFinite(usage.quantityUsed)
      || usage.quantityUsed <= 0 || !usage.quantityUnit?.trim()) continue;
    const material: RecentMaterial = {
      agriculturalInputId: usage.agriculturalInputId,
      name: usage.agriculturalInputSnapshot?.tradeName || usage.agriculturalInputSnapshot?.productName || usage.agriculturalInputId,
      category: usage.agriculturalInputSnapshot?.category,
      lastQuantity: usage.quantityUsed,
      quantityUnit: usage.quantityUnit,
      lastUsedAt: completedAt,
    };
    if (!latest.has(material.agriculturalInputId) || completedAt > latest.get(material.agriculturalInputId)!.lastUsedAt) {
      latest.set(material.agriculturalInputId, material);
    }
  }
  return [...latest.values()].sort((left, right) => right.lastUsedAt.localeCompare(left.lastUsedAt)).slice(0, Math.max(0, limit));
}
