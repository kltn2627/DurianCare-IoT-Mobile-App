import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Camera,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Images,
  Leaf,
  RefreshCcw,
} from "lucide-react-native";
import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { durianTheme } from "@/src/theme/durianTheme";
import { predictDurianDisease, type DiseasePrediction } from "@/src/features/scanner/diseasePredictionApi";
import type { DiseaseCategory } from "@/src/features/scanner/diseaseCatalog";
import { getDiseaseAlertMessage } from "@/src/features/scanner/diseaseCatalog";
import { getTree, listDiagnoses, saveDiagnosis } from "./treeApi";
import type { TreeDetail, TreeDiagnosis } from "./treeTypes";
import { knowledgeApi } from "@/src/features/knowledge/knowledgeApi";
import type { KnowledgeArticle } from "@/src/features/knowledge/knowledgeTypes";

// ── Health display ────────────────────────────────────────────────────────────

const HEALTH_LABELS: Record<string, string> = {
  HEALTHY: "Khỏe mạnh",
  DISEASED: "Bệnh",
  TREATING: "Đang điều trị",
  SUSPECTED: "Nghi ngờ",
};

const HEALTH_COLORS: Record<string, string> = {
  HEALTHY: "#16a34a",
  DISEASED: "#dc2626",
  TREATING: "#ea580c",
  SUSPECTED: "#ca8a04",
};

const HEALTH_BG: Record<string, string> = {
  HEALTHY: "#dcfce7",
  DISEASED: "#fee2e2",
  TREATING: "#ffedd5",
  SUSPECTED: "#fef9c3",
};

// Disease category → timeline dot color
const CATEGORY_DOT: Record<DiseaseCategory, string> = {
  HEALTHY: "#16a34a",
  DISEASE: "#dc2626",
  PEST: "#f59e0b",
  LOW_CONFIDENCE: "#9ca3af",
  INVALID_IMAGE: "#6b7280",
};

const CATEGORY_BADGE_TEXT: Record<DiseaseCategory, string> = {
  HEALTHY: "#15803d",
  DISEASE: "#b91c1c",
  PEST: "#92400e",
  LOW_CONFIDENCE: "#374151",
  INVALID_IMAGE: "#374151",
};

const CATEGORY_BADGE_BG: Record<DiseaseCategory, string> = {
  HEALTHY: "#dcfce7",
  DISEASE: "#fee2e2",
  PEST: "#fef3c7",
  LOW_CONFIDENCE: "#f3f4f6",
  INVALID_IMAGE: "#f3f4f6",
};

const CATEGORY_LABEL: Record<DiseaseCategory, string> = {
  HEALTHY: "Khỏe",
  DISEASE: "Bệnh",
  PEST: "Sâu/Bọ",
  LOW_CONFIDENCE: "Thấp tin cậy",
  INVALID_IMAGE: "Ảnh không hợp lệ",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function categoryFromCode(code: string | null | undefined): DiseaseCategory {
  if (!code) return "INVALID_IMAGE";
  const lower = code.toLowerCase();
  if (lower === "low_confidence") return "LOW_CONFIDENCE";
  if (lower === "invalid_image") return "INVALID_IMAGE";
  if (lower === "recovered_by_farmer") return "HEALTHY";
  if (lower.includes("healthy")) return "HEALTHY";
  if (lower.includes("allocaridara")) return "PEST";
  return "DISEASE";
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>
        {value != null && value !== "" ? String(value) : "Chưa có dữ liệu"}
      </Text>
    </View>
  );
}

// ── AI Panel ──────────────────────────────────────────────────────────────────

interface AIPanelProps {
  treeId: string;
  treeCode: string;
  onSaved: () => void;
}

function AIPanel({ treeId, treeCode, onSaved }: AIPanelProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<DiseasePrediction | null>(null);
  const [predError, setPredError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [kbArticles, setKbArticles] = useState<KnowledgeArticle[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!prediction || prediction.disease.category === "HEALTHY"
        || prediction.disease.category === "LOW_CONFIDENCE"
        || prediction.disease.category === "INVALID_IMAGE") {
      setKbArticles([]);
      return;
    }
    knowledgeApi
      .list({ search: prediction.disease.name, size: 2, status: "PUBLISHED" })
      .then((page) => setKbArticles(page.articles))
      .catch(() => setKbArticles([]));
  }, [prediction]);

  function reset() {
    setPhoto(null);
    setPrediction(null);
    setPredError(null);
    setSavedOk(false);
  }

  async function pickFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      setPredError("Cần cấp quyền camera.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0]);
      setPrediction(null);
      setPredError(null);
      setSavedOk(false);
    }
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0]);
      setPrediction(null);
      setPredError(null);
      setSavedOk(false);
    }
  }

  async function analyze() {
    if (!photo) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPredicting(true);
    setPredError(null);
    setPrediction(null);
    try {
      const result = await predictDurianDisease(
        { uri: photo.uri, width: photo.width ?? 0, height: photo.height ?? 0 } as Parameters<typeof predictDurianDisease>[0],
        { externalSignal: ctrl.signal, source: "MOBILE" },
      );
      setPrediction(result);
    } catch (err) {
      if (!ctrl.signal.aborted) {
        setPredError(err instanceof Error ? err.message : "Phân tích thất bại.");
      }
    } finally {
      if (!ctrl.signal.aborted) setPredicting(false);
    }
  }

  async function saveResult() {
    if (!prediction || !photo) return;
    setSaving(true);
    try {
      await saveDiagnosis(treeId, {
        imageUrl: photo.uri,
        diseaseCode: prediction.disease.code,
        diseaseName: prediction.disease.name,
        confidence: prediction.confidence / 100,
        boundingBox: prediction.boundingBox as Record<string, unknown>,
        source: "MOBILE",
      });
      setSavedOk(true);
      onSaved();
    } catch (err) {
      setPredError(err instanceof Error ? err.message : "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  }

  const cat = prediction?.disease.category;

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.panelHeader}
        accessibilityRole="button"
      >
        <Text style={styles.cardTitle}>Phân tích AI</Text>
        {expanded ? (
          <ChevronUp size={16} color={durianTheme.colors.muted} />
        ) : (
          <ChevronDown size={16} color={durianTheme.colors.muted} />
        )}
      </Pressable>

      {expanded ? (
        <View style={styles.aiBody}>
          {/* Photo picker buttons */}
          {!savedOk ? (
            <View style={styles.pickerRow}>
              <Pressable onPress={pickFromCamera} style={styles.pickerBtn}>
                <Camera size={15} color={durianTheme.colors.moss} />
                <Text style={styles.pickerBtnText}>Chụp ảnh</Text>
              </Pressable>
              <Pressable onPress={pickFromGallery} style={styles.pickerBtn}>
                <Images size={15} color={durianTheme.colors.moss} />
                <Text style={styles.pickerBtnText}>Thư viện</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Photo preview */}
          {photo && !savedOk ? (
            <View style={styles.photoPreviewBox}>
              <Image source={{ uri: photo.uri }} style={styles.photoPreview} resizeMode="cover" />
              {/* Bounding box overlay when prediction available */}
              {prediction?.boundingBox ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.boundingBox,
                    {
                      left: `${prediction.boundingBox.left}%` as unknown as number,
                      top: `${prediction.boundingBox.top}%` as unknown as number,
                      width: `${prediction.boundingBox.width}%` as unknown as number,
                      height: `${prediction.boundingBox.height}%` as unknown as number,
                      borderColor: cat === "HEALTHY" ? "#16a34a" : cat === "PEST" ? "#f59e0b" : "#dc2626",
                    },
                  ]}
                />
              ) : null}
            </View>
          ) : null}

          {/* Analyze button */}
          {photo && !prediction && !predicting && !savedOk ? (
            <Pressable
              onPress={analyze}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.primaryBtnText}>Phân tích</Text>
            </Pressable>
          ) : null}

          {/* Loading */}
          {predicting ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={durianTheme.colors.moss} />
              <Text style={styles.loadingText}>Đang phân tích...</Text>
            </View>
          ) : null}

          {/* Prediction result */}
          {prediction && !savedOk ? (
            <View style={[styles.resultBox, { backgroundColor: CATEGORY_BADGE_BG[cat!] }]}>
              <View style={styles.resultHeader}>
                <View style={[styles.catBadge, { backgroundColor: CATEGORY_BADGE_BG[cat!] }]}>
                  <Text style={[styles.catBadgeText, { color: CATEGORY_BADGE_TEXT[cat!] }]}>
                    {CATEGORY_LABEL[cat!]}
                  </Text>
                </View>
                <Text style={styles.resultConf}>{Math.round(prediction.confidence)}%</Text>
              </View>
              <Text style={styles.resultDisease}>{prediction.disease.name}</Text>
              <Text style={styles.resultCode}>{prediction.disease.code}</Text>
              <Text style={styles.resultNote}>{getDiseaseAlertMessage(cat!)}</Text>
              {/* KB article links */}
              {kbArticles.length > 0 ? (
                <View style={styles.kbSection}>
                  <Text style={styles.kbSectionTitle}>Tìm hiểu thêm</Text>
                  {kbArticles.map((a) => (
                    <Pressable
                      key={a.id}
                      onPress={() => router.push({ pathname: "/(main)/knowledge/[slug]", params: { slug: a.slug } } as never)}
                      style={styles.kbCard}
                    >
                      <Text style={styles.kbCardTitle} numberOfLines={2}>{a.title}</Text>
                      <Text style={styles.kbCardExcerpt} numberOfLines={2}>{a.excerpt}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Save button */}
          {prediction && !saving && !savedOk ? (
            <Pressable
              onPress={saveResult}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.primaryBtnText}>Lưu vào hồ sơ cây {treeCode}</Text>
            </Pressable>
          ) : null}

          {saving ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={durianTheme.colors.moss} />
              <Text style={styles.loadingText}>Đang lưu...</Text>
            </View>
          ) : null}

          {/* Success */}
          {savedOk ? (
            <View style={styles.successBox}>
              <CheckCircle size={18} color="#16a34a" />
              <Text style={styles.successText}>Đã lưu vào hồ sơ cây.</Text>
              <Pressable onPress={reset} style={styles.ghostBtn}>
                <RefreshCcw size={13} color={durianTheme.colors.moss} />
                <Text style={styles.ghostBtnText}>Phân tích lại</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Error */}
          {predError ? (
            <View style={styles.errBox}>
              <Text style={styles.errText}>{predError}</Text>
              <Pressable onPress={reset} style={styles.ghostBtn}>
                <Text style={styles.ghostBtnText}>Thử lại</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ── Recovery Panel ────────────────────────────────────────────────────────────

interface RecoveryPanelProps {
  treeId: string;
  treeCode: string;
  onSaved: () => void;
}

function RecoveryPanel({ treeId, treeCode, onSaved }: RecoveryPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    const trimmed = notes.trim();
    if (!trimmed) {
      setError("Vui lòng nhập ghi chú xác nhận phục hồi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveDiagnosis(treeId, {
        imageUrl: "RECOVERY_VERIFICATION_NO_IMAGE",
        diseaseCode: "RECOVERED_BY_FARMER",
        diseaseName: "Phục hồi (xác nhận bởi nông dân)",
        confidence: null,
        boundingBox: null,
        source: "RECOVERY_VERIFICATION",
      });
      setSavedOk(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  }

  if (savedOk) {
    return (
      <View style={[styles.card, styles.recoveryCard]}>
        <View style={styles.successBox}>
          <CheckCircle size={18} color="#16a34a" />
          <Text style={styles.successText}>Xác nhận phục hồi đã lưu cho cây {treeCode}.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.recoveryCard]}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.panelHeader}
        accessibilityRole="button"
      >
        <Text style={[styles.cardTitle, { color: "#16a34a" }]}>Xác nhận phục hồi</Text>
        {expanded ? (
          <ChevronUp size={16} color="#16a34a" />
        ) : (
          <ChevronDown size={16} color="#16a34a" />
        )}
      </Pressable>

      {expanded ? (
        <View style={styles.aiBody}>
          <Text style={styles.recoveryHint}>
            Xác nhận cây đã phục hồi sau điều trị. Ghi chú bắt buộc để tạo bằng chứng.
          </Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Ghi chú xác nhận (bắt buộc)..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />
          {error ? (
            <Text style={styles.errText}>{error}</Text>
          ) : null}
          {saving ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#16a34a" />
              <Text style={styles.loadingText}>Đang lưu...</Text>
            </View>
          ) : (
            <Pressable
              onPress={confirm}
              style={({ pressed }) => [styles.recoveryBtn, pressed && { opacity: 0.8 }]}
            >
              <CheckCircle size={15} color="#fff" />
              <Text style={styles.primaryBtnText}>Gửi xác nhận phục hồi</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

// ── TreeDetailContent — reusable (used by screen and by inline sheet) ─────────

interface ContentProps {
  treeId: string;
  onClose?: () => void;
  onDiagnosisSaved?: () => void;
}

export function TreeDetailContent({ treeId, onClose, onDiagnosisSaved }: ContentProps) {
  const [tree, setTree] = useState<TreeDetail | null>(null);
  const [diagnoses, setDiagnoses] = useState<TreeDiagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load(active: { value: boolean }) {
    setLoading(true);
    Promise.all([getTree(treeId), listDiagnoses(treeId, 0, 20)])
      .then(([treeData, diagData]) => {
        if (!active.value) return;
        setTree(treeData);
        setDiagnoses(diagData.content ?? []);
      })
      .catch((err) => {
        if (!active.value) return;
        setError(err instanceof Error ? err.message : "Không thể tải chi tiết cây.");
      })
      .finally(() => {
        if (active.value) setLoading(false);
      });
  }

  useEffect(() => {
    const active = { value: true };
    load(active);
    return () => { active.value = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeId]);

  function refresh() {
    const active = { value: true };
    load(active);
    onDiagnosisSaved?.();
  }

  const health = tree?.healthStatus;
  const needsRecovery =
    health === "DISEASED" || health === "TREATING" || health === "SUSPECTED";

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={durianTheme.colors.moss} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!tree) return null;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {/* Sheet drag handle (only shown when used as bottom sheet) */}
      {onClose != null ? (
        <View style={styles.sheetHandle}>
          <View style={styles.sheetHandleBar} />
          <View style={styles.sheetTitleRow}>
            <Text style={styles.sheetTitle}>{tree.treeCode}</Text>
            <Pressable onPress={onClose} style={styles.sheetCloseBtn}>
              <Text style={styles.sheetCloseText}>✕</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Health badge */}
      {health ? (
        <View style={[styles.healthBadge, { backgroundColor: HEALTH_BG[health] ?? "#f3f4f6" }]}>
          <Text style={[styles.healthBadgeText, { color: HEALTH_COLORS[health] ?? "#374151" }]}>
            {HEALTH_LABELS[health] ?? health}
          </Text>
        </View>
      ) : null}

      {/* Recovery confirmation panel — only for sick/treating trees */}
      {needsRecovery ? (
        <RecoveryPanel treeId={treeId} treeCode={tree.treeCode} onSaved={refresh} />
      ) : null}

      {/* Embedded AI diagnosis panel */}
      <AIPanel treeId={treeId} treeCode={tree.treeCode} onSaved={refresh} />

      {/* Tree info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Thông tin cây</Text>
        <InfoRow label="Mã cây" value={tree.treeCode} />
        <InfoRow label="Biệt danh" value={tree.nickname} />
        <InfoRow label="Giống" value={tree.variety} />
        <InfoRow label="Ngày trồng" value={tree.plantedDate} />
        <InfoRow label="Vị trí X" value={tree.positionX?.toFixed(4)} />
        <InfoRow label="Vị trí Y" value={tree.positionY?.toFixed(4)} />
        <InfoRow label="Số lần chuẩn đoán" value={tree.diagnosisCount} />
        {tree.latestDiagnosisAt ? (
          <InfoRow
            label="Lần cuối chuẩn đoán"
            value={new Date(tree.latestDiagnosisAt).toLocaleString("vi-VN")}
          />
        ) : null}
        {tree.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.infoLabel}>Ghi chú</Text>
            <Text style={styles.notesText}>{tree.notes}</Text>
          </View>
        ) : null}
      </View>

      {/* Diagnosis timeline */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Lịch sử chuẩn đoán ({diagnoses.length})</Text>
        {diagnoses.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có lịch sử chuẩn đoán.</Text>
        ) : (
          <View style={styles.timeline}>
            {diagnoses.map((d, idx) => {
              const cat = categoryFromCode(d.diseaseCode);
              const dotColor = CATEGORY_DOT[cat];
              const isLast = idx === diagnoses.length - 1;
              return (
                <View key={d.id} style={styles.timelineRow}>
                  <View style={styles.timelineSpine}>
                    <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
                    {!isLast ? <View style={styles.timelineLine} /> : null}
                  </View>
                  <View style={[styles.diagRow, { flex: 1, marginLeft: 10, marginBottom: isLast ? 0 : 10 }]}>
                    <View style={styles.diagRowHeader}>
                      <View style={[styles.catBadge, { backgroundColor: CATEGORY_BADGE_BG[cat] }]}>
                        <Text style={[styles.catBadgeText, { color: CATEGORY_BADGE_TEXT[cat] }]}>
                          {CATEGORY_LABEL[cat]}
                        </Text>
                      </View>
                      {d.confidence != null ? (
                        <Text style={styles.diagConf}>{Math.round(d.confidence * 100)}%</Text>
                      ) : null}
                    </View>
                    <Text style={styles.diagCode}>{d.diseaseCode}</Text>
                    {d.diseaseName ? (
                      <Text style={styles.diagName}>{d.diseaseName}</Text>
                    ) : null}
                    <Text style={styles.diagDate}>
                      {new Date(d.diagnosedAt).toLocaleString("vi-VN")}
                    </Text>
                    {d.source ? (
                      <Text style={styles.diagSource}>{d.source}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ── Standalone screen wrapper ─────────────────────────────────────────────────

interface Props {
  treeId: string;
}

export function TreeDetailScreen({ treeId }: Props) {
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <DurianScreenHeader
        eyebrow="CHI TIẾT CÂY"
        icon={Leaf}
        title="Chi tiết cây"
        subtitle="Thông tin và lịch sử chuẩn đoán"
      />
      <TreeDetailContent treeId={treeId} />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: durianTheme.colors.canvas },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 40 },

  sheetHandle: { alignItems: "center", paddingBottom: 4, gap: 8 },
  sheetHandleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#d1d5db", marginTop: 4 },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", paddingHorizontal: 4 },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: durianTheme.colors.ink },
  sheetCloseBtn: { padding: 6 },
  sheetCloseText: { fontSize: 16, color: durianTheme.colors.muted, fontWeight: "700" },
  errorBox: {
    margin: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  errorText: { fontSize: 13, color: "#dc2626", fontWeight: "600" },
  emptyText: { fontSize: 13, color: durianTheme.colors.muted },

  healthBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  healthBadgeText: { fontSize: 13, fontWeight: "700" },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: durianTheme.colors.mist,
    backgroundColor: durianTheme.colors.surface,
    padding: 16,
    gap: 10,
  },
  recoveryCard: { borderColor: "#bbf7d0" },
  cardTitle: { fontSize: 13, fontWeight: "800", color: durianTheme.colors.ink },

  panelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  aiBody: { gap: 10 },

  pickerRow: { flexDirection: "row", gap: 10 },
  pickerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: durianTheme.colors.moss,
    paddingVertical: 10,
  },
  pickerBtnText: { fontSize: 13, fontWeight: "700", color: durianTheme.colors.moss },

  photoPreviewBox: {
    borderRadius: 12,
    overflow: "hidden",
    aspectRatio: 4 / 3,
    position: "relative",
  },
  photoPreview: { width: "100%", height: "100%" },
  boundingBox: {
    position: "absolute",
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 4,
  },

  primaryBtn: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: 12,
    paddingVertical: 12,
  },
  primaryBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  recoveryBtn: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#16a34a",
    borderRadius: 12,
    paddingVertical: 12,
  },

  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 13, color: durianTheme.colors.muted },

  resultBox: {
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultDisease: { fontSize: 15, fontWeight: "800", color: durianTheme.colors.ink },
  resultCode: { fontSize: 11, color: durianTheme.colors.muted },
  resultConf: { fontSize: 14, fontWeight: "700", color: durianTheme.colors.ink },
  resultNote: { fontSize: 12, color: durianTheme.colors.muted, marginTop: 2 },

  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catBadgeText: { fontSize: 11, fontWeight: "700" },

  successBox: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  successText: { fontSize: 13, fontWeight: "600", color: "#16a34a", flex: 1 },

  errBox: { gap: 4 },
  errText: { fontSize: 12, color: "#dc2626", fontWeight: "600" },

  ghostBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  ghostBtnText: { fontSize: 12, fontWeight: "700", color: durianTheme.colors.moss },

  recoveryHint: { fontSize: 12, color: durianTheme.colors.muted, lineHeight: 18 },
  notesInput: {
    borderWidth: 1,
    borderColor: durianTheme.colors.mist,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: durianTheme.colors.ink,
    textAlignVertical: "top",
    minHeight: 72,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  infoLabel: { fontSize: 12, fontWeight: "700", color: durianTheme.colors.muted },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: durianTheme.colors.ink,
    maxWidth: "60%",
    textAlign: "right",
  },

  notesBox: { paddingTop: 4 },
  notesText: { fontSize: 13, color: durianTheme.colors.ink, marginTop: 4, lineHeight: 20 },

  // Timeline styles
  timeline: { gap: 0 },
  timelineRow: { flexDirection: "row", alignItems: "flex-start" },
  timelineSpine: { width: 16, alignItems: "center" },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: "#e5e7eb", minHeight: 16 },

  diagRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    backgroundColor: durianTheme.colors.canvas,
    padding: 10,
    gap: 3,
  },
  diagRowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  diagCode: { fontSize: 12, fontWeight: "700", color: durianTheme.colors.ink },
  diagConf: { fontSize: 12, fontWeight: "600", color: durianTheme.colors.muted },
  diagName: { fontSize: 12, color: durianTheme.colors.muted },
  diagDate: { fontSize: 11, color: "#9ca3af" },
  diagSource: { fontSize: 10, color: "#d1d5db", fontStyle: "italic" },

  kbSection: { marginTop: 8, gap: 6 },
  kbSectionTitle: { fontSize: 11, fontWeight: "800", color: durianTheme.colors.muted, textTransform: "uppercase", letterSpacing: 0.8 },
  kbCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: durianTheme.colors.mist,
    backgroundColor: durianTheme.colors.canvas,
    padding: 8,
    gap: 3,
  },
  kbCardTitle: { fontSize: 12, fontWeight: "700", color: durianTheme.colors.ink },
  kbCardExcerpt: { fontSize: 11, color: durianTheme.colors.muted, lineHeight: 16 },
});
