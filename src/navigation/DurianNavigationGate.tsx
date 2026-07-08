import { type Href, useRootNavigationState, useRouter, useSegments } from "expo-router";
import { type ReactNode, useEffect, useRef } from "react";

import { useSession } from "@/src/session/SessionContext";

export function DurianNavigationGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const routeSegments = segments as readonly string[];
  const segmentKey = routeSegments.join("/");
  const rootNavigationState = useRootNavigationState();
  const { isRestoring, session } = useSession();
  const pendingTargetRef = useRef<string | null>(null);

  useEffect(
    function synchronizeSessionRouteAfterRootMount() {
      if (!rootNavigationState?.key || isRestoring) return;

      const firstSegment = routeSegments[0];
      const isAuthRoute = ["login", "register", "verify-otp"].includes(
        firstSegment ?? "",
      );
      const isRootRoute = routeSegments.length === 0;
      const isProtectedRoute = firstSegment === "(main)";
      const isOwnerOnlyRoute =
        isProtectedRoute && ["sensors", "authorization"].includes(routeSegments[1] ?? "");

      let target: string | null = null;

      if (!session && !isAuthRoute) {
        target = "/login";
      } else if (session && (isAuthRoute || isRootRoute)) {
        target = session.user.role === "ENGINEER" ? "/(main)/chat" : "/(main)";
      } else if (!session && isProtectedRoute) {
        target = "/login";
      } else if (session?.user.role === "ENGINEER" && isOwnerOnlyRoute) {
        target = "/(main)/chat";
      }

      if (!target || pendingTargetRef.current === target) return;
      pendingTargetRef.current = target;

      const timer = setTimeout(() => {
        router.replace(target as Href);
        pendingTargetRef.current = null;
      }, 0);

      return () => {
        clearTimeout(timer);
        pendingTargetRef.current = null;
      };
    },
    [isRestoring, rootNavigationState?.key, router, segmentKey, session],
  );

  return children;
}
