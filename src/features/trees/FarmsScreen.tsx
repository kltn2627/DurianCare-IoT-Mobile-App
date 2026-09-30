import { TreePine, MapPin } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { durianTheme } from "@/src/theme/durianTheme";
import { listFarms, listZones } from "./treeApi";
import type { FarmSummary, ZoneSummary } from "./treeTypes";

function ZoneRow({
  zone,
  farmId,
}: {
  zone: ZoneSummary;
  farmId: string;
}) {
  const router = useRouter();
  return (
    <Pressable
      style={styles.zoneRow}
      onPress={() =>
        router.push({
          pathname: "/(main)/farms/[farmId]/zones/[zoneId]",
          params: { farmId, zoneId: zone.id },
        })
      }
    >
      <View style={styles.zoneRowInner}>
        <Text style={styles.zoneName}>{zone.name}</Text>
        {zone.code ? (
          <Text style={styles.zoneCode}>{zone.code}</Text>
        ) : null}
      </View>
      <Text style={styles.zoneTreeCount}>{zone.treeCount} cây →</Text>
    </Pressable>
  );
}

function FarmCard({ farm }: { farm: FarmSummary }) {
  const [expanded, setExpanded] = useState(false);
  const [zones, setZones] = useState<ZoneSummary[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);

  const loadZones = useCallback(() => {
    if (zones.length > 0) return;
    setZonesLoading(true);
    listZones(farm.id)
      .then(setZones)
      .catch(() => {})
      .finally(() => setZonesLoading(false));
  }, [farm.id, zones.length]);

  const toggle = () => {
    if (!expanded) loadZones();
    setExpanded((v) => !v);
  };

  const locationStr = [farm.province, farm.district].filter(Boolean).join(", ");

  return (
    <View style={styles.farmCard}>
      <Pressable style={styles.farmHeader} onPress={toggle}>
        <View style={styles.farmIconWrap}>
          <TreePine size={20} color={durianTheme.colors.moss} />
        </View>
        <View style={styles.farmInfo}>
          <Text style={styles.farmName}>{farm.name}</Text>
          {locationStr ? (
            <Text style={styles.farmLocation}>{locationStr}</Text>
          ) : null}
        </View>
        <View style={styles.farmMeta}>
          <Text style={styles.farmZoneCount}>{farm.zoneCount} vùng</Text>
          <Text style={styles.chevron}>{expanded ? "▲" : "▼"}</Text>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.zonesContainer}>
          {zonesLoading ? (
            <ActivityIndicator size="small" color={durianTheme.colors.moss} />
          ) : zones.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có vùng trồng nào.</Text>
          ) : (
            zones.map((zone) => (
              <ZoneRow key={zone.id} zone={zone} farmId={farm.id} />
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

export function FarmsScreen() {
  const [farms, setFarms] = useState<FarmSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listFarms()
      .then((data) => {
        if (active) setFarms(data);
      })
      .catch((err) => {
        if (active) {
          const message =
            err instanceof Error
              ? err.message
              : "Không thể tải danh sách trang trại.";
          setError(message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <DurianScreenHeader
        eyebrow="TRANG TRẠI"
        icon={TreePine}
        title="Bản đồ cây"
        subtitle="Chọn trang trại và vùng trồng để xem bản đồ cây"
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={durianTheme.colors.moss} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : farms.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            Chưa có trang trại nào. Tạo trang trại để bắt đầu.
          </Text>
        </View>
      ) : (
        <FlatList
          data={farms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FarmCard farm={item} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: durianTheme.colors.canvas },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  listContent: { padding: 16, gap: 12 },
  emptyText: { fontSize: 14, color: durianTheme.colors.muted, textAlign: "center" },
  errorBox: {
    margin: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  errorText: { fontSize: 13, color: "#dc2626", fontWeight: "600" },

  farmCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: durianTheme.colors.mist,
    backgroundColor: durianTheme.colors.surface,
    overflow: "hidden",
  },
  farmHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  farmIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#edf3ee",
    alignItems: "center",
    justifyContent: "center",
  },
  farmInfo: { flex: 1 },
  farmName: { fontSize: 15, fontWeight: "800", color: durianTheme.colors.ink },
  farmLocation: { fontSize: 12, color: durianTheme.colors.muted, marginTop: 2 },
  farmMeta: { alignItems: "flex-end", gap: 2 },
  farmZoneCount: {
    fontSize: 12,
    fontWeight: "700",
    color: durianTheme.colors.moss,
    backgroundColor: "#edf3ee",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  chevron: { fontSize: 10, color: durianTheme.colors.muted },

  zonesContainer: {
    borderTopWidth: 1,
    borderTopColor: durianTheme.colors.mist,
    padding: 12,
    gap: 8,
  },
  zoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: durianTheme.colors.mist,
    backgroundColor: durianTheme.colors.canvas,
  },
  zoneRowInner: { flex: 1 },
  zoneName: { fontSize: 14, fontWeight: "700", color: durianTheme.colors.ink },
  zoneCode: { fontSize: 11, color: durianTheme.colors.muted, marginTop: 1 },
  zoneTreeCount: { fontSize: 12, fontWeight: "700", color: durianTheme.colors.moss },
});
