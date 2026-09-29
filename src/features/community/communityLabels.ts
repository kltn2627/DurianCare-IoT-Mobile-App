import type { CommunityPostStatus, CommunityPostVisibility, CommunityReactionType } from "./communityTypes";

export const COMMUNITY_TOPICS = ["Tất cả", "Kỹ thuật trồng", "Sâu bệnh", "Dinh dưỡng", "Thị trường"];
export const COMMUNITY_POST_TOPICS = COMMUNITY_TOPICS.slice(1);

export const COMMUNITY_REACTIONS: Array<{ icon: string; label: string; type: CommunityReactionType }> = [
  { icon: "👍", label: "Thích", type: "LIKE" },
  { icon: "❤️", label: "Yêu thích", type: "LOVE" },
  { icon: "😮", label: "Bất ngờ", type: "WOW" },
  { icon: "😢", label: "Buồn", type: "SAD" },
  { icon: "😄", label: "Vui", type: "HAHA" },
];

export const COMMUNITY_STATUS_LABELS: Record<CommunityPostStatus, string> = {
  HIDDEN: "Đã ẩn",
  PUBLISHED: "Công khai",
  REPORTED: "Bị báo cáo",
};

export const COMMUNITY_VISIBILITY_LABELS: Record<CommunityPostVisibility, string> = {
  CONNECTIONS: "Kết nối",
  PUBLIC: "Công khai",
};

export function reactionIcon(type?: CommunityReactionType | null) {
  return COMMUNITY_REACTIONS.find((item) => item.type === type)?.icon ?? "👍";
}

export function canWriteCommunity(role?: string | null, accountStatus?: string | null) {
  return accountStatus === "ACTIVE" && (role === "ADMIN" || role === "ENGINEER" || role === "FARMER");
}

export function canModerateCommunity(role?: string | null) {
  return role === "ADMIN";
}
