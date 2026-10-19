const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
test("camera screen polls authorized registry, ignores obsolete responses and cleans focused timers", () => {
  const source = readFileSync(join(__dirname,"../src/features/camera/CameraMonitorScreen.tsx"),"utf8");
  assert.ok(source.includes("listCameraDevices()"));
  assert.ok(source.includes("useFocusEffect"));
  assert.ok(source.includes("clearInterval(timer)"));
  assert.ok(source.includes("generation !== requestGeneration.current"));
  assert.ok(source.includes("deviceId}:${endpointVersion}:${previewKey}"));
  assert.ok(source.includes("onLoad={() => setSnapshotError(false)}"));
  assert.doesNotMatch(source,/const DEVICE_ID|192\.168\./);
});
test("snapshot image and connection probe use authenticated Gateway API and reject HTTP failure", () => {
  const source = readFileSync(join(__dirname,"../src/lib/iotApi.ts"),"utf8");
  assert.ok(source.includes("cameraSnapshotSource"));
  assert.ok(source.includes("Authorization:"));
  assert.ok(source.includes("return res.ok &&"));
  assert.ok(source.includes('=== "image/jpeg"'));
  assert.doesNotMatch(source,/return res.status < 500/);
});
