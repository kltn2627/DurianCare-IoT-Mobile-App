import { getApiBaseUrl } from "./apiBase";

const PRESERVED_MEDIA_SCHEME = /^(?:https?|file|data|content):/i;
const AUTHENTICATED_MEDIA_PATH = /^\/api\/(?:community\/media|v1\/predict\/history\/images)\//i;

/**
 * Resolves service-relative media paths without altering URIs already owned by
 * the device, a data URI, or an external provider such as S3.
 */
export function resolveMediaUrl(value?: string | null) {
  const mediaUrl = value?.trim();
  if (!mediaUrl) return null;
  if (PRESERVED_MEDIA_SCHEME.test(mediaUrl)) return mediaUrl;

  const normalizedPath = mediaUrl.startsWith("/") ? mediaUrl : `/${mediaUrl}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

export function resolvePredictionHistoryImageUrl(historyId?: string | null) {
  const normalizedId = historyId?.trim();
  return normalizedId
    ? resolveMediaUrl(`/api/v1/predict/history/images/${encodeURIComponent(normalizedId)}`)
    : null;
}

/** True only for Gateway media routes whose response needs the user's bearer token. */
export function requiresGatewayMediaAuth(value?: string | null) {
  const resolvedUrl = resolveMediaUrl(value);
  if (!resolvedUrl) return false;

  try {
    return AUTHENTICATED_MEDIA_PATH.test(new URL(resolvedUrl).pathname);
  } catch {
    return AUTHENTICATED_MEDIA_PATH.test(resolvedUrl);
  }
}
