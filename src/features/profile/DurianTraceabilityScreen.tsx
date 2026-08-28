import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
  PackageCheck,
  QrCode as QrCodeIcon,
  RefreshCw,
  Sprout,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";
import {
  fetchBatches,
  finalizeBatch,
  updateBatchStatus,
  type BatchStatus,
  type FarmingBatch,
  type FinalizeResult,
} from "@/src/lib/iotApi";

// ── Config ────────────────────────────────────────────────────────────────────

const WEB_BASE = (process.env.EXPO_PUBLIC_WEB_BASE_URL ?? "").replace(/\/$/, "");

const STATUS_LABEL: Record<BatchStatus, string> = {
  PLANNED:    "Kế hoạch",
  GROWING:    "Đang canh tác",
  HARVESTING: "Thu hoạch",
  EVALUATING: "Đánh giá XK",
  EXPORTED:   "Đã xuất xưởng ✓",
};

const STATUS_COLOR: Record<BatchStatus, string> = {
  PLANNED:    "#6b7280",
  GROWING:    "#16a34a",
  HARVESTING: "#d97706",
  EVALUATING: "#2563eb",
  EXPORTED:   "#059669",
};

const LIFECYCLE: BatchStatus[] = ["PLANNED", "GROWING", "HARVESTING", "EVALUATING"];

// ── QR Modal ──────────────────────────────────────────────────────────────────

function QrModal({
  result,
  onClose,
}: {
  result: FinalizeResult | { traceability_code: string; batch_code: string; export_score: number | null };
  onClose: () => void;
}) {
  const traceUrl = `${WEB_BASE}/traceability/${result.traceability_code}`;

  function handleShare() {
    void Share.share({ message: traceUrl, title: `QR Truy xuất: ${result.batch_code}` });
  }

  function handleOpenLink() {
    void Linking.openURL(traceUrl);
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={qrStyles.backdrop}>
        <View style={qrStyles.card}>
          <Pressable hitSlop={14} onPress={onClose} style={qrStyles.closeBtn}>
            <X color={durianTheme.colors.ink} size={20} />
          </Pressable>

          <View style={qrStyles.iconWrap}>
            <PackageCheck color={durianTheme.colors.durianYellow} size={26} />
          </View>
          <Text style={qrStyles.title}>QR Truy xuất nguồn gốc</Text>
          <Text style={qrStyles.subtitle}>{result.batch_code}</Text>

          <View style={qrStyles.qrWrap}>
            <QRCode
              backgroundColor={durianTheme.colors.white}
              color={durianTheme.colors.mossDark}
              size={200}
              value={traceUrl}
            />
          </View>

          {result.export_score != null && (
            <View style={qrStyles.scorePill}>
              <CheckCircle2 color="#059669" size={13} />
              <Text style={qrStyles.scoreText}>Điểm xuất khẩu: {result.export_score}/100</Text>
            </View>
          )}

          <Text numberOfLines={3} style={qrStyles.url}>{traceUrl}</Text>

          <View style={qrStyles.btnRow}>
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [qrStyles.btn, qrStyles.btnOutline, pressed && qrStyles.pressed]}
            >
              <Text style={qrStyles.btnOutlineText}>Chia sẻ liên kết</Text>
            </Pressable>
            <Pressable
              onPress={handleOpenLink}
              style={({ pressed }) => [qrStyles.btn, qrStyles.btnFill, pressed && qrStyles.pressed]}
            >
              <Text style={qrStyles.btnFillText}>Mở trang tra cứu</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Batch card ────────────────────────────────────────────────────────────────

function BatchCard({
  batch,
  onStatusChange,
  onFinalize,
  onShowQr,
  busy,
}: {
  batch: FarmingBatch;
  onStatusChange: (id: string, status: BatchStatus) => Promise<void>;
  onFinalize: (id: string) => Promise<void>;
  onShowQr: (b: FarmingBatch) => void;
  busy: boolean;
}) {
  const statusColor = STATUS_COLOR[batch.status];
  const idx = LIFECYCLE.indexOf(batch.status);
  const nextStatus: BatchStatus | null = idx >= 0 && idx < LIFECYCLE.length - 1
    ? LIFECYCLE[idx + 1]
    : null;

  return (
    <View style={styles.batchCard}>
      <View style={styles.batchTop}>
        <View style={styles.batchIcon}>
          <CalendarDays color={durianTheme.colors.moss} size={20} />
        </View>
        <View style={styles.batchCopy}>
          <Text style={styles.batchCode}>{batch.batch_code}</Text>
          <Text style={styles.batchMeta}>
            {batch.farm_name || "—"} · {batch.variety || "Sầu riêng"} · {batch.target_market}
          </Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {STATUS_LABEL[batch.status]}
          </Text>
        </View>
        {batch.export_score != null && (
          <Text style={styles.scoreChip}>Điểm: {batch.export_score}</Text>
        )}
      </View>

      {batch.start_date && (
        <Text style={styles.dateText}>
          Bắt đầu: {new Date(batch.start_date).toLocaleDateString("vi-VN")}
          {batch.harvest_date ? `  ·  Thu hoạch: ${new Date(batch.harvest_date).toLocaleDateString("vi-VN")}` : ""}
        </Text>
      )}

      {/* Actions */}
      <View style={styles.actionRow}>
        {batch.status !== "EXPORTED" && nextStatus && (
          <Pressable
            disabled={busy}
            onPress={() => onStatusChange(batch.id, nextStatus)}
            style={({ pressed }) => [styles.actionBtn, styles.actionBtnOutline, pressed && styles.pressed, busy && styles.disabled]}
          >
            <Text style={styles.actionBtnOutlineText}>
              {busy ? "..." : `→ ${STATUS_LABEL[nextStatus]}`}
            </Text>
          </Pressable>
        )}
        {batch.status === "EVALUATING" && (
          <Pressable
            disabled={busy}
            onPress={() => onFinalize(batch.id)}
            style={({ pressed }) => [styles.actionBtn, styles.actionBtnGreen, pressed && styles.pressed, busy && styles.disabled]}
          >
            {busy
              ? <ActivityIndicator color="#fff" size={12} />
              : <PackageCheck color="#fff" size={14} />
            }
            <Text style={styles.actionBtnGreenText}>
              {busy ? "Đang xuất..." : "Đóng gói & Tạo QR"}
            </Text>
          </Pressable>
        )}
        {batch.status === "EXPORTED" && batch.traceability_code && (
          <Pressable
            onPress={() => onShowQr(batch)}
            style={({ pressed }) => [styles.actionBtn, styles.actionBtnQr, pressed && styles.pressed]}
          >
            <QrCodeIcon color={durianTheme.colors.mossDark} size={14} />
            <Text style={styles.actionBtnQrText}>Xem mã QR xuất xưởng</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function DurianTraceabilityScreen() {
  const navigation = useDurianSafeNavigation();
  const { session } = useSession();
  const [batches,   setBatches]   = useState<FarmingBatch[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [busyId,    setBusyId]    = useState<string | null>(null);
  const [qrTarget,  setQrTarget]  = useState<FarmingBatch | FinalizeResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBatches();
      setBatches(res.batches);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleStatusChange(id: string, status: BatchStatus) {
    setBusyId(id);
    try {
      const updated = await updateBatchStatus(id, status);
      setBatches((prev) => prev.map((b) => b.id === id ? { ...b, status: updated.status } : b));
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Cập nhật thất bại");
    } finally {
      setBusyId(null);
    }
  }

  async function handleFinalize(id: string) {
    setBusyId(id);
    try {
      const result = await finalizeBatch(id);
      setBatches((prev) => prev.map((b) =>
        b.id === id
          ? { ...b, status: "EXPORTED", traceability_code: result.traceability_code, export_score: result.export_score }
          : b
      ));
      setQrTarget(result);
    } catch (e) {
      Alert.alert("Xuất xưởng thất bại", e instanceof Error ? e.message : "Vui lòng thử lại");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <DurianScreenHeader
        eyebrow="HỒ SƠ & TRUY XUẤT"
        icon={Sprout}
        title="Định danh vụ mùa"
        subtitle="Quản lý vòng đời lô hàng và tạo QR cho thương lái kiểm tra nguồn gốc."
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.monogram}>
            <Text style={styles.monogramText}>
              {session?.user.role === "OWNER" ? "NM" : "TA"}
            </Text>
          </View>
          <Text style={styles.name}>{session?.user.name}</Text>
          <Text style={styles.email}>{session?.user.email}</Text>
          <View style={styles.locationRow}>
            <MapPin color={durianTheme.colors.durianYellow} size={16} />
            <Text style={styles.location}>Krông Pắc, Đắk Lắk</Text>
          </View>
        </View>

        {/* QR Scanner shortcut */}
        <Pressable
          onPress={() => navigation.push("/(main)/qr-scan")}
          style={({ pressed }) => [styles.scannerBtn, pressed && styles.pressed]}
        >
          <QrCodeIcon color={durianTheme.colors.mossDark} size={20} />
          <Text style={styles.scannerBtnText}>Quét mã QR tem dán thùng sầu riêng</Text>
        </Pressable>

        {/* Batches */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Danh sách lô mùa vụ ({batches.length})</Text>
          <Pressable hitSlop={10} onPress={load} style={({ pressed }) => [pressed && styles.pressed]}>
            <RefreshCw color={durianTheme.colors.moss} size={16} />
          </Pressable>
        </View>

        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator color={durianTheme.colors.moss} size="large" />
            <Text style={styles.loadingText}>Đang tải dữ liệu lô hàng...</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.errorBox}>
            <AlertCircle color="#dc2626" size={15} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!loading && !error && batches.length === 0 && (
          <View style={styles.emptyState}>
            <CalendarDays color={durianTheme.colors.mist} size={38} />
            <Text style={styles.emptyTitle}>Chưa có lô nào</Text>
            <Text style={styles.emptySubtitle}>Thêm dữ liệu lô mùa vụ qua Backend migration.</Text>
          </View>
        )}

        {batches.map((batch) => (
          <BatchCard
            key={batch.id}
            batch={batch}
            busy={busyId === batch.id}
            onStatusChange={handleStatusChange}
            onFinalize={handleFinalize}
            onShowQr={(b) => setQrTarget(b)}
          />
        ))}
      </ScrollView>

      {qrTarget && (
        <QrModal
          result={
            "traceability_url" in qrTarget
              ? (qrTarget as FinalizeResult)
              : {
                  traceability_code: (qrTarget as FarmingBatch).traceability_code!,
                  batch_code:        (qrTarget as FarmingBatch).batch_code,
                  export_score:      (qrTarget as FarmingBatch).export_score,
                }
          }
          onClose={() => setQrTarget(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea:          { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  content:           { gap: 14, padding: 18, paddingBottom: 44 },

  profileCard:       { alignItems: "center", backgroundColor: durianTheme.colors.moss, borderRadius: durianTheme.radius.lg, gap: 8, padding: durianTheme.spacing.xl },
  monogram:          { alignItems: "center", backgroundColor: durianTheme.colors.durianYellow, borderRadius: 36, height: 72, justifyContent: "center", width: 72 },
  monogramText:      { color: durianTheme.colors.mossDark, fontSize: 23, fontWeight: "900" },
  name:              { color: durianTheme.colors.white, fontSize: 21, fontWeight: "900", textAlign: "center" },
  email:             { color: durianTheme.colors.mist, fontSize: 12 },
  locationRow:       { alignItems: "center", flexDirection: "row", gap: 6 },
  location:          { color: durianTheme.colors.mist, fontSize: 13, fontWeight: "700" },

  scannerBtn:        { alignItems: "center", backgroundColor: durianTheme.colors.durianYellow, borderRadius: 16, flexDirection: "row", gap: 10, justifyContent: "center", paddingVertical: 14 },
  scannerBtnText:    { color: durianTheme.colors.mossDark, fontSize: 14, fontWeight: "900" },

  sectionHeader:     { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle:      { color: durianTheme.colors.ink, fontSize: 17, fontWeight: "900" },

  centered:          { alignItems: "center", gap: 12, paddingVertical: 40 },
  loadingText:       { color: durianTheme.colors.muted, fontSize: 13 },

  errorBox:          { alignItems: "center", backgroundColor: "#fef2f2", borderRadius: 14, flexDirection: "row", gap: 10, padding: 14 },
  errorText:         { color: "#dc2626", flex: 1, fontSize: 13 },

  emptyState:        { alignItems: "center", gap: 10, paddingVertical: 40 },
  emptyTitle:        { color: durianTheme.colors.ink, fontSize: 16, fontWeight: "900" },
  emptySubtitle:     { color: durianTheme.colors.muted, fontSize: 13, textAlign: "center" },

  batchCard:         { backgroundColor: durianTheme.colors.surface, borderColor: "#ECE8D8", borderRadius: durianTheme.radius.md, borderWidth: 1, gap: 10, padding: 16 },
  batchTop:          { alignItems: "center", flexDirection: "row", gap: 11 },
  batchIcon:         { alignItems: "center", backgroundColor: durianTheme.colors.mossSoft, borderRadius: 13, height: 44, justifyContent: "center", width: 44 },
  batchCopy:         { flex: 1 },
  batchCode:         { color: durianTheme.colors.ink, fontSize: 14, fontWeight: "900" },
  batchMeta:         { color: durianTheme.colors.muted, fontSize: 11, marginTop: 2 },

  statusRow:         { alignItems: "center", flexDirection: "row", gap: 8 },
  statusBadge:       { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusText:        { fontSize: 11, fontWeight: "900" },
  scoreChip:         { color: "#059669", fontSize: 11, fontWeight: "700" },
  dateText:          { color: durianTheme.colors.muted, fontSize: 11 },

  actionRow:         { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionBtn:         { alignItems: "center", borderRadius: 12, flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 9 },
  actionBtnOutline:  { borderColor: "#dfe5de", borderWidth: 1 },
  actionBtnOutlineText: { color: durianTheme.colors.muted, fontSize: 11, fontWeight: "700" },
  actionBtnGreen:    { backgroundColor: "#059669" },
  actionBtnGreenText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  actionBtnQr:       { backgroundColor: durianTheme.colors.durianYellow },
  actionBtnQrText:   { color: durianTheme.colors.mossDark, fontSize: 11, fontWeight: "900" },

  pressed:           { opacity: 0.78, transform: [{ scale: 0.98 }] },
  disabled:          { opacity: 0.5 },
});

const qrStyles = StyleSheet.create({
  backdrop:    { alignItems: "center", backgroundColor: "rgba(20, 38, 29, 0.75)", flex: 1, justifyContent: "center", padding: 22 },
  card:        { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderRadius: durianTheme.radius.lg, gap: 10, maxWidth: 380, padding: 24, width: "100%" },
  closeBtn:    { position: "absolute", right: 16, top: 16, zIndex: 2 },
  iconWrap:    { alignItems: "center", backgroundColor: durianTheme.colors.moss, borderRadius: 23, height: 46, justifyContent: "center", width: 46 },
  title:       { color: durianTheme.colors.ink, fontSize: 20, fontWeight: "900" },
  subtitle:    { color: durianTheme.colors.muted, fontSize: 12, textAlign: "center" },
  qrWrap:      { backgroundColor: durianTheme.colors.white, borderRadius: 18, padding: 14 },
  scorePill:   { alignItems: "center", backgroundColor: "#ecfdf5", borderRadius: 20, flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  scoreText:   { color: "#059669", fontSize: 12, fontWeight: "800" },
  url:         { color: durianTheme.colors.moss, fontSize: 9, lineHeight: 14, textAlign: "center" },
  btnRow:      { flexDirection: "row", gap: 10, width: "100%" },
  btn:         { alignItems: "center", borderRadius: 14, flex: 1, justifyContent: "center", paddingVertical: 12 },
  btnOutline:  { borderColor: "#dfe5de", borderWidth: 1 },
  btnOutlineText: { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "800" },
  btnFill:     { backgroundColor: durianTheme.colors.moss },
  btnFillText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  pressed:     { opacity: 0.78 },
});
