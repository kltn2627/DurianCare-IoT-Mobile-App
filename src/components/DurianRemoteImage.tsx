import { useEffect, useMemo, useState } from "react";
import { Image, type ImageProps, type ImageSourcePropType } from "react-native";

import { loadAuthTokens } from "@/src/features/auth/authTokenStore";
import { requiresGatewayMediaAuth, resolveMediaUrl } from "@/src/lib/mediaUrl";

type DurianRemoteImageProps = Omit<ImageProps, "source"> & {
  /** Identifies the surface in development-only image failure diagnostics. */
  feature?: string;
  uri?: string | null;
};

type MediaFailureClassification =
  | "URL_RESOLUTION"
  | "AUTH"
  | "404"
  | "CONTENT_TYPE"
  | "NETWORK"
  | "RENDER"
  | "UNKNOWN";

function classifyMediaFailure(error: string | undefined): MediaFailureClassification {
  const message = error?.toLowerCase() ?? "";
  if (/(401|403|unauthori[sz]ed|forbidden)/.test(message)) return "AUTH";
  if (/(404|not found)/.test(message)) return "404";
  if (/(content[- ]?type|mime|unsupported format)/.test(message)) return "CONTENT_TYPE";
  if (/(network|offline|internet|timed out|timeout|connection)/.test(message)) return "NETWORK";
  if (/(decode|render|image)/.test(message)) return "RENDER";
  return "UNKNOWN";
}

/**
 * One image entry point for API media. It keeps external/device URIs intact and
 * supplies authorization only to the Gateway media endpoints that require it.
 */
export function DurianRemoteImage({
  feature = "remote-image",
  onError,
  uri,
  ...props
}: DurianRemoteImageProps) {
  const resolvedUri = resolveMediaUrl(uri);
  const needsAuth = requiresGatewayMediaAuth(resolvedUri);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(needsAuth);

  useEffect(() => {
    let active = true;
    if (!needsAuth) {
      setAccessToken(null);
      setLoadingToken(false);
      return () => {
        active = false;
      };
    }

    setLoadingToken(true);
    void loadAuthTokens()
      .then((tokens) => {
        if (active) setAccessToken(tokens?.accessToken ?? null);
      })
      .catch(() => {
        if (active) setAccessToken(null);
      })
      .finally(() => {
        if (active) setLoadingToken(false);
      });

    return () => {
      active = false;
    };
  }, [needsAuth]);

  const source = useMemo<ImageSourcePropType | undefined>(() => {
    if (!resolvedUri || loadingToken || (needsAuth && !accessToken)) return undefined;
    return needsAuth
      ? { headers: { Authorization: `Bearer ${accessToken}` }, uri: resolvedUri }
      : { uri: resolvedUri };
  }, [accessToken, loadingToken, needsAuth, resolvedUri]);

  if (!source) return null;

  return (
    <Image
      {...props}
      onError={(event) => {
        if (__DEV__) {
          const nativeError = event.nativeEvent.error;
          console.warn("[MOBILE_MEDIA] image load failed", {
            classification: !resolvedUri ? "URL_RESOLUTION" : classifyMediaFailure(nativeError),
            contentType: undefined,
            feature,
            httpStatus: undefined,
            nativeError,
            originalUrl: uri ?? null,
            requiresAuth: needsAuth,
            resolvedUrl: resolvedUri ?? null,
          });
        }
        onError?.(event);
      }}
      source={source}
    />
  );
}
