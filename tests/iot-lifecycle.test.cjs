const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const ts = require("typescript");

function loadLifecycleApi(calls) {
  const source = readFileSync(join(__dirname, "../src/features/iot/lifecycleApi.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const module = { exports: {} };
  const fakeRequire = (id) => {
    if (id === "@/src/features/auth/authApi") {
      return {
        authorizedRequest: async (config) => { calls.push(config); return { data: {} }; },
        normalizeAuthError: (error) => error,
      };
    }
    throw new Error(`unexpected import ${id}`);
  };
  new Function("module", "exports", "require", outputText)(module, module.exports, fakeRequire);
  return module.exports;
}

test("lifecycle API uses the same claim / config / rule contract as the Web client", async () => {
  const calls = [];
  const { iotLifecycleApi } = loadLifecycleApi(calls);
  await iotLifecycleApi.claimDevice({ deviceUid: "esp32-77", claimCode: "ABCDE-12345", farmId: "farm-1", cultivationAreaId: null, name: null });
  await iotLifecycleApi.saveConfig("dev 1", { publishIntervalSeconds: 30, alertsEnabled: true });
  await iotLifecycleApi.listRules("farm-1", "zone-a");
  await iotLifecycleApi.updateRule("rule-1", { enabled: false });
  assert.deepEqual(calls.map((c) => [c.method, c.url]), [
    ["POST", "/api/iot/devices/claim"],
    ["PUT", "/api/iot/devices/dev%201/config"],
    ["GET", "/api/iot/alert-rules?farmId=farm-1&cultivationAreaId=zone-a"],
    ["PATCH", "/api/iot/alert-rules/rule-1"],
  ]);
  assert.deepEqual(calls[0].data, { deviceUid: "esp32-77", claimCode: "ABCDE-12345", farmId: "farm-1", cultivationAreaId: null, name: null });
});

test("claim errors become Vietnamese messages and thresholds are validated before sending", () => {
  const { lifecycleMessage, validateRule } = loadLifecycleApi([]);
  const err = (status, message = "x") => Object.assign(new Error(message), { status });
  assert.match(lifecycleMessage(err(410), "f"), /hết hạn/);
  assert.match(lifecycleMessage(err(429), "f"), /sai mã quá nhiều lần/);
  assert.match(lifecycleMessage(err(409, "Device is already claimed"), "f"), /đã được kích hoạt/);
  assert.doesNotMatch(lifecycleMessage(err(500, "java.lang.NullPointerException"), "f"), /java/);
  assert.equal(lifecycleMessage(new Error("boom"), "fallback"), "fallback");
  assert.equal(validateRule("SOIL_MOISTURE", 55, 90, 3), null);
  assert.match(validateRule("HUMIDITY", 80, 70, 0), /nhỏ hơn/);
  assert.match(validateRule("HUMIDITY", null, null, 0), /ít nhất một ngưỡng/);
  assert.match(validateRule("HUMIDITY", 40, 50, 6), /Vùng đệm quá lớn/);
});

test("climate screen adds devices only with an activation code and shows device settings", () => {
  const screen = readFileSync(join(__dirname, "../src/features/iot/DurianClimateMonitorScreen.tsx"), "utf8");
  assert.ok(screen.includes("iotLifecycleApi.claimDevice({"));
  assert.doesNotMatch(screen, /iotApi\.registerDevice\(/, "no direct UID-only registration");
  assert.ok(screen.includes("Mã kích hoạt"));
  assert.ok(screen.includes("<IotDeviceSettingsCard"));
  assert.doesNotMatch(screen, /REAL API|sample chart|Registry \+ latest reading|farm catalog/);
  const card = readFileSync(join(__dirname, "../src/features/iot/IotDeviceSettingsCard.tsx"), "utf8");
  assert.ok(card.includes("DELIVERY_LABELS[config.deliveryStatus]"), "shows the real delivery state");
  assert.ok(card.includes("if (inFlight.current) return;"), "duplicate submits blocked");
});
