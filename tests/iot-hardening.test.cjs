const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const ts = require("typescript");

function load(relative) {
  const source = readFileSync(join(__dirname, "..", relative), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const module = { exports: {} };
  new Function("module", "exports", "require", outputText)(module, module.exports, require);
  return module.exports;
}

const { cameraStatusView } = load("src/features/camera/cameraStatus.ts");
const { soilMoistureText, soilSensorNote } = load("src/features/iot/soil.ts");
const { notificationSource, notificationTypeLabel } = load("src/features/notification/presentation.ts");

test("camera: only ONLINE previews; DEGRADED / OFFLINE explain why", () => {
  assert.equal(cameraStatusView({ status: "ONLINE" }).canPreview, true);
  const degraded = cameraStatusView({ status: "DEGRADED", lastError: "CAMERA_STREAM_FAILED" });
  assert.deepEqual([degraded.tone, degraded.canPreview], ["degraded", false]);
  assert.match(degraded.message, /không chụp được ảnh/);
  assert.equal(cameraStatusView({ status: "OFFLINE" }).canPreview, false);
  assert.equal(cameraStatusView(null).canPreview, false);
});

test("soil: an invalid or uncalibrated probe is never shown as a percentage", () => {
  assert.equal(soilMoistureText({ value: 55 }, { status: "OK" }), "55%");
  assert.equal(soilMoistureText(null, { status: "NO_SIGNAL" }), "Không có tín hiệu — kiểm tra dây cảm biến");
  assert.equal(soilMoistureText(null, { status: "UNCALIBRATED" }), "Chưa hiệu chuẩn");
  assert.equal(soilMoistureText(null, null), "—");
  assert.equal(soilSensorNote("OK"), null);
});

test("notifications: Vietnamese type label and source device instead of internal id", () => {
  assert.equal(notificationTypeLabel("DEVICE"), "Thiết bị IoT");
  assert.equal(notificationSource({ metadata: { deviceUid: "esp32-01" } }), "Thiết bị esp32-01");
  assert.equal(notificationSource({ metadata: null }), null);
});

test("notification screens use in-app confirmation + toast, guard double taps, no native Alert", () => {
  for (const file of ["src/features/notification/DurianNotificationInboxScreen.tsx", "src/features/notification/NotificationDetailScreen.tsx"]) {
    const source = readFileSync(join(__dirname, "..", file), "utf8");
    assert.doesNotMatch(source, /Alert\.alert/, file);
    assert.match(source, /<ConfirmModal/, file);
    assert.match(source, /<ToastBanner/, file);
    assert.match(source, /busyRef\.current/, file);
    assert.doesNotMatch(source, /console\.log/, file);
  }
  const inbox = readFileSync(join(__dirname, "../src/features/notification/DurianNotificationInboxScreen.tsx"), "utf8");
  assert.match(inbox, /Xác nhận đánh dấu tất cả đã đọc/);
  assert.match(inbox, /Đã đánh dấu tất cả thông báo là đã đọc\./);
  assert.match(inbox, /Không thể cập nhật thông báo\. Vui lòng thử lại\./);
});
