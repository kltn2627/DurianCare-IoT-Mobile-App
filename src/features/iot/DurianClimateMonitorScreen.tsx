import { Activity, BatteryMedium, CloudSun, Droplets, RadioTower } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { durianClimateSeries, durianSensorStations } from "@/src/constants/durianMockData";
import { durianTheme } from "@/src/theme/durianTheme";

const CHART_WIDTH = 318;
const CHART_HEIGHT = 118;

export function DurianClimateMonitorScreen() {
  const latest = durianClimateSeries[durianClimateSeries.length - 1];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <DurianScreenHeader
        eyebrow="SMARTFARM IOT • MOCK DATA"
        icon={Activity}
        title="Giám sát vi khí hậu"
        subtitle="Dữ liệu theo giờ từ trạm cảm biến, đồng bộ miền giá trị với Web Client."
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryRow}>
          <MetricCard
            icon={CloudSun}
            label="Nhiệt độ không khí"
            range="Ngưỡng 28°C - 32°C"
            value={`${latest.airTemperature.toFixed(1)}°C`}
          />
          <MetricCard
            icon={Droplets}
            label="Độ ẩm đất"
            range="Ngưỡng 70% - 85%"
            value={`${latest.soilMoisture}%`}
          />
        </View>

        <ClimateLineChart />
        <MoistureBarChart />

        <Text style={styles.sectionTitle}>Trạng thái trạm cảm biến</Text>
        {durianSensorStations.map((station) => (
          <View key={station.id} style={styles.stationCard}>
            <View style={styles.stationIcon}>
              <RadioTower color={durianTheme.colors.moss} size={21} />
            </View>
            <View style={styles.stationCopy}>
              <Text style={styles.stationName}>{station.name}</Text>
              <Text style={styles.stationMeta}>
                {station.status === "ONLINE" ? "Đang truyền dữ liệu" : "Đang bảo trì"} • {station.lastSeen}
              </Text>
            </View>
            <View style={styles.battery}>
              <BatteryMedium color={durianTheme.colors.moss} size={17} />
              <Text style={styles.batteryText}>{station.battery}%</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({
  icon: Icon,
  label,
  range,
  value,
}: {
  icon: typeof CloudSun;
  label: string;
  range: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Icon color={durianTheme.colors.durianYellow} size={22} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricRange}>{range}</Text>
    </View>
  );
}

function ClimateLineChart() {
  const points = durianClimateSeries
    .map((item, index) => {
      const x = 14 + index * ((CHART_WIDTH - 28) / (durianClimateSeries.length - 1));
      const y = CHART_HEIGHT - 18 - ((item.airTemperature - 28) / 4) * (CHART_HEIGHT - 36);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Nhiệt độ không khí theo giờ</Text>
      <Text style={styles.chartSubtitle}>Đường nhiệt độ trong miền 28°C - 32°C</Text>
      <Svg height={CHART_HEIGHT} width="100%" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
        {[18, 48, 78, 108].map((y) => (
          <Line
            key={y}
            stroke={durianTheme.colors.mossSoft}
            strokeWidth="1"
            x1="10"
            x2={CHART_WIDTH - 10}
            y1={y}
            y2={y}
          />
        ))}
        <Polyline
          fill="none"
          points={points}
          stroke={durianTheme.colors.moss}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        {points.split(" ").map((point) => {
          const [cx, cy] = point.split(",");
          return (
            <Circle
              key={point}
              cx={cx}
              cy={cy}
              fill={durianTheme.colors.durianYellow}
              r="4"
              stroke={durianTheme.colors.mossDark}
              strokeWidth="2"
            />
          );
        })}
      </Svg>
      <View style={styles.timeLabels}>
        {durianClimateSeries.map((item) => (
          <Text key={item.time} style={styles.timeLabel}>{item.time.slice(0, 2)}</Text>
        ))}
      </View>
    </View>
  );
}

function MoistureBarChart() {
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Độ ẩm đất theo giờ</Text>
      <Text style={styles.chartSubtitle}>Tỷ lệ duy trì trong miền 70% - 85%</Text>
      <View style={styles.barChart}>
        {durianClimateSeries.map((item) => (
          <View key={item.time} style={styles.barColumn}>
            <Text style={styles.barValue}>{item.soilMoisture}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { height: `${((item.soilMoisture - 65) / 25) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.timeLabel}>{item.time.slice(0, 2)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barChart: { alignItems: "flex-end", flexDirection: "row", gap: 7, height: 150, justifyContent: "space-between" },
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
    height: 105,
    overflow: "hidden",
    position: "relative",
    width: 18,
  },
  barValue: { color: durianTheme.colors.moss, fontSize: 9, fontWeight: "900" },
  battery: { alignItems: "center", flexDirection: "row", gap: 4 },
  batteryText: { color: durianTheme.colors.moss, fontSize: 10, fontWeight: "900" },
  chartCard: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: durianTheme.radius.md,
    gap: 6,
    padding: 16,
  },
  chartSubtitle: { color: durianTheme.colors.muted, fontSize: 11 },
  chartTitle: { color: durianTheme.colors.ink, fontSize: 16, fontWeight: "900" },
  content: { gap: 14, padding: 18, paddingBottom: 42 },
  metricCard: {
    backgroundColor: durianTheme.colors.moss,
    borderRadius: durianTheme.radius.md,
    flex: 1,
    gap: 5,
    padding: 15,
  },
  metricLabel: { color: durianTheme.colors.white, fontSize: 11, fontWeight: "800" },
  metricRange: { color: durianTheme.colors.mist, fontSize: 9 },
  metricValue: { color: durianTheme.colors.durianYellow, fontSize: 23, fontWeight: "900" },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  sectionTitle: { color: durianTheme.colors.ink, fontSize: 19, fontWeight: "900", marginTop: 4 },
  stationCard: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 16,
    flexDirection: "row",
    gap: 11,
    padding: 14,
  },
  stationCopy: { flex: 1, gap: 3 },
  stationIcon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 13,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  stationMeta: { color: durianTheme.colors.muted, fontSize: 10 },
  stationName: { color: durianTheme.colors.ink, fontSize: 13, fontWeight: "900" },
  summaryRow: { flexDirection: "row", gap: 10 },
  timeLabel: { color: durianTheme.colors.muted, fontSize: 8, textAlign: "center" },
  timeLabels: { flexDirection: "row", justifyContent: "space-between" },
});
