import { CameraView, useCameraPermissions } from "expo-camera";
import {
  AlertCircle,
  CheckCircle2,
  Droplets,
  ExternalLink,
  Leaf,
  Loader2,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  ThermometerSun,
  X,
} from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { durianTheme } from "@/src/theme/durianTheme";
import { fetchPublicTrace, type PublicTraceData } from "@/src/lib/iotApi";

// ── Config ────────────────────────────────────────────────────────────────────

const WEB_BASE = (process.env.EXPO_PUBLIC_WEB_BASE_URL ?? "").replace(/\/$/, "");

// Extract traceability code from URL or raw code
function extractCode(raw: string): string | null {
  try {
    const url = new URL(raw);
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "traceability");
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  } catch {
    // Not a URL — check if it looks like a raw code (VN-*-YYYY-XXXX)
    if (/^VN-[A-Z0-9-]{5,30}$/i.test(raw.trim())) return raw.trim();
  }
  return null;
}

// ── Trace result card ─────────────────────────────────────────────────────────

function TraceCard({ data, onReset }: { data: PublicTraceData; onReset: () => void }) {
  const score = data.export_score;
  const scoreColor = score != null && score >= 80 ? "#059669"
    : score != null && score >= 70 ? "#d97706" : "#dc2626";
  const traceUrl = `${WEB_BASE}/traceability/${data.traceability_code}`;

  return (
    <ScrollView contentContainerStyle={styles.traceContent} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.traceHeader}>
        <View style={styles.traceHeaderIcon}>
          <ShieldCheck color={durianTheme.colors.durianYellow} size={26} />
        </View>
        <View style={styles.traceHeaderCopy}>
          <Text style={styles.traceHeaderEyebrow}>ĐÃ XÁC THỰC XUẤT XƯỞNG</Text>
          <Text style={styles.traceHeaderTitle}>{data.farm.name}</Text>
          <Text style={styles.traceHeaderSub}>{data.farm.variety} · {data.farm.batch_code}</Text>
        </View>
      </View>

      {/* Score */}
      {score != null && (
        <View style={[styles.scoreCard, { borderColor: scoreColor + "44" }]}>
          <Text style={[styles.scoreNum, { color: scoreColor }]}>{score}</Text>
          <Text style={styles.scoreDenom}>/100</Text>
          <Text style={[styles.scoreLabel, { color: scoreColor }]}>Điểm xuất khẩu</Text>
        </View>
      )}

      {/* Farm info */}
      <View style={styles.infoGrid}>
        <InfoCell label="Giống" value={data.farm.variety} />
        <InfoCell label="Thị trường" value={data.farm.target_market} />
        <InfoCell label="Bắt đầu vụ" value={data.farm.start_date ? new Date(data.farm.start_date).toLocaleDateString("vi-VN") : "—"} />
        <InfoCell label="Thu hoạch" value={data.farm.harvest_date ? new Date(data.farm.harvest_date).toLocaleDateString("vi-VN") : "—"} />
      </View>

      {/* Certifications */}
      <View style={styles.certSection}>
        <Text style={styles.sectionLabel}>Tiêu chuẩn đạt chuẩn</Text>
        <View style={styles.certRow}>
          {data.certification.standards.map((s) => (
            <View key={s} style={styles.certBadge}>
              <CheckCircle2 color="#059669" size={11} />
              <Text style={styles.certText}>{s}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Env averages */}
      {data.env_averages && (
        <View style={styles.envRow}>
          <View style={styles.envCard}>
            <ThermometerSun color="#d97706" size={18} />
            <Text style={styles.envVal}>
              {data.env_averages.avg_temperature != null ? `${data.env_averages.avg_temperature}°C` : "—"}
            </Text>
            <Text style={styles.envLabel}>Nhiệt độ TB</Text>
          </View>
          <View style={styles.envCard}>
            <Droplets color={durianTheme.colors.moss} size={18} />
            <Text style={styles.envVal}>
              {data.env_averages.avg_humidity != null ? `${data.env_averages.avg_humidity}%` : "—"}
            </Text>
            <Text style={styles.envLabel}>Độ ẩm TB</Text>
          </View>
          <View style={styles.envCard}>
            <Leaf color={durianTheme.colors.moss} size={18} />
            <Text style={styles.envVal}>{data.env_averages.reading_count}</Text>
            <Text style={styles.envLabel}>Lần đọc IoT</Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actRow}>
        <Pressable
          onPress={() => void Share.share({ message: traceUrl, title: "Hồ sơ truy xuất sầu riêng" })}
          style={({ pressed }) => [styles.actBtn, styles.actBtnOutline, pressed && styles.pressed]}
        >
          <ExternalLink color={durianTheme.colors.moss} size={14} />
          <Text style={styles.actBtnOutlineText}>Chia sẻ</Text>
        </Pressable>
        <Pressable
          onPress={() => void Linking.openURL(traceUrl)}
          style={({ pressed }) => [styles.actBtn, styles.actBtnFill, pressed && styles.pressed]}
        >
          <Text style={styles.actBtnFillText}>Mở hồ sơ đầy đủ</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={onReset}
        style={({ pressed }) => [styles.resetBtn, pressed && styles.pressed]}
      >
        <RefreshCw color={durianTheme.colors.moss} size={14} />
        <Text style={styles.resetBtnText}>Quét mã khác</Text>
      </Pressable>
    </ScrollView>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoCellLabel}>{label}</Text>
      <Text style={styles.infoCellVal}>{value}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function QrScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning,   setScanning]   = useState(true);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [traceData,  setTraceData]  = useState<PublicTraceData | null>(null);
  const processingRef = useRef(false);

  const handleBarcode = useCallback(async (data: string) => {
    if (processingRef.current || !scanning) return;
    const code = extractCode(data);
    if (!code) return;

    processingRef.current = true;
    setScanning(false);
    setLoading(true);
    setError(null);

    try {
      const trace = await fetchPublicTrace(code);
      setTraceData(trace);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tìm thấy hồ sơ truy xuất");
    } finally {
      setLoading(false);
      processingRef.current = false;
    }
  }, [scanning]);

  function reset() {
    setTraceData(null);
    setError(null);
    setScanning(true);
    processingRef.current = false;
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.centered}>
          <ActivityIndicator color={durianTheme.colors.moss} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.centered}>
          <QrCode color={durianTheme.colors.mist} size={48} />
          <Text style={styles.permTitle}>Cần quyền truy cập camera</Text>
          <Text style={styles.permSub}>DurianCare cần camera để quét mã QR trên tem dán thùng sầu riêng.</Text>
          {permission.canAskAgain && (
            <Pressable
              onPress={requestPermission}
              style={({ pressed }) => [styles.permBtn, pressed && styles.pressed]}
            >
              <Text style={styles.permBtnText}>Cấp quyền camera</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (traceData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TraceCard data={traceData} onReset={reset} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Camera scanner */}
      <View style={styles.cameraWrap}>
        {scanning && (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={(e) => void handleBarcode(e.data)}
          />
        )}

        {/* Scan frame */}
        <View pointerEvents="none" style={styles.scanFrame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          <ScanLine color={durianTheme.colors.durianYellow} size={28} />
        </View>

        {/* Hint */}
        {!loading && (
          <View pointerEvents="none" style={styles.hint}>
            <QrCode color={durianTheme.colors.mossDark} size={14} />
            <Text style={styles.hintText}>Đưa mã QR trên tem vào giữa khung</Text>
          </View>
        )}

        {/* Loading overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={durianTheme.colors.durianYellow} size="large" />
            <Text style={styles.loadingText}>Đang tra cứu hồ sơ...</Text>
          </View>
        )}

        {/* Error overlay */}
        {error && (
          <View style={styles.errorOverlay}>
            <AlertCircle color="#dc2626" size={20} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={reset}
              style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
            >
              <RefreshCw color={durianTheme.colors.white} size={14} />
              <Text style={styles.retryText}>Quét lại</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Header overlay */}
      <View pointerEvents="none" style={styles.headerOverlay}>
        <Text style={styles.headerEyebrow}>DURIANCARE</Text>
        <Text style={styles.headerTitle}>Quét QR truy xuất nguồn gốc</Text>
        <Text style={styles.headerSub}>Hướng camera vào mã QR trên tem dán thùng sầu riêng</Text>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea:     { backgroundColor: durianTheme.colors.mossDark, flex: 1 },

  // Camera
  cameraWrap:   { flex: 1, position: "relative" },
  camera:       { flex: 1 },
  scanFrame:    {
    alignItems: "center",
    borderColor: "rgba(238,210,105,0.3)",
    borderRadius: 22,
    borderWidth: 1,
    height: "42%",
    justifyContent: "center",
    left: "10%",
    position: "absolute",
    top: "22%",
    width: "80%",
  },
  corner:       { borderColor: durianTheme.colors.durianYellow, height: 28, position: "absolute", width: 28 },
  cornerTL:     { borderLeftWidth: 4, borderTopWidth: 4, left: -2, top: -2 },
  cornerTR:     { borderRightWidth: 4, borderTopWidth: 4, right: -2, top: -2 },
  cornerBL:     { borderBottomWidth: 4, borderLeftWidth: 4, bottom: -2, left: -2 },
  cornerBR:     { borderBottomWidth: 4, borderRightWidth: 4, bottom: -2, right: -2 },
  hint:         {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 20,
    bottom: 60,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    position: "absolute",
  },
  hintText:     { color: durianTheme.colors.mossDark, fontSize: 12, fontWeight: "900" },
  loadingOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(14,30,22,0.9)",
    bottom: 0,
    gap: 12,
    justifyContent: "center",
    left: 0,
    padding: 30,
    position: "absolute",
    right: 0,
    top: 0,
  },
  loadingText:  { color: durianTheme.colors.durianYellow, fontSize: 16, fontWeight: "900" },
  errorOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(14,30,22,0.92)",
    bottom: 0,
    gap: 14,
    justifyContent: "center",
    left: 0,
    padding: 30,
    position: "absolute",
    right: 0,
    top: 0,
  },
  errorText:    { color: "#fca5a5", fontSize: 14, fontWeight: "700", textAlign: "center" },
  retryBtn:     { alignItems: "center", backgroundColor: durianTheme.colors.moss, borderRadius: 14, flexDirection: "row", gap: 7, paddingHorizontal: 18, paddingVertical: 11 },
  retryText:    { color: "#fff", fontSize: 13, fontWeight: "900" },
  headerOverlay: {
    left: 18,
    paddingTop: 8,
    position: "absolute",
    right: 18,
    top: 10,
  },
  headerEyebrow: { color: durianTheme.colors.durianYellow, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  headerTitle:   { color: durianTheme.colors.white, fontSize: 22, fontWeight: "900", letterSpacing: -0.5, marginTop: 3 },
  headerSub:     { color: durianTheme.colors.mist, fontSize: 12, lineHeight: 18, marginTop: 5 },

  // Permissions
  centered:     { alignItems: "center", flex: 1, gap: 14, justifyContent: "center", padding: 32 },
  permTitle:    { color: durianTheme.colors.white, fontSize: 20, fontWeight: "900", textAlign: "center" },
  permSub:      { color: durianTheme.colors.mist, fontSize: 13, lineHeight: 19, textAlign: "center" },
  permBtn:      { alignItems: "center", backgroundColor: durianTheme.colors.durianYellow, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 13 },
  permBtnText:  { color: durianTheme.colors.mossDark, fontSize: 15, fontWeight: "900" },

  // Trace result
  traceContent:  { gap: 14, padding: 18, paddingBottom: 44, backgroundColor: durianTheme.colors.canvas },
  traceHeader:   { alignItems: "center", backgroundColor: durianTheme.colors.moss, borderRadius: 20, flexDirection: "row", gap: 14, padding: 18 },
  traceHeaderIcon: { alignItems: "center", backgroundColor: durianTheme.colors.mossDark, borderRadius: 22, height: 52, justifyContent: "center", width: 52 },
  traceHeaderCopy: { flex: 1 },
  traceHeaderEyebrow: { color: durianTheme.colors.durianYellow, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  traceHeaderTitle:   { color: durianTheme.colors.white, fontSize: 18, fontWeight: "900", marginTop: 3 },
  traceHeaderSub:     { color: durianTheme.colors.mist, fontSize: 12, marginTop: 2 },

  scoreCard:     { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderRadius: 20, borderWidth: 2, flexDirection: "row", gap: 6, justifyContent: "center", padding: 16 },
  scoreNum:      { fontSize: 40, fontWeight: "900" },
  scoreDenom:    { color: durianTheme.colors.muted, fontSize: 16, fontWeight: "700", marginTop: 10 },
  scoreLabel:    { fontSize: 13, fontWeight: "800", marginLeft: 4, marginTop: 14 },

  infoGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  infoCell:      { backgroundColor: durianTheme.colors.surface, borderRadius: 14, flex: 1, minWidth: "44%", padding: 12 },
  infoCellLabel: { color: durianTheme.colors.muted, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  infoCellVal:   { color: durianTheme.colors.ink, fontSize: 14, fontWeight: "900", marginTop: 4 },

  certSection:   { gap: 8 },
  sectionLabel:  { color: durianTheme.colors.ink, fontSize: 13, fontWeight: "900" },
  certRow:       { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  certBadge:     { alignItems: "center", backgroundColor: "#ecfdf5", borderRadius: 20, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 5 },
  certText:      { color: "#059669", fontSize: 11, fontWeight: "700" },

  envRow:        { flexDirection: "row", gap: 8 },
  envCard:       { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderRadius: 16, flex: 1, gap: 5, padding: 12 },
  envVal:        { color: durianTheme.colors.ink, fontSize: 17, fontWeight: "900" },
  envLabel:      { color: durianTheme.colors.muted, fontSize: 10, textAlign: "center" },

  actRow:        { flexDirection: "row", gap: 10 },
  actBtn:        { alignItems: "center", borderRadius: 14, flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", paddingVertical: 13 },
  actBtnOutline: { borderColor: "#dfe5de", borderWidth: 1 },
  actBtnOutlineText: { color: durianTheme.colors.moss, fontSize: 13, fontWeight: "800" },
  actBtnFill:    { backgroundColor: durianTheme.colors.moss },
  actBtnFillText: { color: "#fff", fontSize: 13, fontWeight: "900" },

  resetBtn:      { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "center", paddingVertical: 10 },
  resetBtnText:  { color: durianTheme.colors.moss, fontSize: 13, fontWeight: "800" },

  pressed:       { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
