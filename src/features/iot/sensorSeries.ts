// Time ranges and chart series for the sensor dashboard. Same rules as the Web client
// (`src/lib/iot/ranges.ts` and `series.ts`), so both apps show the same numbers.
import type { IotTelemetryBucket, IotTelemetryReading } from "./types";

export type SensorTimeRange = "today" | "24h" | "7d" | "month" | "season";
export type SensorChartMode = "line" | "area" | "bar";

export const SENSOR_RANGE_OPTIONS: Array<{ key: SensorTimeRange; label: string; bucketed: boolean }> = [
  { key: "today", label: "Hôm nay", bucketed: false },
  { key: "24h", label: "24 giờ qua", bucketed: false },
  { key: "7d", label: "7 ngày qua", bucketed: false },
  // Long ranges exceed the raw-row cap, so they read server-side time buckets.
  { key: "month", label: "Theo tháng", bucketed: true },
  { key: "season", label: "Toàn vụ mùa", bucketed: true },
];

export const SENSOR_CHART_MODES: Array<{ key: SensorChartMode; label: string }> = [
  { key: "line", label: "Line" },
  { key: "area", label: "Area" },
  { key: "bar", label: "Bar" },
];

export const SEASON_START = "2026-06-01T00:00:00.000Z";
export const HISTORY_PAGE_LIMIT = 1000;
const OFFSET_MS = 7 * 60 * 60 * 1000; // Vietnam time, as on the Web

export type SoilStatusCounts = { DRY_WARNING: number; OPTIMAL: number; WET_WARNING: number };

/** Measured and simulated values live in separate fields so no point mixes the two. */
export type SensorChartPoint = {
  at: string;
  airHumidity: number | null;
  measuredCount: number;
  soilMoisture: number | null;
  syntheticAirHumidity: number | null;
  syntheticCount: number;
  syntheticTemperature: number | null;
  temperature: number | null;
};

export type SensorSeries = {
  bucketSeconds?: number;
  incomplete: boolean;
  points: SensorChartPoint[];
  resolution: "raw" | "bucketed";
  sampleCount: number;
  statusCounts: SoilStatusCounts;
  syntheticCount: number;
};

export const EMPTY_SERIES: SensorSeries = {
  incomplete: false, points: [], resolution: "raw", sampleCount: 0,
  statusCounts: { DRY_WARNING: 0, OPTIMAL: 0, WET_WARNING: 0 }, syntheticCount: 0,
};

/** `month` is "YYYY-MM" (Vietnam calendar); omitted means the current month. */
export function historyQueryForRange(range: SensorTimeRange, now = new Date(), month?: string) {
  const local = new Date(now.getTime() + OFFSET_MS);
  let from: Date;
  let to = now;
  if (range === "month" && month) {
    const [year, monthIndex] = parseMonthKey(month);
    from = new Date(Date.UTC(year, monthIndex, 1) - OFFSET_MS);
    const end = new Date(Date.UTC(year, monthIndex + 1, 1) - OFFSET_MS - 1);
    if (end.getTime() < now.getTime()) to = end;
    if (from.getTime() > now.getTime()) from = now;
  } else if (range === "today" || range === "month") {
    from = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(),
      range === "month" ? 1 : local.getUTCDate()) - OFFSET_MS);
  } else if (range === "24h" || range === "7d") {
    from = new Date(now.getTime() - (range === "24h" ? 1 : 7) * 86_400_000);
  } else {
    from = new Date(SEASON_START);
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Months of the season from June 2026 up to the current Vietnam month, newest first. */
export function seasonMonthOptions(now = new Date()) {
  const local = new Date(now.getTime() + OFFSET_MS);
  const options: Array<{ key: string; label: string }> = [];
  for (let year = 2026, month = 5; year < local.getUTCFullYear() || (year === local.getUTCFullYear() && month <= local.getUTCMonth());) {
    options.unshift({ key: `${year}-${String(month + 1).padStart(2, "0")}`, label: `Tháng ${month + 1}/${year}` });
    month += 1;
    if (month === 12) { month = 0; year += 1; }
  }
  return options;
}

export function currentMonthKey(now = new Date()) {
  const local = new Date(now.getTime() + OFFSET_MS);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
}

function parseMonthKey(month: string): [number, number] {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  const index = match ? Number(match[2]) - 1 : -1;
  if (!match || index < 0 || index > 11) throw new Error("Invalid month");
  return [Number(match[1]), index];
}

function pad(n: number) { return String(n).padStart(2, "0"); }

/** Axis label in Vietnam time: hours for short ranges, day/month for long ones. */
export function formatTimeLabel(value: string, range: SensorTimeRange, bucketSeconds?: number) {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return "--";
  const d = new Date(ms + OFFSET_MS);
  const hm = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  const dm = `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;
  if (range === "24h" || range === "today") return hm;
  if (bucketSeconds !== undefined && bucketSeconds < 86_400) return `${dm} ${hm}`;
  return dm;
}

export function bucketLabel(seconds: number) {
  if (seconds % 86_400 === 0) return `${seconds / 86_400} ngày`;
  if (seconds % 3_600 === 0) return `${seconds / 3_600} giờ`;
  return `${Math.round(seconds / 60)} phút`;
}

export function statusFromSoil(soilMoisture: number | null | undefined) {
  if (soilMoisture === null || soilMoisture === undefined) return null;
  if (soilMoisture < 60) return "DRY_WARNING" as const;
  if (soilMoisture > 85) return "WET_WARNING" as const;
  return "OPTIMAL" as const;
}

export function isSynthetic(reading: Pick<IotTelemetryReading, "source"> | null | undefined) {
  return reading?.source === "SYNTHETIC_BACKFILL";
}

export function soilMoistureOf(reading: IotTelemetryReading | null | undefined) {
  return reading?.soilMoisture ?? reading?.soil_moisture ?? null;
}

/** Evenly samples long histories so the phone draws at most `maxPoints` points. */
export function chartReadings<T>(rows: T[], maxPoints = 120): T[] {
  if (rows.length <= maxPoints) return rows;
  return Array.from({ length: maxPoints }, (_, i) => rows[Math.floor(i * (rows.length - 1) / (maxPoints - 1))]);
}

export function seriesFromReadings(readings: IotTelemetryReading[], incomplete = false): SensorSeries {
  const sorted = readings
    .filter((reading) => reading.measuredAt)
    .sort((a, b) => Date.parse(a.measuredAt!) - Date.parse(b.measuredAt!));
  const statusCounts: SoilStatusCounts = { DRY_WARNING: 0, OPTIMAL: 0, WET_WARNING: 0 };
  let syntheticCount = 0;
  for (const reading of sorted) {
    if (isSynthetic(reading)) syntheticCount += 1;
    const status = reading.status ?? statusFromSoil(soilMoistureOf(reading));
    if (status) statusCounts[status] += 1;
  }
  const points = chartReadings(sorted).map((reading): SensorChartPoint => {
    const synthetic = isSynthetic(reading);
    const humidity = reading.humidity ?? reading.air_humidity ?? null;
    return {
      at: reading.measuredAt!,
      airHumidity: synthetic ? null : humidity,
      measuredCount: synthetic ? 0 : 1,
      soilMoisture: soilMoistureOf(reading),
      syntheticAirHumidity: synthetic ? humidity : null,
      syntheticCount: synthetic ? 1 : 0,
      syntheticTemperature: synthetic ? reading.temperature : null,
      temperature: synthetic ? null : reading.temperature,
    };
  });
  return { incomplete, points, resolution: "raw", sampleCount: sorted.length, statusCounts, syntheticCount };
}

/** Joins the per-source buckets of one time slot into one point without averaging them together. */
export function seriesFromBuckets(buckets: IotTelemetryBucket[], bucketSeconds: number): SensorSeries {
  const statusCounts: SoilStatusCounts = { DRY_WARNING: 0, OPTIMAL: 0, WET_WARNING: 0 };
  const byStart = new Map<string, SensorChartPoint>();
  let sampleCount = 0;
  let syntheticCount = 0;
  for (const bucket of buckets) {
    sampleCount += bucket.count;
    statusCounts.DRY_WARNING += bucket.soilStatusCounts?.DRY_WARNING ?? 0;
    statusCounts.OPTIMAL += bucket.soilStatusCounts?.OPTIMAL ?? 0;
    statusCounts.WET_WARNING += bucket.soilStatusCounts?.WET_WARNING ?? 0;
    const point = byStart.get(bucket.bucketStart) ?? emptyPoint(bucket.bucketStart);
    // Anything not explicitly DEVICE is treated as simulated, never shown as a measurement.
    if (bucket.source !== "DEVICE") {
      syntheticCount += bucket.count;
      point.syntheticCount += bucket.count;
      point.syntheticTemperature = bucket.temperature;
      point.syntheticAirHumidity = bucket.humidity;
    } else {
      point.measuredCount += bucket.count;
      point.temperature = bucket.temperature;
      point.airHumidity = bucket.humidity;
      point.soilMoisture = bucket.soilMoisture;
    }
    byStart.set(bucket.bucketStart, point);
  }
  // Empty slots become explicit gaps, so no line bridges missing data.
  const starts = [...byStart.keys()].map(Date.parse);
  if (starts.length > 1 && bucketSeconds > 0) {
    for (let at = Math.min(...starts); at < Math.max(...starts); at += bucketSeconds * 1000) {
      const key = new Date(at).toISOString();
      if (!byStart.has(key)) byStart.set(key, emptyPoint(key));
    }
  }
  const points = [...byStart.values()].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return { bucketSeconds, incomplete: false, points, resolution: "bucketed", sampleCount, statusCounts, syntheticCount };
}

function emptyPoint(at: string): SensorChartPoint {
  return {
    at, airHumidity: null, measuredCount: 0, soilMoisture: null,
    syntheticAirHumidity: null, syntheticCount: 0, syntheticTemperature: null, temperature: null,
  };
}
