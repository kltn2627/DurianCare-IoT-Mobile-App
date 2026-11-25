// Sensor history dashboard: time ranges, line/area/bar charts and the soil-status breakdown,
// matching the Web "Cảm biến IoT" page. Drawn with react-native-svg (no chart library).
import { useFocusEffect } from "expo-router";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { durianTheme } from "@/src/theme/durianTheme";

import { AuthApiError } from "@/src/features/auth/authApi";

import { iotApi } from "./iotApi";
import {
  EMPTY_SERIES,
  HISTORY_PAGE_LIMIT,
  SENSOR_CHART_MODES,
  SENSOR_RANGE_OPTIONS,
  bucketLabel,
  currentMonthKey,
  formatTimeLabel,
  historyQueryForRange,
  seasonMonthOptions,
  seriesFromBuckets,
  seriesFromReadings,
  type SensorChartMode,
  type SensorChartPoint,
  type SensorSeries,
  type SensorTimeRange,
} from "./sensorSeries";

const REFRESH_MS = 30_000;
const CHART_HEIGHT = 190;
const COLORS = {
  temperature: "#D6A928",
  humidity: "#4b9666",
  soil: "#78966A",
  synTemperature: "#b9a35c",
  synHumidity: "#8fb39a",
  dry: "#D6A928",
  wet: "#477681",
  optimal: "#4b9666",
  grid: "#e8ece7",
  axis: "#7d8a82",
};

type ChartSeries = {
  key: keyof SensorChartPoint;
  color: string;
  label: string;
  dashed?: boolean;
  fill?: string;
};

async function loadSeries(deviceId: string, range: SensorTimeRange, month: string, now: Date): Promise<SensorSeries> {
  const query = historyQueryForRange(range, now, range === "month" ? month : undefined);
  const bucketed = SENSOR_RANGE_OPTIONS.find((option) => option.key === range)?.bucketed ?? false;
  if (bucketed) {
    const series = await loadBuckets(deviceId, query);
    if (series) return series;
  }
  const raw = await iotApi.telemetryHistory(deviceId, { ...query, limit: HISTORY_PAGE_LIMIT });
  const readings = Array.isArray(raw?.telemetry) ? raw.telemetry : [];
  // The gateway returns the oldest rows first, so a capped answer lacks the newest samples: use averages instead.
  if (readings.length >= HISTORY_PAGE_LIMIT && !bucketed) {
    const series = await loadBuckets(deviceId, query);
    if (series) return series;
  }
  return seriesFromReadings(readings, readings.length >= HISTORY_PAGE_LIMIT);
}

/** Null when the gateway predates the bucket endpoint (404); other failures are real errors. */
async function loadBuckets(deviceId: string, query: { from: string; to: string }): Promise<SensorSeries | null> {
  try {
    const response = await iotApi.telemetryBuckets(deviceId, query);
    if (!Array.isArray(response?.buckets) || !Number.isInteger(response.range?.bucketSeconds)) return null;
    return seriesFromBuckets(response.buckets, response.range.bucketSeconds);
  } catch (error) {
    if (error instanceof AuthApiError && error.status === 404) return null;
    throw error;
  }
}

export function SensorAnalytics({ deviceId, refreshKey }: { deviceId: string; refreshKey: number }) {
  const [range, setRange] = useState<SensorTimeRange>("24h");
  const [month, setMonth] = useState(() => currentMonthKey());
  const [climateMode, setClimateMode] = useState<SensorChartMode>("area");
  const [soilMode, setSoilMode] = useState<SensorChartMode>("bar");
  const [history, setHistory] = useState<SensorSeries>(EMPTY_SERIES);
  const [season, setSeason] = useState<SensorSeries>(EMPTY_SERIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const monthOptions = useMemo(() => seasonMonthOptions(), []);

  const load = useCallback(async (showLoading: boolean) => {
    if (!deviceId) return;
    const current = ++sequence.current;
    if (showLoading) setLoading(true);
    try {
      const now = new Date();
      const selected = loadSeries(deviceId, range, month, now);
      const [nextHistory, nextSeason] = await Promise.all([
        selected,
        range === "season" ? selected : loadSeries(deviceId, "season", month, now),
      ]);
      if (current !== sequence.current) return;
      setHistory(nextHistory);
      setSeason(nextSeason);
      setError(null);
    } catch (loadError) {
      if (current !== sequence.current) return;
      setError(loadError instanceof Error ? loadError.message : "Không thể tải lịch sử cảm biến.");
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, [deviceId, month, range]);

  useEffect(() => {
    setHistory(EMPTY_SERIES);
    void load(true);
  }, [load, refreshKey]);

  // Quiet refresh while the screen is open, like the Web page's polling.
  useFocusEffect(useCallback(() => {
    const timer = setInterval(() => void load(false), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]));

  const points = history.points;
  const hasSynthetic = points.some((point) => point.syntheticCount > 0);
  const labels = points.map((point) => formatTimeLabel(point.at, range, history.bucketSeconds));
  const climateSeries: ChartSeries[] = [
    { key: "temperature", color: COLORS.temperature, fill: "#fbf5d8", label: "Nhiệt độ °C" },
    { key: "airHumidity", color: COLORS.humidity, fill: "#dceadd", label: "Độ ẩm KK %" },
    ...(hasSynthetic ? [
      { key: "syntheticTemperature", color: COLORS.synTemperature, dashed: true, label: "Nhiệt độ (mô phỏng)" },
      { key: "syntheticAirHumidity", color: COLORS.synHumidity, dashed: true, label: "Độ ẩm KK (mô phỏng)" },
    ] as ChartSeries[] : []),
  ];
  const soilSeries: ChartSeries[] = [{ key: "soilMoisture", color: COLORS.soil, fill: "#dceadd", label: "Độ ẩm đất %" }];
  const status = [
    { color: COLORS.optimal, label: "Tối ưu (60–85%)", value: season.statusCounts.OPTIMAL },
    { color: COLORS.dry, label: "Khô (<60%)", value: season.statusCounts.DRY_WARNING },
    { color: COLORS.wet, label: "Úng (>85%)", value: season.statusCounts.WET_WARNING },
  ];

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {SENSOR_RANGE_OPTIONS.map((option) => (
          <Chip key={option.key} active={range === option.key} label={option.label} onPress={() => setRange(option.key)} />
        ))}
      </ScrollView>
      {range === "month" ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {monthOptions.map((option) => (
            <Chip key={option.key} active={month === option.key} label={option.label} outline onPress={() => setMonth(option.key)} />
          ))}
        </ScrollView>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <ChartHeader mode={climateMode} onChange={setClimateMode} title="NHIỆT ĐỘ & ĐỘ ẨM KHÔNG KHÍ" />
        <LegendRow series={climateSeries} />
        <ChartBody loading={loading} points={points}>
          {(width) => (
            <SeriesChart labels={labels} mode={climateMode} points={points} series={climateSeries} width={width}
              yDomain={climateMode === "line" ? undefined : [0, undefined]} gaps={history.resolution === "bucketed"} />
          )}
        </ChartBody>
      </View>

      <View style={styles.card}>
        <ChartHeader mode={soilMode} onChange={setSoilMode} title="ĐỘ ẨM ĐẤT & NGƯỠNG AN TOÀN" />
        <LegendRow series={soilSeries} extra={[{ color: COLORS.dry, label: "Khô <60%" }, { color: COLORS.wet, label: "Úng >85%" }]} />
        <ChartBody loading={loading} points={points}>
          {(width) => (
            <SeriesChart labels={labels} mode={soilMode} points={points} series={soilSeries} width={width}
              yDomain={[0, 100]} gaps={history.resolution === "bucketed"}
              thresholds={[{ value: 60, color: COLORS.dry }, { value: 85, color: COLORS.wet }]} />
          )}
        </ChartBody>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>PHÂN BỔ TRẠNG THÁI ĐỘ ẨM ĐẤT (TOÀN VỤ)</Text>
        {status.some((item) => item.value > 0) ? (
          <View style={styles.pieRow}>
            <Donut slices={status} size={132} />
            <View style={{ flex: 1, gap: 8 }}>
              {status.map((item) => (
                <View key={item.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.label}: {item.value} mẫu</Text>
                </View>
              ))}
            </View>
          </View>
        ) : <Text style={styles.empty}>Chưa có mẫu độ ẩm đất trong vụ mùa.</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>TÓM TẮT DỮ LIỆU ĐANG XEM</Text>
        <SummaryRow label="Số mẫu trong khoảng" value={`${history.sampleCount}`} />
        {history.syntheticCount > 0 ? <SummaryRow label="Trong đó dữ liệu mô phỏng" value={`${history.syntheticCount} mẫu`} /> : null}
        {history.resolution === "bucketed" && history.bucketSeconds
          ? <SummaryRow label="Điểm trên biểu đồ" value={`${points.length} (TB mỗi ${bucketLabel(history.bucketSeconds)})`} />
          : points.length < history.sampleCount ? <SummaryRow label="Điểm đại diện trên biểu đồ" value={`${points.length}`} /> : null}
        <SummaryRow label="Mẫu từ tháng 6/2026" value={`${season.sampleCount} mẫu`} />
        {history.incomplete || season.incomplete
          ? <Text style={styles.note}>Lịch sử bị giới hạn ở {HISTORY_PAGE_LIMIT} mẫu; biểu đồ chỉ tính các mẫu đã tải.</Text>
          : null}
        {hasSynthetic
          ? <Text style={styles.note}>Đường nét đứt là dữ liệu mô phỏng để lấp khoảng trống lịch sử, không phải số đo từ cảm biến.</Text>
          : null}
      </View>
    </View>
  );
}

function Chip({ active, label, onPress, outline }: { active: boolean; label: string; onPress: () => void; outline?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress}
      style={[styles.chip, active && (outline ? styles.chipOutlineActive : styles.chipActive)]}>
      <Text style={[styles.chipText, active && (outline ? styles.chipOutlineText : styles.chipTextActive)]}>{label}</Text>
    </Pressable>
  );
}

function ChartHeader({ mode, onChange, title }: { mode: SensorChartMode; onChange: (mode: SensorChartMode) => void; title: string }) {
  return (
    <View style={styles.chartHeader}>
      <Text style={[styles.cardTitle, { flex: 1 }]}>{title}</Text>
      <View style={styles.segment}>
        {SENSOR_CHART_MODES.map((item) => (
          <Pressable key={item.key} accessibilityRole="button" accessibilityState={{ selected: mode === item.key }}
            onPress={() => onChange(item.key)} style={[styles.segmentItem, mode === item.key && styles.segmentItemActive]}>
            <Text style={[styles.segmentText, mode === item.key && styles.segmentTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function LegendRow({ series, extra = [] }: { series: ChartSeries[]; extra?: Array<{ color: string; label: string }> }) {
  return (
    <View style={styles.legendRow}>
      {[...series.map((item) => ({ color: item.color, label: item.label, dashed: item.dashed })), ...extra].map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: item.color }, "dashed" in item && item.dashed ? styles.legendDashed : null]} />
          <Text style={styles.legendText}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function ChartBody({ children, loading, points }: {
  children: (width: number) => ReactNode; loading: boolean; points: SensorChartPoint[];
}) {
  const [width, setWidth] = useState(0);
  return (
    <View style={{ height: CHART_HEIGHT }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {loading && points.length === 0
        ? <View style={styles.center}><ActivityIndicator color={durianTheme.colors.moss} /></View>
        : points.length <= 1
          ? <View style={[styles.center, styles.emptyBox]}><Text style={styles.empty}>Chưa đủ dữ liệu trong khoảng thời gian đã chọn.</Text></View>
          : width > 0 ? children(width) : null}
    </View>
  );
}

function niceStep(span: number) {
  const raw = span / 4;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-6)));
  const normalized = raw / magnitude;
  return (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
}

function SeriesChart({
  gaps, labels, mode, points, series, thresholds = [], width, yDomain,
}: {
  gaps: boolean;
  labels: string[];
  mode: SensorChartMode;
  points: SensorChartPoint[];
  series: ChartSeries[];
  thresholds?: Array<{ value: number; color: string }>;
  width: number;
  /** [min, max]; an undefined end is fitted to the data. */
  yDomain?: [number | undefined, number | undefined];
}) {
  const left = 30, right = 6, top = 8, bottom = 22;
  const plotW = Math.max(10, width - left - right);
  const plotH = CHART_HEIGHT - top - bottom;
  const values = points.flatMap((point) => series.map((s) => point[s.key]))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const dataMin = values.length ? Math.min(...values) : 0;
  const dataMax = values.length ? Math.max(...values) : 1;
  let min = yDomain?.[0] ?? dataMin;
  let max = yDomain?.[1] ?? dataMax;
  if (yDomain?.[0] === undefined && yDomain?.[1] === undefined) {
    const pad = Math.max(1, (max - min) * 0.1);
    min -= pad; max += pad;
  }
  const step = niceStep(max - min || 1);
  min = Math.floor(min / step) * step;
  max = Math.ceil(max / step) * step;
  if (max <= min) max = min + step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Number(v.toFixed(6)));

  const n = points.length;
  const slot = plotW / n;
  const xAt = (i: number) => mode === "bar" ? left + slot * (i + 0.5) : left + (n === 1 ? plotW / 2 : (i * plotW) / (n - 1));
  const yAt = (v: number) => top + plotH - ((v - min) / (max - min)) * plotH;
  const baseY = yAt(Math.max(min, Math.min(max, 0)));

  // Bucketed views keep explicit gaps; raw views bridge single missing values.
  const segmentsOf = (key: keyof SensorChartPoint) => {
    const segments: Array<Array<[number, number]>> = [];
    let current: Array<[number, number]> = [];
    points.forEach((point, i) => {
      const value = point[key];
      if (typeof value === "number" && Number.isFinite(value)) current.push([xAt(i), yAt(value)]);
      else if (gaps && current.length) { segments.push(current); current = []; }
    });
    if (current.length) segments.push(current);
    return segments;
  };
  const linePath = (segment: Array<[number, number]>) => segment.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  const labelIdx = n <= 2 ? [0, n - 1] : [0, Math.floor((n - 1) / 2), n - 1];
  const barSeries = series.filter((s) => points.some((p) => typeof p[s.key] === "number"));
  const barW = Math.max(1, (slot * 0.8) / Math.max(1, barSeries.length));

  return (
    <Svg width={width} height={CHART_HEIGHT}>
      {ticks.map((tick) => (
        <G key={tick}>
          <Line x1={left} x2={width - right} y1={yAt(tick)} y2={yAt(tick)} stroke={COLORS.grid} strokeDasharray="4 4" />
          <SvgText x={left - 4} y={yAt(tick) + 3} fontSize="9" fill={COLORS.axis} textAnchor="end">{Math.round(tick * 10) / 10}</SvgText>
        </G>
      ))}
      {thresholds.map((t) => (
        <Line key={t.value} x1={left} x2={width - right} y1={yAt(t.value)} y2={yAt(t.value)} stroke={t.color} strokeDasharray="5 5" strokeWidth={1.5} />
      ))}
      {mode === "bar"
        ? barSeries.map((s, si) => points.map((point, i) => {
            const value = point[s.key];
            if (typeof value !== "number" || !Number.isFinite(value)) return null;
            const x = left + slot * i + slot * 0.1 + barW * si;
            const y = yAt(value);
            return <Rect key={`${String(s.key)}-${i}`} x={x} y={Math.min(y, baseY)} width={barW} height={Math.max(1, Math.abs(baseY - y))}
              fill={s.dashed ? "none" : s.color} stroke={s.dashed ? s.color : "none"} opacity={0.9} />;
          }))
        : series.map((s) => segmentsOf(s.key).map((segment, si) => (
            <G key={`${String(s.key)}-${si}`}>
              {mode === "area" && s.fill && segment.length > 1 ? (
                <Path d={`${linePath(segment)} L${segment[segment.length - 1][0].toFixed(1)},${baseY.toFixed(1)} L${segment[0][0].toFixed(1)},${baseY.toFixed(1)} Z`}
                  fill={s.fill} opacity={0.7} />
              ) : null}
              <Path d={linePath(segment)} fill="none" stroke={s.color} strokeWidth={s.dashed ? 1.5 : 2.2}
                strokeDasharray={s.dashed ? "6 4" : undefined} strokeLinejoin="round" strokeLinecap="round" />
              {segment.length === 1 ? <Circle cx={segment[0][0]} cy={segment[0][1]} r={2.5} fill={s.color} /> : null}
            </G>
          )))}
      {labelIdx.map((i, k) => (
        <SvgText key={`${i}-${k}`} x={xAt(i)} y={CHART_HEIGHT - 6} fontSize="9" fill={COLORS.axis}
          textAnchor={k === 0 ? "start" : k === labelIdx.length - 1 ? "end" : "middle"}>{labels[i]}</SvgText>
      ))}
    </Svg>
  );
}

function Donut({ slices, size }: { slices: Array<{ color: string; value: number }>; size: number }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const r = size / 2 - 10;
  const c = size / 2;
  const stroke = 22;
  if (total <= 0) return null;
  const visible = slices.filter((slice) => slice.value > 0);
  if (visible.length === 1) {
    return <Svg width={size} height={size}><Circle cx={c} cy={c} r={r} stroke={visible[0].color} strokeWidth={stroke} fill="none" /></Svg>;
  }
  let angle = -Math.PI / 2;
  return (
    <Svg width={size} height={size}>
      {visible.map((slice) => {
        const sweep = (slice.value / total) * Math.PI * 2;
        const start = angle;
        const end = angle + sweep;
        angle = end;
        const large = sweep > Math.PI ? 1 : 0;
        const p = (a: number) => `${(c + r * Math.cos(a)).toFixed(2)},${(c + r * Math.sin(a)).toFixed(2)}`;
        return <Path key={slice.color} d={`M${p(start)} A${r},${r} 0 ${large} 1 ${p(end)}`} stroke={slice.color} strokeWidth={stroke} fill="none" />;
      })}
    </Svg>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  chipRow: { gap: 8, paddingVertical: 2 },
  chip: { backgroundColor: durianTheme.colors.surface, borderColor: durianTheme.colors.border, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: durianTheme.colors.moss, borderColor: durianTheme.colors.moss },
  chipOutlineActive: { borderColor: durianTheme.colors.moss, borderWidth: 2 },
  chipText: { color: "#536259", fontSize: 12, fontWeight: "800" },
  chipTextActive: { color: "#fff" },
  chipOutlineText: { color: durianTheme.colors.moss },
  card: { backgroundColor: durianTheme.colors.surface, borderColor: durianTheme.colors.border, borderRadius: durianTheme.radius.md, borderWidth: 1, gap: 10, padding: 14 },
  cardTitle: { color: "#536259", fontSize: 12, fontWeight: "900", letterSpacing: 0.3 },
  chartHeader: { alignItems: "center", flexDirection: "row", gap: 8 },
  segment: { backgroundColor: "#edf3ee", borderRadius: 10, flexDirection: "row", padding: 3 },
  segmentItem: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  segmentItemActive: { backgroundColor: "#fff" },
  segmentText: { color: "#66756c", fontSize: 11, fontWeight: "800" },
  segmentTextActive: { color: durianTheme.colors.moss },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  legendItem: { alignItems: "center", flexDirection: "row", gap: 6 },
  legendDot: { borderRadius: 5, height: 9, width: 9 },
  legendDashed: { borderRadius: 1, height: 3, width: 12 },
  legendText: { color: durianTheme.colors.muted, fontSize: 11, fontWeight: "700" },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  emptyBox: { borderColor: durianTheme.colors.border, borderRadius: 14, borderStyle: "dashed", borderWidth: 1, paddingHorizontal: 16 },
  empty: { color: COLORS.axis, fontSize: 12, fontWeight: "700", textAlign: "center" },
  error: { backgroundColor: durianTheme.colors.warningSoft, borderRadius: 12, color: "#6d5619", fontSize: 12, fontWeight: "700", padding: 10 },
  pieRow: { alignItems: "center", flexDirection: "row", gap: 14 },
  summaryRow: { alignItems: "center", backgroundColor: "#f7faf7", borderRadius: 10, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 9 },
  summaryLabel: { color: "#66756c", flex: 1, fontSize: 12, fontWeight: "600" },
  summaryValue: { color: durianTheme.colors.ink, fontSize: 12, fontWeight: "900" },
  note: { color: "#8a6810", fontSize: 11, lineHeight: 16 },
});
