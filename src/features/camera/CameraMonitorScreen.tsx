import {
  AlertCircle,
  Brain,
  Camera,
  CheckCircle2,
  Clock,
  Leaf,
  Loader2,
  RefreshCw,
  ShieldAlert,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { durianTheme } from "@/src/theme/durianTheme";
import {
  captureNow,
  fetchCameraHistory,
  getSnapshotUrl,
  type CameraCapture,
} from "@/src/lib/iotApi";

// ── Config ────────────────────────────────────────────────────────────────────

const DEVICE_ID    = "esp32-cam-01";
const PREVIEW_POLL = 3_000;

const DISEASE_NAMES: Record<string, string> = {
  ALGAL_LEAF_SPOT:     "Đốm rong tảo",
  ALLOCARIDARA_ATTACK: "Sâu Allocaridara",
  HEALTHY_LEAF:        "Lá khỏe mạnh",
  LEAF_BLIGHT:         "Cháy lá",
  PHOMOPSIS_LEAF_SPOT: "Đốm lá Phomopsis",
};

function getDiseaseName(code: string | null, viName?: string | null) {
  if (!code) return "—";
  return viName || DISEASE_NAMES[code] || code;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DiseaseBadge({ capture }: { capture: CameraCapture }) {
  const { ai_status, disease_detected, confidence_score, diagnosis_result } = capture;
  if (!ai_status) return null;

  const diag = diagnosis_result as Record<string, unknown> | null;
  const viName = typeof diag?.vietnameseName === "string" ? diag.vietnameseName : null;
  const name   = getDiseaseName(disease_detected, viName);
  const pct    = confidence_score != null ? Math.round(confidence_score * 100) : null;
  const isHealthy = disease_detected === "HEALTHY_LEAF";

  if (ai_status === "PROCESSING") {
    return (
      <View style={[styles.badge, { backgroundColor: "#f59e0b" }]}>
        <Text style={styles.badgeText}>Đang phân tích...</Text>
      </View>
    );
  }
  if (ai_status === "FAILED") {
    return (
      <View style={[styles.badge, { backgroundColor: "#6b7280" }]}>
        <Text style={styles.badgeText}>Lỗi AI</Text>
      </View>
    );
  }
  if (ai_status === "COMPLETED" && disease_detected) {
    return (
      <View style={[styles.badge, { backgroundColor: isHealthy ? "#16a34a" : "#dc2626" }]}>
        <Text style={styles.badgeText} numberOfLines={1}>
          {name}{pct != null ? ` · ${pct}%` : ""}
        </Text>
      </View>
    );
  }
  return null;
}

function DiagnosisModal({
  capture,
  onClose,
}: {
  capture: CameraCapture | null;
  onClose: () => void;
}) {
  if (!capture) return null;

  const diag     = capture.diagnosis_result as Record<string, unknown> | null;
  const viName   = typeof diag?.vietnameseName === "string" ? diag.vietnameseName : null;
  const summary  = typeof diag?.diseaseSummary === "string" ? diag.diseaseSummary : null;
  const symptoms = Array.isArray(diag?.symptoms) ? diag.symptoms as string[] : [];
  const actions  = Array.isArray(diag?.immediateActions) ? diag.immediateActions as string[] : [];
  const name     = getDiseaseName(capture.disease_detected, viName);
  const isHealthy = capture.disease_detected === "HEALTHY_LEAF";
  const pct      = capture.confidence_score != null ? Math.round(capture.confidence_score * 100) : null;
  const riskLevel = typeof diag?.riskLevel === "string" ? diag.riskLevel : null;

  const riskColor = riskLevel === "CRITICAL" ? "#dc2626"
    : riskLevel === "HIGH"    ? "#ea580c"
    : riskLevel === "MEDIUM"  ? "#d97706"
    : "#16a34a";

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{formatTime(capture.captured_at)}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X color={durianTheme.colors.muted} size={20} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Image */}
            <Image
              source={{ uri: capture.image_url }}
              style={styles.modalImage}
              resizeMode="cover"
            />

            {/* AI Result */}
            {capture.ai_status === "COMPLETED" && (
              <View style={styles.diagnosisCard}>
                <View style={[styles.diagnosisHeader, { borderLeftColor: isHealthy ? "#16a34a" : riskColor }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {isHealthy
                      ? <Leaf color="#16a34a" size={18} />
                      : <ShieldAlert color={riskColor} size={18} />
                    }
                    <Text style={[styles.diseaseName, { color: isHealthy ? "#15803d" : "#1a1a1a" }]}>
                      {name}
                    </Text>
                  </View>
                  {pct != null && (
                    <View>
                      <View style={[styles.confBar, { backgroundColor: "#e5e7eb" }]}>
                        <View style={[styles.confFill, { width: `${pct}%`, backgroundColor: isHealthy ? "#16a34a" : riskColor }]} />
                      </View>
                      <Text style={styles.confText}>Độ tin cậy: {pct}%</Text>
                    </View>
                  )}
                  {riskLevel && (
                    <View style={[styles.riskPill, { backgroundColor: riskColor + "22", borderColor: riskColor }]}>
                      <Text style={[styles.riskText, { color: riskColor }]}>Rủi ro: {riskLevel}</Text>
                    </View>
                  )}
                </View>

                {summary && <Text style={styles.summary}>{summary}</Text>}

                {symptoms.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Triệu chứng nhận biết</Text>
                    {symptoms.slice(0, 4).map((s, i) => (
                      <Text key={i} style={styles.bulletItem}>• {s}</Text>
                    ))}
                  </View>
                )}

                {actions.length > 0 && !isHealthy && (
                  <View style={[styles.section, styles.actionBox]}>
                    <Text style={[styles.sectionTitle, { color: "#dc2626" }]}>Hành động ngay</Text>
                    {actions.slice(0, 3).map((a, i) => (
                      <Text key={i} style={[styles.bulletItem, { color: "#7f1d1d" }]}>→ {a}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            {capture.ai_status === "PROCESSING" && (
              <View style={styles.aiPending}>
                <ActivityIndicator color={durianTheme.colors.warning} />
                <Text style={styles.aiPendingText}>AI đang phân tích ảnh...</Text>
              </View>
            )}

            {capture.ai_status === "FAILED" && (
              <View style={styles.aiPending}>
                <AlertCircle color={durianTheme.colors.muted} size={18} />
                <Text style={styles.aiPendingText}>AI không phân tích được ảnh này.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function CameraMonitorScreen() {
  const [previewKey, setPreviewKey] = useState(Date.now());
  const [snapshotError, setSnapshotError] = useState(false);

  const [captureStep, setCaptureStep]     = useState<"idle" | "capturing" | "analyzing">("idle");
  const [captureResult, setCaptureResult] = useState<CameraCapture | null>(null);
  const [captureError, setCaptureError]   = useState<string | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [history, setHistory]       = useState<CameraCapture[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [enlarged, setEnlarged]     = useState<CameraCapture | null>(null);

  const snapshotUrl = getSnapshotUrl(DEVICE_ID);

  // Auto-refresh preview every 3s
  useEffect(() => {
    const id = setInterval(() => setPreviewKey(Date.now()), PREVIEW_POLL);
    return () => clearInterval(id);
  }, []);

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const res = await fetchCameraHistory({ device_id: DEVICE_ID, limit: 12 });
      setHistory(res.data);
    } catch { /* non-critical */ }
    finally { setHistLoading(false); }
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const handleCapture = async () => {
    setCaptureStep("capturing");
    setCaptureResult(null);
    setCaptureError(null);
    stepTimerRef.current = setTimeout(() => setCaptureStep("analyzing"), 2_000);
    try {
      const cap = await captureNow(DEVICE_ID);
      setCaptureResult(cap);
      setEnlarged(cap);
      void loadHistory();
    } catch (err) {
      setCaptureError(err instanceof Error ? err.message : "Chụp hình thất bại.");
    } finally {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      setCaptureStep("idle");
    }
  };

  const isCapturing = captureStep !== "idle";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DurianScreenHeader
          eyebrow="ESP32-CAM · AI VISION"
          icon={Camera}
          title="Camera & Chẩn đoán bệnh"
          subtitle="Chụp ảnh lá, nhận kết quả AI ngay lập tức."
        />

        {/* Live preview */}
        <View style={styles.previewCard}>
          <Text style={styles.cardLabel}>Xem trực tiếp · {DEVICE_ID}</Text>
          <View style={styles.previewBox}>
            {isCapturing && (
              <View style={styles.captureOverlay}>
                <ActivityIndicator color={durianTheme.colors.durianYellow} size="large" />
                <Text style={styles.captureLabel}>
                  {captureStep === "capturing" ? "Đang chụp ảnh..." : "Đang phân tích AI..."}
                </Text>
              </View>
            )}
            {!isCapturing && (
              <Image
                key={previewKey}
                source={{ uri: `${snapshotUrl}&t=${previewKey}` }}
                style={styles.previewImg}
                resizeMode="cover"
                onError={() => setSnapshotError(true)}
              />
            )}
            {snapshotError && !isCapturing && (
              <View style={styles.previewError}>
                <Camera color={durianTheme.colors.mist} size={36} />
                <Text style={styles.previewErrorText}>Không kết nối được ESP32-CAM</Text>
              </View>
            )}
          </View>

          {/* Capture button */}
          <Pressable
            onPress={handleCapture}
            disabled={isCapturing}
            style={({ pressed }) => [styles.captureBtn, pressed && styles.pressed, isCapturing && styles.disabled]}
          >
            {isCapturing
              ? <><Loader2 color="#fff" size={16} /><Text style={styles.captureBtnText}>Đang xử lý...</Text></>
              : <><Camera color="#fff" size={16} /><Text style={styles.captureBtnText}>Chụp hình ngay</Text></>
            }
          </Pressable>

          {/* Capture result banner */}
          {captureResult && captureStep === "idle" && (() => {
            const { ai_status, disease_detected, confidence_score, diagnosis_result } = captureResult;
            const diag = diagnosis_result as Record<string, unknown> | null;
            const viName = typeof diag?.vietnameseName === "string" ? diag.vietnameseName : null;
            const isHealthy = disease_detected === "HEALTHY_LEAF";
            const name = getDiseaseName(disease_detected, viName);
            const pct  = confidence_score != null ? Math.round(confidence_score * 100) : null;
            return (
              <Pressable onPress={() => setEnlarged(captureResult)} style={[styles.resultBanner, { backgroundColor: isHealthy ? "#f0fdf4" : "#fef2f2" }]}>
                {isHealthy
                  ? <CheckCircle2 color="#16a34a" size={14} />
                  : <AlertCircle color="#dc2626" size={14} />
                }
                <Text style={[styles.resultText, { color: isHealthy ? "#15803d" : "#991b1b", flex: 1 }]}>
                  {ai_status === "COMPLETED"
                    ? (isHealthy ? "Lá khỏe mạnh" : `Phát hiện: ${name}${pct != null ? ` (${pct}%)` : ""}`)
                    : "Đã lưu ảnh — đang chờ AI phân tích"
                  }
                </Text>
                <Text style={[styles.resultText, { color: durianTheme.colors.moss }]}>Chi tiết →</Text>
              </Pressable>
            );
          })()}

          {captureError && (
            <View style={styles.errorBanner}>
              <AlertCircle color="#dc2626" size={14} />
              <Text style={styles.errorText}>{captureError}</Text>
            </View>
          )}
        </View>

        {/* History gallery */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Thư viện ảnh gần đây</Text>
            <Pressable onPress={loadHistory} hitSlop={8}>
              <RefreshCw color={durianTheme.colors.muted} size={16} />
            </Pressable>
          </View>

          {histLoading ? (
            <ActivityIndicator color={durianTheme.colors.moss} style={{ marginTop: 24 }} />
          ) : history.length === 0 ? (
            <View style={styles.empty}>
              <Camera color={durianTheme.colors.mist} size={32} />
              <Text style={styles.emptyText}>Chưa có ảnh nào. Nhấn "Chụp hình ngay" để bắt đầu.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {history.map((cap) => (
                <Pressable
                  key={cap.id}
                  style={styles.thumb}
                  onPress={() => setEnlarged(cap)}
                >
                  <Image source={{ uri: cap.image_url }} style={styles.thumbImg} resizeMode="cover" />
                  <DiseaseBadge capture={cap} />
                  <Text style={styles.thumbTime} numberOfLines={1}>{formatTime(cap.captured_at)}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <DiagnosisModal capture={enlarged} onClose={() => setEnlarged(null)} />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea:        { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  content:         { gap: 16, paddingBottom: 40, paddingHorizontal: 18 },
  cardLabel:       { color: durianTheme.colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginBottom: 10, textTransform: "uppercase" },

  previewCard:     { backgroundColor: durianTheme.colors.surface, borderColor: "#ECE8D8", borderRadius: 22, borderWidth: 1, gap: 12, padding: 16 },
  previewBox:      { aspectRatio: 1.4, backgroundColor: "#000", borderRadius: 16, overflow: "hidden", position: "relative" },
  previewImg:      { height: "100%", width: "100%" },
  previewError:    { alignItems: "center", flex: 1, gap: 10, justifyContent: "center" },
  previewErrorText:{ color: durianTheme.colors.mist, fontSize: 12, textAlign: "center" },

  captureOverlay:  { alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)", bottom: 0, gap: 10, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0 },
  captureLabel:    { color: "#fff", fontSize: 14, fontWeight: "700" },

  captureBtn:      { alignItems: "center", backgroundColor: durianTheme.colors.moss, borderRadius: 16, flexDirection: "row", gap: 8, justifyContent: "center", paddingVertical: 12 },
  captureBtnText:  { color: "#fff", fontSize: 14, fontWeight: "800" },
  pressed:         { opacity: 0.8, transform: [{ scale: 0.97 }] },
  disabled:        { opacity: 0.6 },

  resultBanner:    { alignItems: "center", borderRadius: 12, flexDirection: "row", gap: 8, padding: 10 },
  resultText:      { fontSize: 12, fontWeight: "700" },
  errorBanner:     { alignItems: "center", backgroundColor: "#fef2f2", borderRadius: 12, flexDirection: "row", gap: 8, padding: 10 },
  errorText:       { color: "#dc2626", fontSize: 12, flex: 1 },

  historySection:  { gap: 12 },
  historyHeader:   { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  historyTitle:    { color: durianTheme.colors.ink, fontSize: 16, fontWeight: "900" },
  empty:           { alignItems: "center", gap: 10, paddingVertical: 32 },
  emptyText:       { color: durianTheme.colors.muted, fontSize: 12, textAlign: "center" },

  grid:            { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  thumb:           { backgroundColor: durianTheme.colors.surface, borderColor: "#ECE8D8", borderRadius: 14, borderWidth: 1, overflow: "hidden", width: "47%" },
  thumbImg:        { aspectRatio: 1.3, width: "100%" },
  thumbTime:       { color: durianTheme.colors.muted, fontSize: 9, padding: 6 },
  badge:           { bottom: 0, left: 0, paddingHorizontal: 6, paddingVertical: 4, position: "absolute", right: 0 },
  badgeText:       { color: "#fff", fontSize: 9, fontWeight: "900", textAlign: "center" },

  // Modal
  modalOverlay:    { backgroundColor: "rgba(0,0,0,0.7)", flex: 1, justifyContent: "flex-end" },
  modalSheet:      { backgroundColor: durianTheme.colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%", paddingBottom: 32 },
  modalHeader:     { alignItems: "center", borderBottomColor: "#ECE8D8", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
  modalTitle:      { color: durianTheme.colors.ink, fontSize: 14, fontWeight: "800" },
  modalImage:      { aspectRatio: 1.6, width: "100%" },

  diagnosisCard:   { gap: 12, padding: 18 },
  diagnosisHeader: { borderLeftColor: durianTheme.colors.moss, borderLeftWidth: 3, gap: 10, paddingLeft: 12 },
  diseaseName:     { fontSize: 17, fontWeight: "900" },
  confBar:         { borderRadius: 4, height: 6, overflow: "hidden", marginTop: 6 },
  confFill:        { borderRadius: 4, height: "100%" },
  confText:        { color: durianTheme.colors.muted, fontSize: 10, marginTop: 3 },
  riskPill:        { alignSelf: "flex-start", borderRadius: 20, borderWidth: 1, marginTop: 4, paddingHorizontal: 10, paddingVertical: 4 },
  riskText:        { fontSize: 11, fontWeight: "800" },
  summary:         { color: durianTheme.colors.muted, fontSize: 13, lineHeight: 19 },
  section:         { gap: 6 },
  sectionTitle:    { color: durianTheme.colors.ink, fontSize: 12, fontWeight: "900", letterSpacing: 0.5, textTransform: "uppercase" },
  bulletItem:      { color: durianTheme.colors.muted, fontSize: 12, lineHeight: 18 },
  actionBox:       { backgroundColor: "#fef2f2", borderRadius: 12, padding: 12 },
  aiPending:       { alignItems: "center", flexDirection: "row", gap: 10, padding: 18 },
  aiPendingText:   { color: durianTheme.colors.muted, fontSize: 13 },
});
