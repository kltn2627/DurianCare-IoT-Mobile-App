import {
  Activity,
  BatteryMedium,
  CloudSun,
  Droplets,
  FlaskConical,
  Gauge,
  Pause,
  Play,
  RadioTower,
  RefreshCw,
  Sprout,
  ThermometerSun,
  Waves,
} from "lucide-react-native";
import { type ReactElement, useCallback, useMemo } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { durianSensorStations } from "@/src/constants/durianMockData";
import { durianTheme } from "@/src/theme/durianTheme";

import type { DurianSensorStation, DurianTelemetryReading } from "./types";
import { useDurianLiveTelemetry } from "./useDurianLiveTelemetry";

type DashboardSection = "metrics" | "climate" | "soil" | "nutrients" | "stations";

type MetricItem = {
  accent: string;
  icon: typeof Activity;
  id: keyof Omit<DurianTelemetryReading, "time">;
  label: string;
  range: string;
  unit: string;
};

const DASHBOARD_SECTIONS: DashboardSection[] = [
  "metrics",
  "climate",
  "soil",
  "nutrients",
  "stations",
];

const METRICS: MetricItem[] = [
  {
    accent: "#FFB866",
    icon: ThermometerSun,
    id: "airTemperature",
    label: "Nhiệt độ DHT22",
    range: "Tối ưu 28 - 32°C",
    unit: "°C",
  },
  {
    accent: "#8DD6C3",
    icon: Waves,
    id: "airHumidity",
    label: "Độ ẩm không khí",
    range: "Tối ưu 70 - 85%",
    unit: "%",
  },
  {
    accent: durianTheme.colors.durianYellow,
    icon: Droplets,
    id: "soilMoisture",
    label: "Độ ẩm đất",
    range: "Tối ưu 70 - 85%",
    unit: "%",
  },
  {
    accent: "#9FD28B",
    icon: Sprout,
    id: "nitrogen",
    label: "Nitrogen (N)",
    range: "Dinh dưỡng lá",
    unit: " mg/kg",
  },
  {
    accent: "#C8B5E8",
    icon: FlaskConical,
    id: "phosphorus",
    label: "Phosphorus (P)",
    range: "Phát triển rễ",
    unit: " mg/kg",
  },
  {
    accent: "#F3C989",
    icon: Gauge,
    id: "potassium",
    label: "Potassium (K)",
    range: "Chất lượng trái",
    unit: " mg/kg",
  },
];

const SENSOR_STATIONS = durianSensorStations as DurianSensorStation[];

export function DurianClimateMonitorScreen() {
  const { width } = useWindowDimensions();
  const { isLive, lastUpdatedAt, latest, refresh, series, setIsLive } =
    useDurianLiveTelemetry();
  const chartWidth = Math.max(280, Math.min(420, width - 68));

  const header = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <DurianScreenHeader
          eyebrow="SMARTFARM IOT · LIVE"
          icon={Activity}
          title="Sức khỏe vườn sầu riêng"
          subtitle="Dữ liệu DHT22, độ ẩm đất và dinh dưỡng NPK được cập nhật theo nhịp trạm cảm biến."
        />
        <View style={styles.liveToolbar}>
          <View style={styles.liveCopy}>
            <View style={[styles.liveDot, !isLive && styles.liveDotPaused]} />
            <View>
              <Text style={styles.liveTitle}>{isLive ? "Đang nhận dữ liệu" : "Đã tạm dừng"}</Text>
              <Text style={styles.liveMeta}>
                Cập nhật {lastUpdatedAt.toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </Text>
            </View>
          </View>
          <View style={styles.toolbarActions}>
            <IconButton
              icon={RefreshCw}
              label="Làm mới dữ liệu"
              onPress={refresh}
            />
            <IconButton
              icon={isLive ? Pause : Play}
              label={isLive ? "Tạm dừng" : "Tiếp tục"}
              onPress={() => setIsLive((current) => !current)}
            />
          </View>
        </View>
      </View>
    ),
    [isLive, lastUpdatedAt, refresh, setIsLive],
  );

  const renderSection = useCallback(
    ({ item }: { item: DashboardSection }): ReactElement => {
      switch (item) {
        case "metrics":
          return <MetricCarousel latest={latest} />;
        case "climate":
          return <ClimateLineChart chartWidth={chartWidth} series={series} />;
        case "soil":
          return <SoilMoistureChart series={series} />;
        case "nutrients":
          return <NutrientCard latest={latest} />;
        case "stations":
          return <StationCarousel stations={SENSOR_STATIONS} />;
      }
    },
    [chartWidth, latest, series],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FlatList
        contentContainerStyle={styles.content}
        data={DASHBOARD_SECTIONS}
        keyExtractor={(item) => item}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            colors={[durianTheme.colors.moss]}
            onRefresh={refresh}
            refreshing={false}
            tintColor={durianTheme.colors.moss}
          />
        }
        renderItem={renderSection}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function MetricCarousel({ latest }: { latest: DurianTelemetryReading }) {
  const renderMetric = useCallback(
    ({ item }: { item: MetricItem }) => (
      <MetricCard item={item} value={latest[item.id]} />
    ),
    [latest],
  );

  return (
    <View style={styles.section}>
      <SectionHeading
        caption="6 chỉ số đang hoạt động"
        title="Chỉ số tức thời"
      />
      <FlatList
        contentContainerStyle={styles.horizontalList}
        data={METRICS}
        horizontal
        keyExtractor={(item) => item.id}
        renderItem={renderMetric}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

function MetricCard({ item, value }: { item: MetricItem; value: number }) {
  const Icon = item.icon;
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: item.accent }]}>
        <Icon color={durianTheme.colors.mossDark} size={21} />
      </View>
      <Text style={styles.metricValue}>
        {item.id === "airTemperature" ? value.toFixed(1) : Math.round(value)}
        <Text style={styles.metricUnit}>{item.unit}</Text>
      </Text>
      <Text style={styles.metricLabel}>{item.label}</Text>
      <Text style={styles.metricRange}>{item.range}</Text>
    </View>
  );
}

function ClimateLineChart({
  chartWidth,
  series,
}: {
  chartWidth: number;
  series: DurianTelemetryReading[];
}) {
  const chartHeight = 150;
  const temperaturePoints = createPolylinePoints(
    series,
    chartWidth,
    chartHeight,
    "airTemperature",
    26,
    35,
  );
  const humidityPoints = createPolylinePoints(
    series,
    chartWidth,
    chartHeight,
    "airHumidity",
    55,
    95,
  );

  return (
    <View style={styles.chartCard}>
      <SectionHeading
        caption="DHT22 · nhiệt độ và độ ẩm không khí"
        title="Vi khí hậu theo thời gian"
      />
      <View style={styles.legendRow}>
        <Legend color={durianTheme.colors.durianYellow} label="Nhiệt độ" />
        <Legend color="#72BFA9" label="Độ ẩm không khí" />
      </View>
      <Svg height={chartHeight} width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        <LineGrid chartHeight={chartHeight} chartWidth={chartWidth} />
        <Polyline
          fill="none"
          points={temperaturePoints}
          stroke={durianTheme.colors.durianYellow}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        <Polyline
          fill="none"
          points={humidityPoints}
          stroke="#72BFA9"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        <LatestPoint color={durianTheme.colors.durianYellow} points={temperaturePoints} />
        <LatestPoint color="#72BFA9" points={humidityPoints} />
      </Svg>
      <TimeLabels series={series} />
    </View>
  );
}

function SoilMoistureChart({ series }: { series: DurianTelemetryReading[] }) {
  const renderBar = useCallback(
    ({ item }: { item: DurianTelemetryReading }) => (
      <View style={styles.barColumn}>
        <Text style={styles.barValue}>{item.soilMoisture}</Text>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { height: `${Math.max(12, item.soilMoisture)}%` as `${number}%` },
            ]}
          />
        </View>
        <Text style={styles.timeLabel}>{item.time.slice(0, 2)}</Text>
      </View>
    ),
    [],
  );

  return (
    <View style={styles.chartCard}>
      <SectionHeading
        caption="Cảm biến điện dung · ngưỡng mục tiêu 70 - 85%"
        title="Độ ẩm vùng rễ"
      />
      <FlatList
        contentContainerStyle={styles.barChart}
        data={series}
        horizontal
        keyExtractor={(item, index) => `${item.time}-${index}`}
        renderItem={renderBar}
        scrollEnabled={false}
      />
    </View>
  );
}

function NutrientCard({ latest }: { latest: DurianTelemetryReading }) {
  return (
    <View style={styles.chartCard}>
      <SectionHeading
        caption="Cảm biến NPK RS485 · đơn vị mg/kg"
        title="Dinh dưỡng đất"
      />
      <View style={styles.nutrientList}>
        <NutrientRow
          color="#8EC67C"
          label="Nitrogen"
          max={150}
          short="N"
          value={latest.nitrogen}
        />
        <NutrientRow
          color="#B9A2DD"
          label="Phosphorus"
          max={65}
          short="P"
          value={latest.phosphorus}
        />
        <NutrientRow
          color="#EDBD69"
          label="Potassium"
          max={200}
          short="K"
          value={latest.potassium}
        />
      </View>
    </View>
  );
}

function NutrientRow({
  color,
  label,
  max,
  short,
  value,
}: {
  color: string;
  label: string;
  max: number;
  short: string;
  value: number;
}) {
  return (
    <View style={styles.nutrientRow}>
      <View style={[styles.nutrientBadge, { backgroundColor: color }]}>
        <Text style={styles.nutrientShort}>{short}</Text>
      </View>
      <View style={styles.nutrientCopy}>
        <View style={styles.nutrientHeading}>
          <Text style={styles.nutrientLabel}>{label}</Text>
          <Text style={styles.nutrientValue}>{value} mg/kg</Text>
        </View>
        <View style={styles.nutrientTrack}>
          <View
            style={[
              styles.nutrientFill,
              {
                backgroundColor: color,
                width: `${Math.min(100, (value / max) * 100)}%` as `${number}%`,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

function StationCarousel({ stations }: { stations: DurianSensorStation[] }) {
  const renderStation = useCallback(
    ({ item }: { item: DurianSensorStation }) => <StationCard station={item} />,
    [],
  );

  return (
    <View style={styles.section}>
      <SectionHeading
        caption="Thiết bị và kết nối tại vườn"
        title="Trạm cảm biến"
      />
      <FlatList
        contentContainerStyle={styles.horizontalList}
        data={stations}
        horizontal
        keyExtractor={(item) => item.id}
        renderItem={renderStation}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

function StationCard({ station }: { station: DurianSensorStation }) {
  const isOnline = station.status === "ONLINE";
  return (
    <View style={styles.stationCard}>
      <View style={styles.stationHeading}>
        <View style={styles.stationIcon}>
          <RadioTower color={durianTheme.colors.moss} size={21} />
        </View>
        <View style={[styles.stationStatus, !isOnline && styles.stationStatusWarning]}>
          <Text style={styles.stationStatusText}>{isOnline ? "ONLINE" : "BẢO TRÌ"}</Text>
        </View>
      </View>
      <Text style={styles.stationName}>{station.name}</Text>
      <Text style={styles.stationDevice}>{station.device}</Text>
      <View style={styles.stationFooter}>
        <Text style={styles.stationMeta}>{station.lastSeen}</Text>
        <View style={styles.battery}>
          <BatteryMedium color={durianTheme.colors.moss} size={17} />
          <Text style={styles.batteryText}>{station.battery}%</Text>
        </View>
      </View>
    </View>
  );
}

function SectionHeading({ caption, title }: { caption: string; title: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCaption}>{caption}</Text>
    </View>
  );
}

function IconButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof Activity;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        pressed && styles.pressedButton,
      ]}
    >
      <Icon color={durianTheme.colors.moss} size={19} />
    </Pressable>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function LineGrid({ chartHeight, chartWidth }: { chartHeight: number; chartWidth: number }) {
  return (
    <>
      <Line stroke={durianTheme.colors.mossSoft} x1="12" x2={chartWidth - 12} y1="24" y2="24" />
      <Line stroke={durianTheme.colors.mossSoft} x1="12" x2={chartWidth - 12} y1="70" y2="70" />
      <Line
        stroke={durianTheme.colors.mossSoft}
        x1="12"
        x2={chartWidth - 12}
        y1={chartHeight - 24}
        y2={chartHeight - 24}
      />
    </>
  );
}

function LatestPoint({ color, points }: { color: string; points: string }) {
  const latestPoint = points.split(" ").at(-1);
  if (!latestPoint) return null;
  const [cx, cy] = latestPoint.split(",");
  return (
    <Circle
      cx={cx}
      cy={cy}
      fill={color}
      r="5"
      stroke={durianTheme.colors.mossDark}
      strokeWidth="2"
    />
  );
}

function TimeLabels({ series }: { series: DurianTelemetryReading[] }) {
  const renderLabel = useCallback(
    ({ item }: { item: DurianTelemetryReading }) => (
      <Text style={styles.timeLabel}>{item.time.slice(0, 2)}</Text>
    ),
    [],
  );
  return (
    <FlatList
      contentContainerStyle={styles.timeLabels}
      data={series}
      horizontal
      keyExtractor={(item, index) => `${item.time}-${index}`}
      renderItem={renderLabel}
      scrollEnabled={false}
    />
  );
}

function createPolylinePoints(
  series: DurianTelemetryReading[],
  width: number,
  height: number,
  field: "airHumidity" | "airTemperature",
  minimum: number,
  maximum: number,
): string {
  return series
    .map((item, index) => {
      const x = 14 + index * ((width - 28) / Math.max(1, series.length - 1));
      const normalized = (item[field] - minimum) / (maximum - minimum);
      const y = height - 20 - normalized * (height - 40);
      return `${x},${Math.max(18, Math.min(height - 18, y))}`;
    })
    .join(" ");
}

const styles = StyleSheet.create({
  barChart: {
    alignItems: "flex-end",
    height: 146,
    justifyContent: "space-between",
    marginTop: 12,
    width: "100%",
  },
  barColumn: { alignItems: "center", flex: 1, gap: 4 },
  barFill: {
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 7,
    bottom: 0,
    position: "absolute",
    width: "100%",
  },
  barTrack: {
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 7,
    height: 104,
    overflow: "hidden",
    position: "relative",
    width: 18,
  },
  barValue: {
    color: durianTheme.colors.moss,
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 13,
  },
  battery: { alignItems: "center", flexDirection: "row", gap: 4 },
  batteryText: {
    color: durianTheme.colors.moss,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 14,
  },
  chartCard: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: "#ECE8D8",
    borderRadius: 22,
    borderWidth: 1,
    padding: 17,
  },
  content: { gap: 14, paddingBottom: 44 },
  headerBlock: { gap: 12 },
  horizontalList: { gap: 11, paddingHorizontal: 18 },
  iconButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  legendDot: { borderRadius: 5, height: 9, width: 9 },
  legendItem: { alignItems: "center", flexDirection: "row", gap: 6 },
  legendRow: { flexDirection: "row", gap: 14, marginBottom: 4, marginTop: 12 },
  legendText: {
    color: durianTheme.colors.muted,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
  },
  liveCopy: { alignItems: "center", flex: 1, flexDirection: "row", gap: 9 },
  liveDot: {
    backgroundColor: "#48B475",
    borderRadius: 6,
    height: 10,
    shadowColor: "#48B475",
    shadowOpacity: 0.5,
    shadowRadius: 5,
    width: 10,
  },
  liveDotPaused: { backgroundColor: durianTheme.colors.warning },
  liveMeta: {
    color: durianTheme.colors.mist,
    fontSize: 9,
    lineHeight: 13,
    marginTop: 1,
  },
  liveTitle: {
    color: durianTheme.colors.white,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
  },
  liveToolbar: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: 20,
    flexDirection: "row",
    marginHorizontal: 18,
    padding: 12,
  },
  metricCard: {
    backgroundColor: durianTheme.colors.moss,
    borderRadius: 20,
    minHeight: 164,
    padding: 15,
    width: 156,
  },
  metricIcon: {
    alignItems: "center",
    borderRadius: 13,
    height: 42,
    justifyContent: "center",
    marginBottom: 12,
    width: 42,
  },
  metricLabel: {
    color: durianTheme.colors.white,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 3,
  },
  metricRange: {
    color: durianTheme.colors.mist,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 2,
  },
  metricUnit: { fontSize: 12, lineHeight: 17 },
  metricValue: {
    color: durianTheme.colors.durianYellow,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
  nutrientBadge: {
    alignItems: "center",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  nutrientCopy: { flex: 1, gap: 7 },
  nutrientFill: { borderRadius: 4, height: "100%" },
  nutrientHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  nutrientLabel: {
    color: durianTheme.colors.ink,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  nutrientList: { gap: 14, marginTop: 16 },
  nutrientRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  nutrientShort: {
    color: durianTheme.colors.mossDark,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21,
  },
  nutrientTrack: {
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 4,
    height: 7,
    overflow: "hidden",
  },
  nutrientValue: {
    color: durianTheme.colors.moss,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 16,
  },
  pressedButton: { transform: [{ scale: 0.94 }] },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  section: { gap: 11 },
  sectionCaption: {
    color: durianTheme.colors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 1,
  },
  sectionHeading: { paddingHorizontal: 1 },
  sectionTitle: {
    color: durianTheme.colors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
  },
  stationCard: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: "#E7E4D5",
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    width: 230,
  },
  stationDevice: {
    color: durianTheme.colors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  stationFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  stationHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stationIcon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 13,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  stationMeta: {
    color: durianTheme.colors.muted,
    fontSize: 9,
    lineHeight: 13,
  },
  stationName: {
    color: durianTheme.colors.ink,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 21,
    marginTop: 12,
  },
  stationStatus: {
    backgroundColor: "#DDF3E5",
    borderRadius: durianTheme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  stationStatusText: {
    color: durianTheme.colors.moss,
    fontSize: 8,
    fontWeight: "900",
    lineHeight: 11,
  },
  stationStatusWarning: { backgroundColor: "#FFF0CB" },
  timeLabel: {
    color: durianTheme.colors.muted,
    flex: 1,
    fontSize: 8,
    lineHeight: 12,
    textAlign: "center",
  },
  timeLabels: { justifyContent: "space-between", width: "100%" },
  toolbarActions: { flexDirection: "row", gap: 8 },
});
