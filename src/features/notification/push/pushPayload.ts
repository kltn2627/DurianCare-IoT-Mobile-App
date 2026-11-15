import type { NotificationItem } from "../types";

/**
 * Reads the FCM payload built by the backend's PushMessageFactory (docs/FCM_API_MOBILE.md in the backend
 * repo). Pure so the tap behaviour can be tested without a device.
 */
export type PushData = Record<string, string>;

/** Envelope fields; everything else in the payload is navigation metadata. */
const ENVELOPE_KEYS = new Set(["schemaVersion", "notificationId", "eventId", "eventType", "notificationType", "occurredAt"]);

type ResponseLike = {
  notification?: {
    request?: {
      content?: { data?: unknown };
      identifier?: string;
      trigger?: unknown;
    };
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toPushData(value: unknown): PushData | null {
  if (!isRecord(value) || typeof value.notificationId !== "string" || !value.notificationId) return null;
  const data: PushData = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") data[key] = item;
  }
  return data;
}

/**
 * The payload sits in content.data whichever way the app was opened: the launch intent extras (background,
 * terminated) and the FCM service (foreground) both end up there. trigger.remoteMessage is the fallback the
 * library documents for foreground messages.
 */
export function readPushData(response: ResponseLike | null | undefined): PushData | null {
  const request = response?.notification?.request;
  if (!request) return null;
  const direct = toPushData(request.content?.data);
  if (direct) return direct;
  const trigger = request.trigger;
  if (isRecord(trigger) && isRecord(trigger.remoteMessage)) return toPushData(trigger.remoteMessage.data);
  return null;
}

/** Shapes the payload like an inbox row so a tap goes through the same resolver as a tap in the inbox. */
export function pushDataToNotificationItem(data: PushData): NotificationItem {
  const metadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!ENVELOPE_KEYS.has(key)) metadata[key] = value;
  }
  return {
    createdAt: data.occurredAt ?? "",
    id: data.notificationId,
    isRead: false,
    message: "",
    metadata,
    title: "",
    type: data.notificationType ?? "GENERAL",
  };
}

/** One tap reaches JS twice on a cold start (last response + listener); only the first one counts. */
export function createResponseDeduper() {
  const seen = new Set<string>();
  return function isFirstDelivery(response: ResponseLike, data: PushData) {
    const key = response.notification?.request?.identifier || data.notificationId;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
}
