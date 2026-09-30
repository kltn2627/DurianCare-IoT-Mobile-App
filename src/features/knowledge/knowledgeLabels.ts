import type { KnowledgeStatus } from "./knowledgeTypes";

export const KNOWLEDGE_STATUS_LABELS: Record<KnowledgeStatus, string> = {
  DRAFT: "Bản nháp",
  REVIEW: "Chờ duyệt",
  PUBLISHED: "Đã duyệt",
  REJECTED: "Từ chối",
};

export const KNOWLEDGE_STATUS_COLORS: Record<KnowledgeStatus, { background: string; text: string }> = {
  DRAFT: { background: "#EEF0ED", text: "#66756E" },
  REVIEW: { background: "#FFF3D5", text: "#A26505" },
  PUBLISHED: { background: "#DDE9E1", text: "#2E5A44" },
  REJECTED: { background: "#FBE4DF", text: "#B84A3A" },
};

export const KNOWLEDGE_STATUS_FILTERS: Array<{ label: string; value: KnowledgeStatus | "ALL" }> = [
  { label: "Tất cả", value: "ALL" },
  { label: "Bản nháp", value: "DRAFT" },
  { label: "Chờ duyệt", value: "REVIEW" },
  { label: "Đã duyệt", value: "PUBLISHED" },
  { label: "Từ chối", value: "REJECTED" },
];

export function canWriteKnowledge(role?: string | null) {
  return role === "ADMIN" || role === "ENGINEER";
}

export function canReviewKnowledge(role?: string | null) {
  return role === "ADMIN";
}

export function canEditKnowledge(role: string | null | undefined, status: KnowledgeStatus) {
  return role === "ADMIN" || status === "DRAFT" || status === "REJECTED";
}

export function roleLabel(role?: string | null) {
  if (role === "ADMIN") return "Quản trị viên";
  if (role === "ENGINEER") return "Kỹ sư";
  if (role === "EXPERT") return "Chuyên gia";
  if (role === "FARMER") return "Nông hộ";
  return "Tác giả";
}
