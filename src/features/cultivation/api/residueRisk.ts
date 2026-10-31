import type { LabResultStatus } from "./cultivationTypes";

export type ResidueRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
export type ResidueLabEvidence = {
  resultId: string; sampleId: string; harvestBatchId: string | null;
  sampledAt: string | null; targetMarketCode: string | null;
  measuredValue: number | null; unit: string | null;
  applicableMrl: number | null; mrlUnit: string | null; residueStandardId: string | null;
  resultStatus: LabResultStatus; predatesLastUsage: boolean;
};
export type ResidueRiskIngredient = {
  key: string; code: string | null; name: string; applicationCount: number;
  firstUsedAt: string; lastUsedAt: string; latestSafeHarvestDate: string | null;
  expectedHarvestDate: string | null; riskLevel: ResidueRiskLevel; riskReasons: string[];
  products: string[];
  timeline: { usageId: string; activityExecutionId: string; usedAt: string; productId: string;
    productName: string; quantityUsed: number; quantityUnit: string; calculatedSafeHarvestDate: string | null }[];
  labAssessment: { status: "AVAILABLE" | "NOT_TESTED"; results: ResidueLabEvidence[] };
};
export type ResidueRiskResponse = {
  seasonId: string; plotId: string; expectedHarvestDate: string | null;
  expectedHarvestDateSource: "UNAVAILABLE" | "EARLIEST_NON_CANCELLED_PLAN";
  targetMarketCodes: string[]; overallRisk: ResidueRiskLevel; riskReasons: string[];
  ingredients: ResidueRiskIngredient[];
};

export const riskPresentation: Record<ResidueRiskLevel, { label: string; color: string }> = {
  HIGH: { label: "Cao", color: "#b91c1c" },
  MEDIUM: { label: "Trung bình", color: "#a16207" },
  LOW: { label: "Thấp", color: "#15803d" },
  UNKNOWN: { label: "Chưa đủ dữ liệu", color: "#64748b" },
};
const reasons: Record<string, string> = {
  EXPECTED_HARVEST_BEFORE_SAFE_HARVEST: "Thu hoạch dự kiến sớm hơn thời gian cách ly.",
  MISSING_EXPECTED_HARVEST_DATE: "Chưa đủ ngày thu hoạch dự kiến trong các kế hoạch.",
  MISSING_PRE_HARVEST_INTERVAL: "Thiếu thời gian cách ly hợp lệ của vật tư.",
  UNRELIABLE_SAFE_HARVEST_DATE: "Chưa xác nhận được ngày an toàn thu hoạch từ dữ liệu đã ghi.",
  MISSING_ACTIVE_INGREDIENT: "Thiếu mã hoạt chất để đối chiếu.",
  MISSING_INPUT_INFORMATION: "Thiếu thông tin vật tư đã sử dụng.",
  MISSING_TARGET_MARKET: "Chưa có thị trường mục tiêu để kiểm tra tuân thủ.",
  NO_APPLICABLE_MRL: "Chưa có tiêu chuẩn MRL phù hợp để đối chiếu.",
  PROHIBITED_INPUT_USED: "Lịch sử có vật tư thuộc nhóm bị cấm.",
  LAB_RESULT_FAILED: "Có mẫu xét nghiệm liên quan không đạt MRL; xem kết quả riêng bên dưới.",
  ACTIVE_INGREDIENT_NOT_ALLOWED_FOR_MARKET: "Vật tư không được phép tại thị trường mục tiêu.",
  NO_COMPLETED_USAGE: "Chưa có lần dùng vật tư thực tế đã hoàn thành.",
  INCOMPLETE_USAGE_DATA: "Một số hoạt chất còn thiếu dữ liệu; xem chi tiết bên dưới.",
};
export function residueReason(reason: string) {
  return reasons[reason] ?? "Có thông tin tuân thủ cần được kiểm tra.";
}
export function residueDate(value: string | null) {
  if (!value) return "Chưa có";
  // Safe dates and usage timestamps follow the backend's UTC calendar convention.
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}
const labLabels: Record<LabResultStatus, string> = {
  PASS: "Đạt", FAIL: "Không đạt", NOT_DETECTED: "Không phát hiện",
  BELOW_LIMIT_OF_QUANTIFICATION: "Dưới giới hạn định lượng",
  NO_STANDARD_FOUND: "Chưa có tiêu chuẩn phù hợp", PENDING_REVIEW: "Cần kiểm tra kết quả",
};
export function labPresentation(lab: ResidueLabEvidence) {
  return {
    label: labLabels[lab.resultStatus],
    measured: lab.measuredValue == null ? "Không có giá trị định lượng" : `${lab.measuredValue} ${lab.unit ?? ""}`.trim(),
    mrl: lab.applicableMrl == null ? "Chưa có" : `${lab.applicableMrl} ${lab.mrlUnit ?? ""}`.trim(),
    color: lab.resultStatus === "FAIL" ? "#b91c1c" : lab.resultStatus === "PASS" ? "#15803d" : "#64748b",
  };
}
export function ingredientPresentation(ingredient: ResidueRiskIngredient) {
  return {
    risk: riskPresentation[ingredient.riskLevel],
    reasons: ingredient.riskReasons.map(residueReason),
    timeline: ingredient.timeline.map(row => ({
      key: row.usageId, date: residueDate(row.usedAt), product: row.productName,
      quantity: `${row.quantityUsed} ${row.quantityUnit}`,
    })),
    noLab: ingredient.labAssessment.status === "NOT_TESTED"
      ? "Chưa có kết quả xét nghiệm dư lượng." : null,
  };
}
