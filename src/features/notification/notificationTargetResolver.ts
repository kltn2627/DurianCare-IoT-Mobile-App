import type { NotificationItem } from "./types";

type TargetRoute =
  | "/(main)"
  | "/(main)/authorization"
  | "/(main)/calendar"
  | "/(main)/chat"
  | "/(main)/community/[postId]"
  | "/(main)/knowledge/[slug]"
  | "/(main)/knowledge/review"
  | "/(main)/notifications"
  | "/(main)/scanner"
  | "/(main)/sensors"
  | "/(main)/traceability"
  | "/diagnosis-history"
  | "/diagnosis-result"
  | "/notification-detail";

export type NotificationTargetResolution = {
  fallback?: boolean;
  label: string;
  params?: Record<string, string>;
  pathname: TargetRoute;
  reason: string;
};

export const SUPPORTED_NOTIFICATION_TARGETS = [
  "chat conversation",
  "community post",
  "knowledge article/review",
  "farm authorization",
  "cultivation calendar/activity",
  "IoT device/alert",
  "AI diagnosis",
  "harvest/export traceability",
] as const;

export function resolveNotificationTarget(
  notification: NotificationItem,
): NotificationTargetResolution {
  const metadata = normalizeMetadata(notification.metadata);
  const type = notification.type.toUpperCase();
  const targetUrl = readString(metadata, ["targetUrl", "url", "path"]);
  const webTarget = resolveKnownWebTarget(targetUrl, notification.id);
  if (webTarget) return webTarget;

  const conversationId = readString(metadata, ["conversationId", "chatConversationId", "threadId"]);
  if (conversationId || hasAny(metadata, ["peerUserId", "peerPhoneNumber", "engineerPhoneNumber", "farmerPhoneNumber"])) {
    return {
      label: "Mở hội thoại",
      params: compactParams({
        conversationId,
        peerPhone: readString(metadata, ["peerPhoneNumber", "engineerPhoneNumber", "farmerPhoneNumber"]),
        peerUserId: readString(metadata, ["peerUserId"]),
      }),
      pathname: "/(main)/chat",
      reason: "metadata chat",
    };
  }

  const postId = readString(metadata, ["postId", "communityPostId"]);
  if (postId) {
    return {
      label: "Mở bài cộng đồng",
      params: { postId },
      pathname: "/(main)/community/[postId]",
      reason: "metadata community post",
    };
  }

  const slug = readString(metadata, ["slug", "articleSlug", "knowledgeSlug"]);
  if (slug) {
    return {
      label: "Mở bài kiến thức",
      params: { slug },
      pathname: "/(main)/knowledge/[slug]",
      reason: "metadata knowledge slug",
    };
  }

  if (
    hasAny(metadata, ["knowledgeId", "articleId", "reviewId"]) ||
    type.includes("KNOWLEDGE")
  ) {
    return {
      label: "Mở duyệt kiến thức",
      params: compactParams({ id: readString(metadata, ["knowledgeId", "articleId", "reviewId"]) }),
      pathname: "/(main)/knowledge/review",
      reason: "metadata knowledge review",
    };
  }

  if (
    hasAny(metadata, ["authorizationId", "invitationId", "farmAuthorizationId", "agronomistInvitationId"]) ||
    type === "EXPERT"
  ) {
    return {
      label: "Mở ủy quyền vườn",
      params: compactParams({
        authorizationId: readString(metadata, ["authorizationId", "farmAuthorizationId"]),
        farmId: readString(metadata, ["farmId"]),
        invitationId: readString(metadata, ["invitationId", "agronomistInvitationId"]),
      }),
      pathname: "/(main)/authorization",
      reason: "metadata farm authorization",
    };
  }

  if (
    hasAny(metadata, ["alertId", "deviceId", "deviceUid", "sensorId"]) ||
    type === "DEVICE" ||
    type === "WEATHER"
  ) {
    return {
      label: "Mở cảm biến IoT",
      params: compactParams({
        alertId: readString(metadata, ["alertId"]),
        deviceId: readString(metadata, ["deviceId"]),
        deviceUid: readString(metadata, ["deviceUid"]),
        farmId: readString(metadata, ["farmId"]),
      }),
      pathname: "/(main)/sensors",
      reason: "metadata IoT/weather",
    };
  }

  const diagnosisId = readString(metadata, ["diagnosisId", "predictionId", "entryId"]);
  if (diagnosisId) {
    return {
      label: "Mở kết quả chẩn đoán",
      params: { entryId: diagnosisId },
      pathname: "/diagnosis-result",
      reason: "metadata diagnosis",
    };
  }

  if (type === "DISEASE") {
    return {
      label: "Mở lịch sử chẩn đoán",
      pathname: "/diagnosis-history",
      reason: "notification type disease",
    };
  }

  if (hasAny(metadata, ["activityId", "planId", "cultivationPlanId", "cultivationActivityId"])) {
    return {
      label: "Mở lịch chăm sóc",
      params: compactParams({
        activityId: readString(metadata, ["activityId", "cultivationActivityId"]),
        planId: readString(metadata, ["planId", "cultivationPlanId"]),
      }),
      pathname: "/(main)/calendar",
      reason: "metadata cultivation",
    };
  }

  if (hasAny(metadata, ["exportReleaseId", "releaseId", "harvestBatchId", "traceabilityId"])) {
    return {
      label: "Mở truy xuất",
      params: compactParams({
        exportReleaseId: readString(metadata, ["exportReleaseId", "releaseId"]),
        harvestBatchId: readString(metadata, ["harvestBatchId"]),
      }),
      pathname: "/(main)/traceability",
      reason: "metadata harvest/export",
    };
  }

  return fallbackToDetail(notification.id, "missing supported metadata");
}

function resolveKnownWebTarget(
  targetUrl: string | undefined,
  notificationId: string,
): NotificationTargetResolution | null {
  if (!targetUrl) return null;
  const normalized = targetUrl.toLowerCase();
  if (normalized.includes("/dashboard/admin/knowledge") || normalized.includes("/knowledge/review")) {
    return {
      label: "Mở duyệt kiến thức",
      pathname: "/(main)/knowledge/review",
      reason: "metadata targetUrl knowledge review",
    };
  }
  if (normalized.includes("/community")) {
    return {
      label: "Mở cộng đồng",
      pathname: "/(main)/notifications",
      reason: "metadata targetUrl community without post id",
      fallback: true,
    };
  }
  if (normalized.includes("/authorization")) {
    return {
      label: "Mở ủy quyền vườn",
      pathname: "/(main)/authorization",
      reason: "metadata targetUrl authorization",
    };
  }
  if (normalized.includes("/iot") || normalized.includes("/sensor")) {
    return {
      label: "Mở cảm biến IoT",
      pathname: "/(main)/sensors",
      reason: "metadata targetUrl IoT",
    };
  }
  if (normalized.includes("/calendar") || normalized.includes("/cultivation")) {
    return {
      label: "Mở lịch chăm sóc",
      pathname: "/(main)/calendar",
      reason: "metadata targetUrl cultivation",
    };
  }
  if (normalized.includes("/traceability") || normalized.includes("/export")) {
    return {
      label: "Mở truy xuất",
      pathname: "/(main)/traceability",
      reason: "metadata targetUrl traceability",
    };
  }
  if (normalized.includes("/diagnosis")) {
    return {
      label: "Mở lịch sử chẩn đoán",
      pathname: "/diagnosis-history",
      reason: "metadata targetUrl diagnosis",
    };
  }
  return fallbackToDetail(notificationId, "unknown targetUrl");
}

function fallbackToDetail(id: string, reason: string): NotificationTargetResolution {
  return {
    fallback: true,
    label: "Xem chi tiết thông báo",
    params: { id },
    pathname: "/notification-detail",
    reason,
  };
}

function normalizeMetadata(metadata: NotificationItem["metadata"]) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata;
}

function readString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function hasAny(metadata: Record<string, unknown>, keys: string[]) {
  return keys.some((key) => {
    const value = metadata[key];
    return value !== undefined && value !== null && value !== "";
  });
}

function compactParams(params: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => typeof value === "string" && value.length > 0),
  ) as Record<string, string>;
}
