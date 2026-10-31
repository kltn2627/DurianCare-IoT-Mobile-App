import type { ActivityType, AgriculturalInput, CompleteCultivationActivityRequest } from "./cultivationTypes";
import type { MaterialSelectionSource } from "./materialRecognition";

export type UsageDraft = { agriculturalInputId: string; quantityUsed: string; quantityUnit: string; batchNumber: string; selectionSource?: MaterialSelectionSource };
export type CompletionDraft = { startedAt: string; completedAt: string; actualArea: string; areaUnit: string; notes: string; inputUsages: UsageDraft[] };
export const emptyUsage = (): UsageDraft => ({ agriculturalInputId: "", quantityUsed: "", quantityUnit: "", batchNumber: "" });
export const canRecordUsage = (input: AgriculturalInput) => input.status === "VERIFIED" || input.status === "USER_RECORDED";
export function addSelectedMaterial(usages: UsageDraft[], input: AgriculturalInput, preferredUnit?: string, source?: MaterialSelectionSource): UsageDraft[] {
  if (!canRecordUsage(input) || usages.some((usage) => usage.agriculturalInputId === input.id)) return usages;
  const next = { ...emptyUsage(), agriculturalInputId: input.id, quantityUnit: preferredUnit || input.unit || "", ...(source ? { selectionSource: source } : {}) };
  const emptyIndex = usages.findIndex((usage) => !usage.agriculturalInputId && !usage.quantityUsed && !usage.batchNumber);
  if (emptyIndex < 0) return [...usages, next];
  return usages.map((usage, index) => index === emptyIndex ? next : usage);
}
export const requiresRecordedInput = (type: ActivityType) =>
  ["CHEMICAL_TREATMENT", "BIOLOGICAL_TREATMENT", "FERTILIZATION", "FERTIGATION"].includes(type);

export function buildCompletionPayload(type: ActivityType, draft: CompletionDraft, catalog: AgriculturalInput[], actorId: string): CompleteCultivationActivityRequest {
  if (!actorId) throw new Error("Không xác định được người thực hiện.");
  const started = new Date(draft.startedAt);
  const completed = new Date(draft.completedAt);
  if (!Number.isFinite(started.getTime()) || !Number.isFinite(completed.getTime()) || completed < started) {
    throw new Error("Thời gian hoàn thành phải sau thời gian bắt đầu.");
  }
  if (requiresRecordedInput(type) && draft.inputUsages.length === 0) {
    throw new Error("Loại công việc này cần ít nhất một vật tư đã sử dụng.");
  }
  const inputUsages = draft.inputUsages.map((usage) => {
    const input = catalog.find((item) => item.id === usage.agriculturalInputId && canRecordUsage(item));
    const quantity = Number(usage.quantityUsed);
    if (!input || !Number.isFinite(quantity) || quantity <= 0 || !usage.quantityUnit.trim()) {
      throw new Error("Chọn vật tư hợp lệ, nhập số lượng dương và đơn vị cho từng dòng.");
    }
    return { agriculturalInputId: input.id, quantityUsed: quantity, quantityUnit: usage.quantityUnit.trim(), batchNumber: usage.batchNumber.trim() || undefined };
  });
  if (new Set(inputUsages.map((usage) => usage.agriculturalInputId)).size !== inputUsages.length) {
    throw new Error("Mỗi vật tư chỉ được chọn một lần.");
  }
  const actualArea = draft.actualArea.trim() ? Number(draft.actualArea) : undefined;
  if (actualArea !== undefined && (!Number.isFinite(actualArea) || actualArea < 0)) throw new Error("Diện tích thực hiện phải là số không âm.");
  return { startedAt: started.toISOString(), completedAt: completed.toISOString(), executedBy: actorId,
    actualArea, areaUnit: actualArea === undefined ? undefined : draft.areaUnit.trim() || undefined,
    notes: draft.notes.trim() || undefined, inputUsages, evidenceFiles: [], weatherSnapshot: {} };
}
