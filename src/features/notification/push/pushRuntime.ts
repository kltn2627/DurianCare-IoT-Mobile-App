import Constants, { ExecutionEnvironment } from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { notificationClient } from "../notificationApi";

import { createPushRegistration, type PushPermission } from "./pushRegistration";

type NotificationsModule = typeof import("expo-notifications");

/** Must match FCM_ANDROID_CHANNEL_ID on the backend and defaultChannel in app.json. */
export const PUSH_CHANNEL_ID = "duriancare-alerts";

const DEVICE_ID_KEY = "duriancare.push-device-id";

let notificationsModule: NotificationsModule | null | undefined;

/**
 * Android builds only. Expo Go has no FCM since SDK 53 and web/iOS are not in scope, so the native module
 * is never loaded there and the rest of the app behaves as before.
 */
export function pushNotifications(): NotificationsModule | null {
  if (notificationsModule === undefined) {
    const supported =
      Platform.OS === "android" && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
    notificationsModule = supported ? (require("expo-notifications") as NotificationsModule) : null;
  }
  return notificationsModule;
}

function requireNotifications() {
  const notifications = pushNotifications();
  if (!notifications) throw new Error("Push notifications are not available in this build.");
  return notifications;
}

function toPermission(status: string): PushPermission {
  return status === "granted" || status === "denied" ? status : "undetermined";
}

function newDeviceId() {
  // Identifies an installation, not a secret: it only has to be unique among a user's phones.
  const random = () => Math.random().toString(36).slice(2, 12);
  return `${Date.now().toString(36)}-${random()}-${random()}`;
}

/** SecureStore rather than AsyncStorage: it is left out of Android backups, so a restore onto a new phone gets its own id. */
async function getDeviceId() {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = newDeviceId();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, created);
  return created;
}

export const pushRegistration = createPushRegistration({
  appVersion: () => Constants.expoConfig?.version ?? null,
  clearTray: () => requireNotifications().dismissAllNotificationsAsync(),
  deleteNativeToken: () => requireNotifications().unregisterForNotificationsAsync(),
  ensureChannel: async () => {
    const notifications = requireNotifications();
    await notifications.setNotificationChannelAsync(PUSH_CHANNEL_ID, {
      importance: notifications.AndroidImportance.HIGH,
      lightColor: "#2E5A44",
      name: "Cảnh báo DurianCare",
    });
  },
  getDeviceId,
  getPermission: async () => toPermission((await requireNotifications().getPermissionsAsync()).status),
  getToken: async () => (await requireNotifications().getDevicePushTokenAsync()).data as string,
  isSupported: () => pushNotifications() !== null,
  registerDevice: notificationClient.registerDevice,
  requestPermission: async () => toPermission((await requireNotifications().requestPermissionsAsync()).status),
  unregisterDevice: notificationClient.unregisterDevice,
});

type PushReceivedListener = () => void;

const receivedListeners = new Set<PushReceivedListener>();

/** Lets an open inbox pick up a push that arrived while the app is in the foreground. */
export function subscribePushReceived(listener: PushReceivedListener) {
  receivedListeners.add(listener);
  return () => {
    receivedListeners.delete(listener);
  };
}

export function emitPushReceived() {
  receivedListeners.forEach((listener) => listener());
}
