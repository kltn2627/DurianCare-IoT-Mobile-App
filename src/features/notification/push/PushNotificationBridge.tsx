import { type Href, useRootNavigationState, useRouter, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { isPendingApproval, isRejected } from "@/src/features/auth/authTypes";
import { useSession } from "@/src/session/SessionContext";

import { notificationClient } from "../notificationApi";
import { resolveNotificationTarget } from "../notificationTargetResolver";
import type { NotificationItem } from "../types";

import { createResponseDeduper, pushDataToNotificationItem, readPushData } from "./pushPayload";
import { emitPushReceived, pushNotifications, pushRegistration } from "./pushRuntime";

const AUTH_SEGMENTS = ["login", "register", "verify-otp"];

/** Connects native push events to the session and the router. Renders nothing. */
export function PushNotificationBridge() {
  const router = useRouter();
  const segments = useSegments() as readonly string[];
  const rootNavigationState = useRootNavigationState();
  const { isRestoring, session } = useSession();
  const userId = session?.user.id ?? null;
  const accountStatus = session?.user.accountStatus;
  const [tapped, setTapped] = useState<NotificationItem | null>(null);
  const isFirstDelivery = useRef(createResponseDeduper()).current;

  useEffect(
    function connectNativeEvents() {
      const notifications = pushNotifications();
      if (!notifications) return;

      // Only foreground messages come through here; in the background Android shows them itself, so each
      // push is displayed exactly once.
      notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      function acceptResponse(response: Parameters<typeof readPushData>[0]) {
        const data = readPushData(response);
        if (!response || !data || !isFirstDelivery(response, data)) return;
        setTapped(pushDataToNotificationItem(data));
      }

      const tokenSubscription = notifications.addPushTokenListener((token) => {
        if (typeof token.data === "string") void pushRegistration.onTokenRefreshed(token.data);
      });
      const receivedSubscription = notifications.addNotificationReceivedListener(emitPushReceived);
      const responseSubscription = notifications.addNotificationResponseReceivedListener(acceptResponse);
      const appStateSubscription = AppState.addEventListener("change", (state) => {
        if (state === "active") void pushRegistration.onForeground();
      });

      // The tap that launched a terminated app happened before this listener existed.
      acceptResponse(notifications.getLastNotificationResponse());
      notifications.clearLastNotificationResponse();

      return () => {
        tokenSubscription.remove();
        receivedSubscription.remove();
        responseSubscription.remove();
        appStateSubscription.remove();
      };
    },
    [isFirstDelivery],
  );

  useEffect(
    function followSession() {
      if (isRestoring) return;
      if (userId) {
        void pushRegistration.onSessionStarted(userId);
        return;
      }
      setTapped(null);
      void pushRegistration.onSessionEnded();
    },
    [isRestoring, userId],
  );

  const onAppRoute = segments.length > 0 && !AUTH_SEGMENTS.includes(segments[0]);
  const canOpenTarget =
    !isRestoring &&
    Boolean(userId) &&
    Boolean(rootNavigationState?.key) &&
    onAppRoute &&
    !isPendingApproval(accountStatus) &&
    !isRejected(accountStatus);

  useEffect(
    function openTappedNotification() {
      if (!tapped || !canOpenTarget) return;
      setTapped(null);
      void notificationClient.markRead(tapped.id).catch(() => undefined);
      const target = resolveNotificationTarget(tapped);
      // After the commit, so the session gate's own redirect from the launch route lands first.
      const timer = setTimeout(() => {
        router.push({ pathname: target.pathname, params: target.params } as Href);
      }, 0);
      return () => clearTimeout(timer);
    },
    [canOpenTarget, router, tapped],
  );

  return null;
}
