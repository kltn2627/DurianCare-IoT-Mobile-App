import { useEffect, useState } from "react";

import { normalizeAuthError } from "./authApi";

export function useAuthRateLimit() {
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);

  useEffect(
    function countDownRetryWindow() {
      if (retryAfterSeconds <= 0) return;
      const timer = setTimeout(
        () => setRetryAfterSeconds((current) => Math.max(0, current - 1)),
        1000,
      );
      return () => clearTimeout(timer);
    },
    [retryAfterSeconds],
  );

  function handleAuthError(error: unknown) {
    const normalized = normalizeAuthError(error);
    if (normalized.status === 429) {
      setRetryAfterSeconds(Math.max(1, normalized.retryAfterSeconds ?? 60));
    }
    return normalized.message;
  }

  return {
    handleAuthError,
    isRateLimited: retryAfterSeconds > 0,
    retryAfterSeconds,
    startCountdown: setRetryAfterSeconds,
  };
}
