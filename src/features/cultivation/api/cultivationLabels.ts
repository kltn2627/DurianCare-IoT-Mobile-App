import type { ActivityStatus, ActivityType, BiologicalLevel, ExportReleaseStatus, HarvestBatchStatus, RiskLevel } from "./cultivationTypes";

export const activityTypeLabels: Record<ActivityType, string> = {
  BIOLOGICAL_TREATMENT: "Phun sinh học",
  CHEMICAL_TREATMENT: "Phun hóa chất",
  DISEASE_MONITORING: "Kiểm tra bệnh",
  FERTIGATION: "Châm phân",
  FERTILIZATION: "Bón phân",
  FRUIT_BAGGING: "Bao trái",
  FRUIT_SAMPLING: "Lấy mẫu trái",
  HARVEST: "Thu hoạch",
  IRRIGATION: "Tưới nước",
  LEAF_SAMPLING: "Lấy mẫu lá",
  ORCHARD_SANITATION: "Vệ sinh vườn",
  OTHER: "Khác",
  PEST_MONITORING: "Kiểm tra sâu hại",
  POLLINATION: "Thụ phấn",
  PRUNING: "Cắt tỉa",
  SOIL_IMPROVEMENT: "Cải tạo đất",
  SOIL_SAMPLING: "Lấy mẫu đất",
  WATER_SAMPLING: "Lấy mẫu nước",
  WEED_CONTROL: "Kiểm soát cỏ",
};

export const activityStatusLabels: Record<ActivityStatus, string> = {
  APPROVED: "Đã duyệt",
  CANCELLED: "Đã hủy",
  COMPLETED: "Hoàn thành",
  DRAFT: "Nháp",
  IN_PROGRESS: "Đang làm",
  OVERDUE: "Quá hạn",
  PENDING_APPROVAL: "Chờ phê duyệt",
  SCHEDULED: "Đã lên lịch",
  SKIPPED: "Đã hoãn",
};

export const biologicalLevelLabels: Record<BiologicalLevel, string> = {
  BIOLOGICAL: "Sinh học",
  CHEMICAL: "Hóa chất",
  FULLY_BIOLOGICAL: "Sinh học hoàn toàn",
  LOW_RISK: "Rủi ro thấp",
  PROHIBITED: "Bị cấm",
  RESTRICTED_CHEMICAL: "Hóa chất hạn chế",
  UNKNOWN: "Chưa rõ",
};

export const harvestBatchStatusLabels: Record<HarvestBatchStatus, string> = {
  APPROVED: "Đã duyệt",
  BLOCKED: "Bị chặn",
  CANCELLED: "Đã hủy",
  DRAFT: "Nháp",
  HARVESTED: "Đã thu hoạch",
};

export const exportReleaseStatusLabels: Record<ExportReleaseStatus, string> = {
  APPROVED: "Đã duyệt",
  BLOCKED: "Bị chặn",
  DRAFT: "Nháp",
  RECALLED: "Đã thu hồi",
  RELEASED: "Đã phát hành",
  UNDER_REVIEW: "Đang duyệt",
  WAITING_FOR_LAB_RESULT: "Chờ kiểm nghiệm",
};

export const riskLevelLabels: Record<RiskLevel, string> = {
  CRITICAL: "Rất cao",
  HIGH: "Cao",
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  UNKNOWN: "Chưa rõ",
};

export const activityTypes = Object.keys(activityTypeLabels) as ActivityType[];

export const activeStatuses: ActivityStatus[] = [
  "DRAFT",
  "SCHEDULED",
  "PENDING_APPROVAL",
  "APPROVED",
  "IN_PROGRESS",
];

export const closedStatuses: ActivityStatus[] = ["COMPLETED", "SKIPPED", "CANCELLED"];

export function isClosedActivityStatus(status: ActivityStatus) {
  return closedStatuses.includes(status);
}

export function getActivityStatusTone(status: ActivityStatus) {
  if (status === "COMPLETED" || status === "APPROVED") return "success";
  if (status === "OVERDUE" || status === "CANCELLED") return "danger";
  if (status === "PENDING_APPROVAL" || status === "IN_PROGRESS") return "warning";
  return "neutral";
}

export function getHarvestStatusTone(status: HarvestBatchStatus) {
  if (status === "HARVESTED" || status === "APPROVED") return "success";
  if (status === "BLOCKED" || status === "CANCELLED") return "danger";
  return "neutral";
}

export function getExportStatusTone(status: ExportReleaseStatus) {
  if (status === "RELEASED" || status === "APPROVED") return "success";
  if (status === "BLOCKED" || status === "RECALLED") return "danger";
  if (status === "UNDER_REVIEW" || status === "WAITING_FOR_LAB_RESULT") return "warning";
  return "neutral";
}
