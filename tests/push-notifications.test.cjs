const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const ts = require("typescript");

// Runs the real TypeScript modules (they import no native code), not a copy of their logic.
function loadTs(relativePath) {
  const source = readFileSync(join(__dirname, "..", relativePath), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  new Function("module", "exports", "require", outputText)(module, module.exports, require);
  return module.exports;
}

const { createPushRegistration } = loadTs("src/features/notification/push/pushRegistration.ts");
const { createResponseDeduper, pushDataToNotificationItem, readPushData } = loadTs(
  "src/features/notification/push/pushPayload.ts",
);
const { resolveNotificationTarget } = loadTs("src/features/notification/notificationTargetResolver.ts");

function fakeDeps(overrides = {}) {
  const calls = [];
  let token = "token-1";
  const deps = {
    appVersion: () => "1.0.0",
    clearTray: async () => { calls.push("clearTray"); },
    deleteNativeToken: async () => { calls.push("deleteNativeToken"); token = "token-2"; },
    ensureChannel: async () => { calls.push("ensureChannel"); },
    getDeviceId: async () => "install-1",
    getPermission: async () => "granted",
    getToken: async () => token,
    isSupported: () => true,
    registerDevice: async (body) => { calls.push(["register", body.token, body.deviceId, body.platform]); },
    requestPermission: async () => { calls.push("requestPermission"); return "granted"; },
    unregisterDevice: async (id) => { calls.push(["unregister", id]); },
    ...overrides,
  };
  return { calls, deps };
}

const registers = (calls) => calls.filter((call) => Array.isArray(call) && call[0] === "register");

test("permission already granted: token goes to the backend without a prompt", async () => {
  const { calls, deps } = fakeDeps();
  await createPushRegistration(deps).onSessionStarted("user-a");
  assert.deepEqual(registers(calls), [["register", "token-1", "install-1", "ANDROID"]]);
  assert.ok(!calls.includes("requestPermission"));
});

test("the channel exists before the permission prompt (Android 13+)", async () => {
  const { calls, deps } = fakeDeps({ getPermission: async () => "undetermined" });
  await createPushRegistration(deps).onSessionStarted("user-a");
  assert.ok(calls.indexOf("ensureChannel") < calls.indexOf("requestPermission"));
  assert.equal(registers(calls).length, 1);
});

test("permission denied: nothing is registered and login is unaffected", async () => {
  const { calls, deps } = fakeDeps({
    getPermission: async () => "denied",
    requestPermission: async () => "denied",
  });
  await createPushRegistration(deps).onSessionStarted("user-a");
  assert.equal(registers(calls).length, 0);
});

test("permission granted later in settings registers on return to the app, without prompting", async () => {
  let permission = "denied";
  const { calls, deps } = fakeDeps({
    getPermission: async () => permission,
    requestPermission: async () => "denied",
  });
  const push = createPushRegistration(deps);
  await push.onSessionStarted("user-a");
  permission = "granted";
  await push.onForeground();
  assert.equal(registers(calls).length, 1);
});

test("a failed registration does not reject and is retried on foreground", async () => {
  let fail = true;
  const { calls, deps } = fakeDeps();
  const original = deps.registerDevice;
  deps.registerDevice = async (body) => {
    if (fail) throw new Error("network");
    await original(body);
  };
  const push = createPushRegistration(deps);
  await push.onSessionStarted("user-a");
  fail = false;
  await push.onForeground();
  assert.equal(registers(calls).length, 1);
});

test("Firebase missing from the build (getToken throws) leaves the app working", async () => {
  const { calls, deps } = fakeDeps({ getToken: async () => { throw new Error("Default FirebaseApp is not initialized"); } });
  await createPushRegistration(deps).onSessionStarted("user-a");
  assert.equal(registers(calls).length, 0);
});

test("token refresh is sent for the logged-in user and ignored when logged out", async () => {
  const { calls, deps } = fakeDeps();
  const push = createPushRegistration(deps);
  await push.onTokenRefreshed("ignored");
  await push.onSessionStarted("user-a");
  await push.onTokenRefreshed("token-refreshed");
  assert.deepEqual(registers(calls).map((call) => call[1]), ["token-1", "token-refreshed"]);
});

test("logout unregisters while the session is valid, then deletes the native token", async () => {
  const { calls, deps } = fakeDeps();
  const push = createPushRegistration(deps);
  await push.onSessionStarted("user-a");
  await push.unregisterBeforeLogout();
  await push.onSessionEnded();
  const unregisterAt = calls.findIndex((call) => Array.isArray(call) && call[0] === "unregister");
  assert.ok(unregisterAt >= 0 && unregisterAt < calls.indexOf("deleteNativeToken"));
  assert.ok(calls.includes("clearTray"));
});

test("logout succeeds when the unregister call fails or the server never answers", async () => {
  const { deps } = fakeDeps({ unregisterDevice: async () => { throw new Error("offline"); } });
  const push = createPushRegistration(deps);
  await push.onSessionStarted("user-a");
  await assert.doesNotReject(push.unregisterBeforeLogout());
});

test("logout then another account: the second user gets a fresh token, in order", async () => {
  const { calls, deps } = fakeDeps();
  const push = createPushRegistration(deps);
  await push.onSessionStarted("user-a");
  void push.unregisterBeforeLogout();
  void push.onSessionEnded();
  await push.onSessionStarted("user-b");
  assert.deepEqual(registers(calls).map((call) => call[1]), ["token-1", "token-2"]);
  assert.ok(calls.indexOf("deleteNativeToken") < calls.findLastIndex((call) => call[0] === "register"));
});

test("an expired session (no logout call) still deletes the native token", async () => {
  const { calls, deps } = fakeDeps();
  const push = createPushRegistration(deps);
  await push.onSessionStarted("user-a");
  await push.onSessionEnded();
  assert.ok(calls.includes("deleteNativeToken"));
  assert.ok(!calls.some((call) => Array.isArray(call) && call[0] === "unregister"));
});

test("a build without push support never touches native code", async () => {
  const { calls, deps } = fakeDeps({ isSupported: () => false });
  const push = createPushRegistration(deps);
  await push.onSessionStarted("user-a");
  await push.onForeground();
  await push.unregisterBeforeLogout();
  await push.onSessionEnded();
  assert.deepEqual(calls, []);
});

const response = (data, identifier = "msg-1") => ({
  notification: { request: { content: { data }, identifier, trigger: null } },
});

test("payload is read from content.data and from the FCM trigger fallback", () => {
  assert.equal(readPushData(response({ notificationId: "n1" })).notificationId, "n1");
  const viaTrigger = {
    notification: {
      request: { content: { data: null }, trigger: { remoteMessage: { data: { notificationId: "n2" } } } },
    },
  };
  assert.equal(readPushData(viaTrigger).notificationId, "n2");
});

test("a local or foreign notification without notificationId is ignored", () => {
  assert.equal(readPushData(response({ foo: "bar" })), null);
  assert.equal(readPushData(null), null);
});

test("Android launch extras keep working: google.* keys are carried but do not affect navigation", () => {
  const data = readPushData(response({
    "google.message_id": "0:1", notificationId: "n1", notificationType: "DEVICE", alertId: "7", deviceUid: "esp32-1",
  }));
  assert.equal(resolveNotificationTarget(pushDataToNotificationItem(data)).pathname, "/(main)/sensors");
});

const openFor = (data) => resolveNotificationTarget(pushDataToNotificationItem({ notificationId: "n1", ...data }));

test("each business event opens the same screen as tapping it in the inbox", () => {
  assert.equal(openFor({ notificationType: "DEVICE", eventType: "SOIL_MOISTURE_LOW", alertId: "7" }).pathname, "/(main)/sensors");
  assert.equal(openFor({ notificationType: "DEVICE", eventType: "TEMPERATURE_HIGH", deviceUid: "d" }).pathname, "/(main)/sensors");
  assert.equal(openFor({ notificationType: "DEVICE", eventType: "DEVICE_OFFLINE", deviceId: "d" }).pathname, "/(main)/sensors");
  assert.equal(openFor({ notificationType: "DISEASE", eventType: "DISEASE_DETECTED", diagnosisId: "d" }).pathname, "/diagnosis-result");
  assert.equal(openFor({ notificationType: "CARE", eventType: "CARE_FOLLOWUP", treeId: "t" }).pathname, "/(main)/trees/[treeId]");
  assert.equal(openFor({ notificationType: "EXPERT", authorizationId: "a" }).pathname, "/(main)/authorization");
});

test("a payload with nothing to route on falls back to the notification detail", () => {
  const target = openFor({ notificationType: "SYSTEM", eventType: "SYSTEM_ALERT" });
  assert.equal(target.pathname, "/notification-detail");
  assert.deepEqual(target.params, { id: "n1" });
});

test("one tap delivered twice on a cold start navigates once", () => {
  const isFirst = createResponseDeduper();
  const tap = response({ notificationId: "n1" }, "msg-1");
  assert.equal(isFirst(tap, { notificationId: "n1" }), true);
  assert.equal(isFirst(tap, { notificationId: "n1" }), false);
  assert.equal(isFirst(response({ notificationId: "n2" }, "msg-2"), { notificationId: "n2" }), true);
});

// Wiring that only exists on a device: asserted against the source so it cannot silently disappear.
test("logout calls the device unregister before the auth logout revokes the token", () => {
  const source = readFileSync(join(__dirname, "../src/session/SessionContext.tsx"), "utf8");
  const fn = source.slice(source.indexOf("async function logoutEverywhere"));
  assert.ok(fn.indexOf("pushRegistration.unregisterBeforeLogout()") < fn.indexOf("logoutRequest()"));
  assert.ok(fn.indexOf("pushRegistration.unregisterBeforeLogout()") > 0);
});

test("the native module stays out of Expo Go, web and iOS", () => {
  const source = readFileSync(join(__dirname, "../src/features/notification/push/pushRuntime.ts"), "utf8");
  assert.match(source, /Platform\.OS === "android" && Constants\.executionEnvironment !== ExecutionEnvironment\.StoreClient/);
  assert.doesNotMatch(source, /^import .* from "expo-notifications"/m);
});

test("the API client uses the backend's device-token routes and never sends a userId", () => {
  const source = readFileSync(join(__dirname, "../src/features/notification/notificationApi.ts"), "utf8");
  assert.match(source, /method: "PUT",\s*url: "\/api\/v1\/notification\/device-tokens"/);
  assert.match(source, /method: "DELETE",\s*url: `\/api\/v1\/notification\/device-tokens\/\$\{encodeURIComponent\(deviceId\)\}`/);
  const registration = readFileSync(join(__dirname, "../src/features/notification/push/pushRegistration.ts"), "utf8");
  assert.doesNotMatch(registration.slice(0, registration.indexOf("export type PushRegistrationDeps")), /userId/);
});

test("the Android channel agrees across app.json, runtime and the backend default", () => {
  const app = JSON.parse(readFileSync(join(__dirname, "../app.json"), "utf8"));
  const plugin = app.expo.plugins.find((entry) => Array.isArray(entry) && entry[0] === "expo-notifications");
  const runtime = readFileSync(join(__dirname, "../src/features/notification/push/pushRuntime.ts"), "utf8");
  assert.equal(plugin[1].defaultChannel, "duriancare-alerts");
  assert.ok(runtime.includes(`PUSH_CHANNEL_ID = "${plugin[1].defaultChannel}"`));
  assert.ok(app.expo.android.package);
});
