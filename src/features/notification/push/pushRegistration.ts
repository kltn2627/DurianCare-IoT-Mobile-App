export type PushPermission = "granted" | "denied" | "undetermined";

export type RegisterDeviceBody = {
  appVersion?: string;
  deviceId: string;
  platform: "ANDROID";
  token: string;
};

export type PushRegistrationDeps = {
  appVersion: () => string | null;
  clearTray: () => Promise<void>;
  deleteNativeToken: () => Promise<void>;
  ensureChannel: () => Promise<void>;
  getDeviceId: () => Promise<string>;
  getPermission: () => Promise<PushPermission>;
  getToken: () => Promise<string>;
  isSupported: () => boolean;
  registerDevice: (body: RegisterDeviceBody) => Promise<void>;
  requestPermission: () => Promise<PushPermission>;
  unregisterDevice: (deviceId: string) => Promise<void>;
};

const LOGOUT_UNREGISTER_TIMEOUT_MS = 4_000;

/**
 * Keeps the backend's view of this phone in step with the session. Native-free so it can be tested.
 *
 * Steps run one at a time: a logout followed straight away by another account's login must finish deleting
 * the old token before the next one is requested. Nothing here throws to the caller, because push is never
 * allowed to break login or logout; a failed registration is simply tried again when the app next returns
 * to the foreground.
 */
export function createPushRegistration(deps: PushRegistrationDeps) {
  let currentUserId: string | null = null;
  let queue: Promise<unknown> = Promise.resolve();

  function enqueue(step: () => Promise<void>) {
    const next = queue.then(step).catch(() => undefined);
    queue = next;
    return next;
  }

  async function send(token: string) {
    const appVersion = deps.appVersion();
    await deps.registerDevice({
      deviceId: await deps.getDeviceId(),
      platform: "ANDROID",
      token,
      ...(appVersion ? { appVersion } : {}),
    });
  }

  async function sync(mayPrompt: boolean) {
    if (!currentUserId) return;
    // Android 13+ only shows the permission prompt once a channel exists.
    await deps.ensureChannel();
    let permission = await deps.getPermission();
    if (permission !== "granted" && mayPrompt) permission = await deps.requestPermission();
    if (permission !== "granted") return;
    const token = await deps.getToken();
    if (currentUserId) await send(token);
  }

  return {
    /** A session exists: ask for permission if needed and bind this phone to the user. */
    onSessionStarted(userId: string) {
      if (!deps.isSupported()) return Promise.resolve();
      currentUserId = userId;
      return enqueue(() => sync(true));
    },

    /** Back from settings or from the background: catches a newly granted permission or a failed attempt. */
    onForeground() {
      if (!deps.isSupported() || !currentUserId) return Promise.resolve();
      return enqueue(() => sync(false));
    },

    onTokenRefreshed(token: string) {
      if (!deps.isSupported() || !currentUserId) return Promise.resolve();
      return enqueue(async () => {
        if (currentUserId) await send(token);
      });
    },

    /** Must run before the auth logout: afterwards the access token is revoked and this call would be 401. */
    unregisterBeforeLogout() {
      if (!deps.isSupported() || !currentUserId) return Promise.resolve();
      return enqueue(async () => {
        const deviceId = await deps.getDeviceId();
        await Promise.race([
          deps.unregisterDevice(deviceId),
          new Promise<void>((resolve) => setTimeout(resolve, LOGOUT_UNREGISTER_TIMEOUT_MS)),
        ]);
      });
    },

    /**
     * No session (logout, expiry, revoked refresh token). Deleting the native token is what covers the cases
     * the API call cannot: an expired session or a logout without network. FCM then reports the old token as
     * UNREGISTERED and the backend retires it, so the previous account stops reaching this phone.
     */
    onSessionEnded() {
      if (!deps.isSupported()) return Promise.resolve();
      currentUserId = null;
      return enqueue(async () => {
        await Promise.allSettled([deps.deleteNativeToken(), deps.clearTray()]);
      });
    },
  };
}
