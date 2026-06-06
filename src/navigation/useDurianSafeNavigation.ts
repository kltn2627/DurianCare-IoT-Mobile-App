import { type Href, useRootNavigationState, useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";

export function useDurianSafeNavigation() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(function clearNavigationTimerOnUnmount() {
    return function clearTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const schedule = useCallback(
    function scheduleNavigation(action: () => void) {
      if (!rootNavigationState?.key) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(action, 0);
    },
    [rootNavigationState?.key],
  );

  const replace = useCallback(
    function replaceSafely(href: Href | string) {
      schedule(() => router.replace(href as Href));
    },
    [router, schedule],
  );

  const push = useCallback(
    function pushSafely(href: Href | string) {
      schedule(() => router.push(href as Href));
    },
    [router, schedule],
  );

  return {
    isNavigationReady: Boolean(rootNavigationState?.key),
    push,
    replace,
  };
}
