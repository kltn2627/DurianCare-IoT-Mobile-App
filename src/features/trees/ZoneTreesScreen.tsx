import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";

import { TreePine as TreePineIcon } from "lucide-react-native";
import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { durianTheme } from "@/src/theme/durianTheme";
import { getZone, listTrees, getZoneSafety } from "./treeApi";
import type { TreeSummary, ZoneDetail, ZoneSafetySummary } from "./treeTypes";

const HEALTH_COLORS: Record<string, string> = {
  HEALTHY: "#22c55e",
  DISEASED: "#ef4444",
  TREATING: "#f97316",
  SUSPECTED: "#f97316",
};

const HEALTH_LABELS: Record<string, string> = {
  HEALTHY: "Khỏe mạnh",
  DISEASED: "Bệnh",
  TREATING: "Điều trị",
  SUSPECTED: "Nghi ngờ",
};

const HEALTH_BG: Record<string, string> = {
  HEALTHY: "#dcfce7",
  DISEASED: "#fee2e2",
  TREATING: "#ffedd5",
  SUSPECTED: "#ffedd5",
};

function treeColor(tree: TreeSummary): string {
  if (!tree.healthStatus) return "#9ca3af";
  return HEALTH_COLORS[tree.healthStatus] ?? "#9ca3af";
}

function TreeMapSvg({
  trees,
  selectedId,
  onSelect,
}: {
  trees: TreeSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const screenWidth = Dimensions.get("window").width - 32;
  const mapHeight = screenWidth * 0.65;
  const positionedTrees = trees.filter((t) => t.positionX != null && t.positionY != null);

  return (
    <View style={[styles.mapContainer, { height: mapHeight }]}>
      <Svg width={screenWidth} height={mapHeight}>
        {/* Grid lines */}
        {Array.from({ length: 5 }).map((_, i) => (
          <Line
            key={`vg-${i}`}
            x1={(i + 1) * (screenWidth / 6)}
            y1={0}
            x2={(i + 1) * (screenWidth / 6)}
            y2={mapHeight}
            stroke="#d1fae5"
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: 3 }).map((_, i) => (
          <Line
            key={`hg-${i}`}
            x1={0}
            y1={(i + 1) * (mapHeight / 4)}
            x2={screenWidth}
            y2={(i + 1) * (mapHeight / 4)}
            stroke="#d1fae5"
            strokeWidth={1}
          />
        ))}

        {positionedTrees.map((tree) => {
          const cx = (tree.positionX ?? 0) * screenWidth;
          const cy = (tree.positionY ?? 0) * mapHeight;
          const color = treeColor(tree);
          const isSelected = tree.id === selectedId;
          return (
            <React.Fragment key={tree.id}>
              {isSelected ? (
                <Circle cx={cx} cy={cy} r={18} fill={color} opacity={0.2} />
              ) : null}
              <Circle
                cx={cx}
                cy={cy}
                r={isSelected ? 12 : 9}
                fill={color}
                stroke={isSelected ? "#1e293b" : "white"}
                strokeWidth={isSelected ? 2.5 : 1.5}
                onPress={() => onSelect(tree.id)}
              />
              <SvgText
                x={cx}
                y={cy + 20}
                textAnchor="middle"
                fontSize={8}
                fill="#374151"
                fontWeight={isSelected ? "700" : "500"}
              >
                {tree.treeCode}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>

      {positionedTrees.length === 0 ? (
        <View style={styles.mapEmpty}>
          <Text style={styles.mapEmptyText}>Chưa có cây nào có vị trí trên bản đồ</Text>
        </View>
      ) : null}
    </View>
  );
}

function SafetySummaryCard({ summary }: { summary: ZoneSafetySummary }) {
  const rate = summary.safetyRate != null ? Math.round(summary.safetyRate) : null;
  const rateColor =
    rate == null ? "#9ca3af" : rate >= 80 ? "#16a34a" : rate >= 50 ? "#ca8a04" : "#dc2626";
  const rateBg =
    rate == null ? "#f3f4f6" : rate >= 80 ? "#dcfce7" : rate >= 50 ? "#fef9c3" : "#fee2e2";

  return (
    <View style={styles.safetyCard}>
      <View style={styles.safetyHeader}>
        <Text style={styles.safetyTitle}>Tổng quan an toàn</Text>
        <View style={[styles.safetyRateBadge, { backgroundColor: rateBg }]}>
          <Text style={[styles.safetyRateValue, { color: rateColor }]}>
            {rate != null ? `${rate}%` : "N/A"}
          </Text>
          <Text style={styles.safetyRateLabel}>An toàn</Text>
        </View>
      </View>
      <View style={styles.safetyStats}>
        {[
          { label: "Tổng cây", value: summary.totalTrees, color: "#374151" },
          { label: "Đã đánh giá", value: summary.assessedTrees, color: "#6366f1" },
          { label: "Khỏe mạnh", value: summary.safeTrees, color: "#16a34a" },
          { label: "Cần chú ý", value: summary.attentionTrees, color: "#dc2626" },
        ].map((stat) => (
          <View key={stat.label} style={styles.statItem}>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.safetyNote}>{summary.safetyRateLabel}</Text>
    </View>
  );
}

interface Props {
  farmId: string;
  zoneId: string;
}

export function ZoneTreesScreen({ farmId, zoneId }: Props) {
  const router = useRouter();
  const [zone, setZone] = useState<ZoneDetail | null>(null);
  const [trees, setTrees] = useState<TreeSummary[]>([]);
  const [safety, setSafety] = useState<ZoneSafetySummary | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      getZone(zoneId),
      listTrees(zoneId),
      getZoneSafety(zoneId).catch(() => null),
    ])
      .then(([zoneData, treeData, safetyData]) => {
        if (!active) return;
        setZone(zoneData);
        setTrees(treeData);
        if (safetyData) setSafety(safetyData);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [zoneId]);

  useEffect(() => {
    return load();
  }, [load]);

  const selectedTree = selectedId ? trees.find((t) => t.id === selectedId) : null;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <DurianScreenHeader
        eyebrow="VÙNG TRỒNG"
        icon={TreePineIcon}
        title={zone?.name ?? "Bản đồ cây"}
        subtitle={zone?.code ?? "Theo dõi tình trạng sức khỏe cây"}
      />

      {loading && !zone ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={durianTheme.colors.moss} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {safety ? <SafetySummaryCard summary={safety} /> : null}

          {/* Tree Map Legend */}
          <View style={styles.legendRow}>
            {Object.entries(HEALTH_LABELS).map(([key, label]) => (
              <View key={key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: HEALTH_COLORS[key] }]} />
                <Text style={styles.legendLabel}>{label}</Text>
              </View>
            ))}
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#9ca3af" }]} />
              <Text style={styles.legendLabel}>Chưa đánh giá</Text>
            </View>
          </View>

          {/* Tree map canvas */}
          <TreeMapSvg
            trees={trees}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
          />

          {/* Selected tree quick info */}
          {selectedTree ? (
            <Pressable
              style={styles.selectedTreeCard}
              onPress={() =>
                router.push({
                  pathname: "/(main)/trees/[treeId]",
                  params: { treeId: selectedTree.id },
                })
              }
            >
              <View style={styles.selectedTreeHeader}>
                <View>
                  <Text style={styles.selectedTreeCode}>{selectedTree.treeCode}</Text>
                  {selectedTree.nickname ? (
                    <Text style={styles.selectedTreeNickname}>{selectedTree.nickname}</Text>
                  ) : null}
                </View>
                {selectedTree.healthStatus ? (
                  <View
                    style={[
                      styles.healthBadge,
                      { backgroundColor: HEALTH_BG[selectedTree.healthStatus] ?? "#f3f4f6" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.healthBadgeText,
                        { color: HEALTH_COLORS[selectedTree.healthStatus] ?? "#374151" },
                      ]}
                    >
                      {HEALTH_LABELS[selectedTree.healthStatus] ?? selectedTree.healthStatus}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.viewDetail}>Nhấn để xem chi tiết →</Text>
            </Pressable>
          ) : null}

          {/* Tree list */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Danh sách cây ({trees.length})</Text>
            {trees.length === 0 ? (
              <Text style={styles.emptyText}>Chưa có cây nào trong vùng này.</Text>
            ) : (
              trees.map((tree) => (
                <Pressable
                  key={tree.id}
                  style={[
                    styles.treeRow,
                    tree.id === selectedId && styles.treeRowSelected,
                  ]}
                  onPress={() => {
                    setSelectedId(tree.id === selectedId ? null : tree.id);
                  }}
                  onLongPress={() =>
                    router.push({
                      pathname: "/(main)/trees/[treeId]",
                      params: { treeId: tree.id },
                    })
                  }
                >
                  <View style={styles.treeRowLeft}>
                    <View
                      style={[
                        styles.treeDot,
                        { backgroundColor: treeColor(tree) },
                      ]}
                    />
                    <View>
                      <Text style={styles.treeCode}>{tree.treeCode}</Text>
                      {tree.variety ? (
                        <Text style={styles.treeVariety}>{tree.variety}</Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.treeRowRight}>
                    {tree.healthStatus ? (
                      <Text
                        style={[
                          styles.treeHealthLabel,
                          { color: HEALTH_COLORS[tree.healthStatus] ?? "#374151" },
                        ]}
                      >
                        {HEALTH_LABELS[tree.healthStatus] ?? tree.healthStatus}
                      </Text>
                    ) : (
                      <Text style={styles.treeHealthLabel}>Chưa đánh giá</Text>
                    )}
                    <Text style={styles.treeDiagCount}>{tree.diagnosisCount} lần</Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: durianTheme.colors.canvas },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 16, gap: 12 },
  errorBox: {
    margin: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  errorText: { fontSize: 13, color: "#dc2626", fontWeight: "600" },
  emptyText: { fontSize: 13, color: durianTheme.colors.muted, textAlign: "center" },

  // Safety card
  safetyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: durianTheme.colors.mist,
    backgroundColor: durianTheme.colors.surface,
    padding: 16,
    gap: 12,
  },
  safetyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  safetyTitle: { fontSize: 14, fontWeight: "800", color: durianTheme.colors.ink },
  safetyRateBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: "center",
  },
  safetyRateValue: { fontSize: 22, fontWeight: "900" },
  safetyRateLabel: { fontSize: 10, fontWeight: "600", color: "#6b7280" },
  safetyStats: { flexDirection: "row", justifyContent: "space-between" },
  statItem: { alignItems: "center", flex: 1 },
  statValue: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 10, fontWeight: "600", color: "#6b7280", textAlign: "center" },
  safetyNote: { fontSize: 11, color: durianTheme.colors.muted },

  // Legend
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 11, color: durianTheme.colors.muted },

  // Map
  mapContainer: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f0f7f1",
    borderWidth: 1,
    borderColor: durianTheme.colors.mist,
  },
  mapEmpty: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  mapEmptyText: { fontSize: 12, color: durianTheme.colors.muted },

  // Selected tree card
  selectedTreeCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: durianTheme.colors.moss,
    backgroundColor: "#f0f7f1",
    padding: 14,
    gap: 6,
  },
  selectedTreeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedTreeCode: {
    fontSize: 15,
    fontWeight: "800",
    color: durianTheme.colors.ink,
  },
  selectedTreeNickname: {
    fontSize: 12,
    color: durianTheme.colors.muted,
    marginTop: 1,
  },
  healthBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  healthBadgeText: { fontSize: 12, fontWeight: "700" },
  viewDetail: {
    fontSize: 12,
    color: durianTheme.colors.moss,
    fontWeight: "600",
  },

  // Section
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: durianTheme.colors.ink,
    marginBottom: 4,
  },

  // Tree rows
  treeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: durianTheme.colors.mist,
    backgroundColor: durianTheme.colors.surface,
  },
  treeRowSelected: {
    borderColor: durianTheme.colors.moss,
    backgroundColor: "#f0f7f1",
  },
  treeRowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  treeDot: { width: 10, height: 10, borderRadius: 5 },
  treeCode: { fontSize: 14, fontWeight: "700", color: durianTheme.colors.ink },
  treeVariety: { fontSize: 11, color: durianTheme.colors.muted },
  treeRowRight: { alignItems: "flex-end", gap: 2 },
  treeHealthLabel: { fontSize: 12, fontWeight: "700" },
  treeDiagCount: { fontSize: 11, color: durianTheme.colors.muted },
});
