const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const ts = require("typescript");

function loadSeries() {
  const source = readFileSync(join(__dirname, "../src/features/iot/sensorSeries.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const module = { exports: {} };
  new Function("module", "exports", "require", outputText)(module, module.exports, () => ({}));
  return module.exports;
}

const reading = (at, extra = {}) => ({
  deviceUid: "esp32-01", humidity: 70, id: at, light: null, measuredAt: at, receivedAt: at,
  temperature: 30, units: {}, ...extra,
});

test("time ranges match the Web dashboard (Vietnam calendar)", () => {
  const s = loadSeries();
  assert.deepEqual(s.SENSOR_RANGE_OPTIONS.map((o) => o.key), ["today", "24h", "7d", "month", "season"]);
  const now = new Date("2026-11-23T10:00:00.000Z"); // 17:00 in Vietnam
  assert.equal(s.historyQueryForRange("today", now).from, "2026-11-22T17:00:00.000Z");
  assert.equal(s.historyQueryForRange("7d", now).from, "2026-11-16T10:00:00.000Z");
  assert.equal(s.historyQueryForRange("season", now).from, s.SEASON_START);
  const october = s.historyQueryForRange("month", now, "2026-10");
  assert.equal(october.from, "2026-09-30T17:00:00.000Z");
  assert.equal(october.to, "2026-10-31T16:59:59.999Z");
  assert.deepEqual(s.seasonMonthOptions(now).map((m) => m.key), ["2026-11", "2026-10", "2026-09", "2026-08", "2026-07", "2026-06"]);
  assert.equal(s.formatTimeLabel("2026-11-23T10:05:00.000Z", "24h"), "17:05");
  assert.equal(s.formatTimeLabel("2026-11-23T10:05:00.000Z", "7d"), "23/11");
});

test("raw readings are sorted, counted by soil status, and keep simulated values apart", () => {
  const s = loadSeries();
  const series = s.seriesFromReadings([
    reading("2026-11-23T02:00:00.000Z", { soilMoisture: 90 }),
    reading("2026-11-23T01:00:00.000Z", { soilMoisture: 50, source: "SYNTHETIC_BACKFILL" }),
    reading("2026-11-23T03:00:00.000Z", { soil_moisture: 70, status: "OPTIMAL" }),
  ]);
  assert.deepEqual(series.points.map((p) => p.at), ["2026-11-23T01:00:00.000Z", "2026-11-23T02:00:00.000Z", "2026-11-23T03:00:00.000Z"]);
  assert.deepEqual(series.statusCounts, { DRY_WARNING: 1, OPTIMAL: 1, WET_WARNING: 1 });
  assert.equal(series.syntheticCount, 1);
  assert.equal(series.points[0].temperature, null);
  assert.equal(series.points[0].syntheticTemperature, 30);
  assert.equal(series.points[2].soilMoisture, 70);
});

test("bucketed history fills empty slots as gaps and never averages simulated with measured", () => {
  const s = loadSeries();
  const status = { DRY_WARNING: 0, OPTIMAL: 2, WET_WARNING: 0 };
  const series = s.seriesFromBuckets([
    { bucketStart: "2026-11-01T00:00:00.000Z", bucketEnd: "", count: 2, humidity: 80, light: null, soilMoisture: 70, soilStatusCounts: status, source: "DEVICE", temperature: 29 },
    { bucketStart: "2026-11-01T00:00:00.000Z", bucketEnd: "", count: 3, humidity: 60, light: null, soilMoisture: null, soilStatusCounts: status, source: "SYNTHETIC_BACKFILL", temperature: 31 },
    { bucketStart: "2026-11-03T00:00:00.000Z", bucketEnd: "", count: 1, humidity: 75, light: null, soilMoisture: 65, soilStatusCounts: status, source: "DEVICE", temperature: 28 },
  ], 86400);
  assert.equal(series.points.length, 3);
  assert.equal(series.points[0].temperature, 29);
  assert.equal(series.points[0].syntheticTemperature, 31);
  assert.equal(series.points[1].temperature, null);
  assert.equal(series.sampleCount, 6);
  assert.equal(series.syntheticCount, 3);
});

test("mobile sensor screen shows the range dashboard instead of the fixed 288-sample chart", () => {
  const screen = readFileSync(join(__dirname, "../src/features/iot/DurianClimateMonitorScreen.tsx"), "utf8");
  assert.ok(screen.includes("<SensorAnalytics"));
  assert.doesNotMatch(screen, /HISTORY_LIMIT|TelemetryLineChart/);
  const charts = readFileSync(join(__dirname, "../src/features/iot/SensorAnalytics.tsx"), "utf8");
  assert.ok(charts.includes("iotApi.telemetryBuckets(deviceId, query)"));
  assert.ok(charts.includes("SENSOR_CHART_MODES.map"));
});

test("screens do not show API paths or backend jargon to farmers", () => {
  for (const file of [
    "src/features/iot/DurianClimateMonitorScreen.tsx",
    "src/features/dashboard/DurianOperationsScreen.tsx",
    "src/features/chat/DurianExpertChannel.tsx",
    "src/features/cultivation/DurianCultivationCalendarScreen.tsx",
    "src/features/cultivation/DurianFarmCatalogScreen.tsx",
  ]) {
    const source = readFileSync(join(__dirname, "..", file), "utf8");
    assert.doesNotMatch(source, /Nguồn:? ?(thật từ )?\/api|từ backend|trên backend|vào backend|endpoint care-history|Registry status|Telemetry state/, file);
  }
});

test("capped raw history switches to server averages instead of dropping the newest samples", () => {
  const charts = readFileSync(join(__dirname, "../src/features/iot/SensorAnalytics.tsx"), "utf8");
  assert.match(charts, /readings\.length >= HISTORY_PAGE_LIMIT && !bucketed/);
  assert.match(charts, /error instanceof AuthApiError && error\.status === 404/);
});
