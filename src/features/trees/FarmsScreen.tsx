import { Plus, TreePine } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { durianTheme } from "@/src/theme/durianTheme";
import {
  createFarm,
  createZone,
  generateTrees,
  listFarms,
  listZones,
} from "./treeApi";
import type { FarmSummary, ZoneSummary } from "./treeTypes";

// ── Create Farm Modal ─────────────────────────────────────────────────────────

function CreateFarmModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (farm: FarmSummary) => void;
}) {
  const [name, setName] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(""); setProvince(""); setDistrict(""); };

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert("Lỗi", "Tên trang trại là bắt buộc.");
      return;
    }
    setSaving(true);
    try {
      const farm = await createFarm({
        name: name.trim(),
        province: province.trim() || null,
        district: district.trim() || null,
      });
      reset();
      onCreated(farm);
    } catch (err) {
      Alert.alert(
        "Lỗi",
        err instanceof Error ? err.message : "Tạo trang trại thất bại.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <Text style={modal.title}>Tạo trang trại mới</Text>
          <TextInput
            style={modal.input}
            placeholder="Tên trang trại *"
            value={name}
            onChangeText={setName}
            placeholderTextColor={durianTheme.colors.muted}
          />
          <TextInput
            style={modal.input}
            placeholder="Tỉnh/Thành (tùy chọn)"
            value={province}
            onChangeText={setProvince}
            placeholderTextColor={durianTheme.colors.muted}
          />
          <TextInput
            style={modal.input}
            placeholder="Quận/Huyện (tùy chọn)"
            value={district}
            onChangeText={setDistrict}
            placeholderTextColor={durianTheme.colors.muted}
          />
          <View style={modal.actions}>
            <Pressable style={modal.cancelBtn} onPress={() => { reset(); onClose(); }}>
              <Text style={modal.cancelText}>Hủy</Text>
            </Pressable>
            <Pressable style={[modal.saveBtn, saving && modal.disabled]} onPress={submit} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={modal.saveText}>Tạo</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Create Zone + Generate Trees Modal ───────────────────────────────────────

function CreateZoneModal({
  visible,
  farmId,
  onClose,
  onCreated,
}: {
  visible: boolean;
  farmId: string;
  onClose: () => void;
  onCreated: (zone: ZoneSummary) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [rows, setRows] = useState("");
  const [treesPerRow, setTreesPerRow] = useState("");
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(""); setCode(""); setRows(""); setTreesPerRow(""); setAutoGenerate(true);
  };

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert("Lỗi", "Tên vùng là bắt buộc.");
      return;
    }
    const r = rows ? parseInt(rows, 10) : undefined;
    const t = treesPerRow ? parseInt(treesPerRow, 10) : undefined;
    if (autoGenerate && (!r || !t || r < 1 || t < 1)) {
      Alert.alert("Lỗi", "Cần nhập số hàng và số cây/hàng hợp lệ để tạo cây tự động.");
      return;
    }
    setSaving(true);
    try {
      const zone = await createZone(farmId, {
        name: name.trim(),
        code: code.trim() || null,
        rowCount: r ?? null,
        treesPerRow: t ?? null,
      });
      if (autoGenerate && r && t) {
        try {
          const result = await generateTrees(zone.id, { rows: r, treesPerRow: t });
          Alert.alert("Thành công", `Đã tạo vùng "${zone.name}" và ${result.generated} cây.`);
        } catch {
          Alert.alert("Tạo vùng thành công", `Vùng "${zone.name}" đã tạo nhưng tạo cây tự động thất bại.`);
        }
      } else {
        Alert.alert("Thành công", `Đã tạo vùng "${zone.name}".`);
      }
      reset();
      onCreated(zone);
    } catch (err) {
      Alert.alert(
        "Lỗi",
        err instanceof Error ? err.message : "Tạo vùng thất bại.",
      );
    } finally {
      setSaving(false);
    }
  };

  const total = rows && treesPerRow ? parseInt(rows, 10) * parseInt(treesPerRow, 10) : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <ScrollView contentContainerStyle={modal.scrollContent}>
          <View style={modal.sheet}>
            <Text style={modal.title}>Tạo vùng trồng mới</Text>
            <TextInput
              style={modal.input}
              placeholder="Tên vùng *"
              value={name}
              onChangeText={setName}
              placeholderTextColor={durianTheme.colors.muted}
            />
            <TextInput
              style={modal.input}
              placeholder="Mã vùng (tùy chọn)"
              value={code}
              onChangeText={setCode}
              placeholderTextColor={durianTheme.colors.muted}
            />

            {/* Toggle auto-generate */}
            <Pressable
              style={styles.toggleRow}
              onPress={() => setAutoGenerate((v) => !v)}
            >
              <View style={[styles.toggleBox, autoGenerate && styles.toggleBoxActive]}>
                {autoGenerate ? <Text style={styles.toggleCheck}>✓</Text> : null}
              </View>
              <Text style={styles.toggleLabel}>Tạo cây tự động theo lưới</Text>
            </Pressable>

            {autoGenerate ? (
              <>
                <View style={modal.row}>
                  <TextInput
                    style={[modal.input, modal.halfInput]}
                    placeholder="Số hàng"
                    keyboardType="number-pad"
                    value={rows}
                    onChangeText={setRows}
                    placeholderTextColor={durianTheme.colors.muted}
                  />
                  <TextInput
                    style={[modal.input, modal.halfInput]}
                    placeholder="Cây/hàng"
                    keyboardType="number-pad"
                    value={treesPerRow}
                    onChangeText={setTreesPerRow}
                    placeholderTextColor={durianTheme.colors.muted}
                  />
                </View>
                {total && total > 0 ? (
                  <Text style={modal.hint}>
                    Sẽ tạo tối đa {total} cây (H01-C01 → H{rows.padStart(2, "0")}-C{treesPerRow.padStart(2, "0")})
                  </Text>
                ) : null}
              </>
            ) : null}

            <View style={modal.actions}>
              <Pressable style={modal.cancelBtn} onPress={() => { reset(); onClose(); }}>
                <Text style={modal.cancelText}>Hủy</Text>
              </Pressable>
              <Pressable style={[modal.saveBtn, saving && modal.disabled]} onPress={submit} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={modal.saveText}>Tạo</Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── ZoneRow ───────────────────────────────────────────────────────────────────

function ZoneRow({ zone, farmId }: { zone: ZoneSummary; farmId: string }) {
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
        {zone.code ? <Text style={styles.zoneCode}>{zone.code}</Text> : null}
        {zone.rowCount && zone.treesPerRow ? (
          <Text style={styles.zoneGrid}>
            {zone.rowCount} hàng × {zone.treesPerRow} cây/hàng
          </Text>
        ) : null}
      </View>
      <Text style={styles.zoneTreeCount}>{zone.treeCount} cây →</Text>
    </Pressable>
  );
}

// ── FarmCard ──────────────────────────────────────────────────────────────────

function FarmCard({ farm }: { farm: FarmSummary }) {
  const [expanded, setExpanded] = useState(false);
  const [zones, setZones] = useState<ZoneSummary[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [addingZone, setAddingZone] = useState(false);

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
          ) : (
            <>
              {zones.map((zone) => (
                <ZoneRow key={zone.id} zone={zone} farmId={farm.id} />
              ))}
              <Pressable
                style={styles.addZoneBtn}
                onPress={() => setAddingZone(true)}
              >
                <Plus size={14} color={durianTheme.colors.moss} />
                <Text style={styles.addZoneText}>Thêm vùng trồng</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}

      <CreateZoneModal
        visible={addingZone}
        farmId={farm.id}
        onClose={() => setAddingZone(false)}
        onCreated={(zone) => {
          setZones((prev) => [...prev, zone]);
          setAddingZone(false);
        }}
      />
    </View>
  );
}

// ── FarmsScreen ───────────────────────────────────────────────────────────────

export function FarmsScreen() {
  const [farms, setFarms] = useState<FarmSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingFarm, setCreatingFarm] = useState(false);

  useEffect(() => {
    let active = true;
    listFarms()
      .then((data) => { if (active) setFarms(data); })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Không thể tải danh sách trang trại.");
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <DurianScreenHeader
        eyebrow="TRANG TRẠI"
        icon={TreePine}
        title="Bản đồ cây"
        subtitle="Chọn trang trại và vùng trồng để xem bản đồ cây"
      />
      {!loading && !error ? (
        <View style={styles.topBar}>
          <Pressable style={styles.createFarmBtn} onPress={() => setCreatingFarm(true)}>
            <Plus size={14} color="#fff" />
            <Text style={styles.createFarmText}>Tạo trang trại</Text>
          </Pressable>
        </View>
      ) : null}

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
          <Text style={styles.emptyText}>Chưa có trang trại nào.</Text>
          <Pressable style={styles.createFirstBtn} onPress={() => setCreatingFarm(true)}>
            <Plus size={16} color="#fff" />
            <Text style={styles.createFirstText}>Tạo trang trại đầu tiên</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={farms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FarmCard farm={item} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      <CreateFarmModal
        visible={creatingFarm}
        onClose={() => setCreatingFarm(false)}
        onCreated={(farm) => {
          setFarms((prev) => [...prev, farm]);
          setCreatingFarm(false);
        }}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: durianTheme.colors.canvas },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  listContent: { padding: 16, gap: 12 },
  emptyText: { fontSize: 14, color: durianTheme.colors.muted, textAlign: "center" },
  errorBox: {
    margin: 16, padding: 14, borderRadius: 12,
    backgroundColor: "#fee2e2", borderWidth: 1, borderColor: "#fca5a5",
  },
  errorText: { fontSize: 13, color: "#dc2626", fontWeight: "600" },
  createFirstBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: durianTheme.colors.moss, paddingHorizontal: 20,
    paddingVertical: 12, borderRadius: 14,
  },
  createFirstText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  topBar: {
    flexDirection: "row", justifyContent: "flex-end",
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: durianTheme.colors.mist,
  },
  createFarmBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: durianTheme.colors.moss, paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 12,
  },
  createFarmText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  farmCard: {
    borderRadius: 16, borderWidth: 1,
    borderColor: durianTheme.colors.mist,
    backgroundColor: durianTheme.colors.surface, overflow: "hidden",
  },
  farmHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  farmIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "#edf3ee",
    alignItems: "center", justifyContent: "center",
  },
  farmInfo: { flex: 1 },
  farmName: { fontSize: 15, fontWeight: "800", color: durianTheme.colors.ink },
  farmLocation: { fontSize: 12, color: durianTheme.colors.muted, marginTop: 2 },
  farmMeta: { alignItems: "flex-end", gap: 2 },
  farmZoneCount: {
    fontSize: 12, fontWeight: "700", color: durianTheme.colors.moss,
    backgroundColor: "#edf3ee", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20,
  },
  chevron: { fontSize: 10, color: durianTheme.colors.muted },

  zonesContainer: {
    borderTopWidth: 1, borderTopColor: durianTheme.colors.mist, padding: 12, gap: 8,
  },
  zoneRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 12, borderRadius: 12, borderWidth: 1,
    borderColor: durianTheme.colors.mist, backgroundColor: durianTheme.colors.canvas,
  },
  zoneRowInner: { flex: 1 },
  zoneName: { fontSize: 14, fontWeight: "700", color: durianTheme.colors.ink },
  zoneCode: { fontSize: 11, color: durianTheme.colors.muted, marginTop: 1 },
  zoneGrid: { fontSize: 11, color: durianTheme.colors.muted, marginTop: 1 },
  zoneTreeCount: { fontSize: 12, fontWeight: "700", color: durianTheme.colors.moss },
  addZoneBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, padding: 10,
    borderRadius: 10, borderWidth: 1.5, borderStyle: "dashed",
    borderColor: durianTheme.colors.moss,
  },
  addZoneText: { fontSize: 13, fontWeight: "700", color: durianTheme.colors.moss },

  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  toggleBox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 1.5,
    borderColor: durianTheme.colors.mist, alignItems: "center", justifyContent: "center",
  },
  toggleBoxActive: { backgroundColor: durianTheme.colors.moss, borderColor: durianTheme.colors.moss },
  toggleCheck: { color: "#fff", fontSize: 12, fontWeight: "800" },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: durianTheme.colors.ink },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  scrollContent: { justifyContent: "flex-end", flexGrow: 1 },
  sheet: {
    backgroundColor: durianTheme.colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 12,
  },
  title: { fontSize: 18, fontWeight: "800", color: durianTheme.colors.ink, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: durianTheme.colors.mist,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: durianTheme.colors.ink,
    backgroundColor: durianTheme.colors.canvas,
  },
  row: { flexDirection: "row", gap: 10 },
  halfInput: { flex: 1 },
  hint: { fontSize: 12, color: durianTheme.colors.muted },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1,
    borderColor: durianTheme.colors.mist, alignItems: "center",
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: durianTheme.colors.ink },
  saveBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: durianTheme.colors.moss, alignItems: "center",
  },
  saveText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  disabled: { opacity: 0.6 },
});
