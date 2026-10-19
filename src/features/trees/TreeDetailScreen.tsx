import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  Trash2,
} from "lucide-react-native";
import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { durianTheme } from "@/src/theme/durianTheme";
import { predictDurianDisease, type DiseasePrediction } from "@/src/features/scanner/diseasePredictionApi";
import type { DiseaseCategory } from "@/src/features/scanner/diseaseCatalog";
import { getDiseaseAlertMessage } from "@/src/features/scanner/diseaseCatalog";
import {
  acceptCareRecommendation,
  createCarePlan,
  createCareRecommendation,
  evaluateRecovery,
  getLatestCareRecommendation,
  getTree,
  listCarePlanTasks,
  listCarePlans,
  listDiagnoses,
  removeTree,
  saveDiagnosis,
  updateTreeHealthStatus,
} from "./treeApi";
import type {
  CarePlanStatus,
  CreateCarePlanRequest,
  RecoveryEvaluationResponse,
  TreeCarePlan,
  TreeCareRecommendation,
  TreeCareTask,
  TreeDetail,
  TreeDiagnosis,
} from "./treeTypes";
import { knowledgeApi } from "@/src/features/knowledge/knowledgeApi";
import type { KnowledgeArticle } from "@/src/features/knowledge/knowledgeTypes";

// ── Health display ────────────────────────────────────────────────────────────

const HEALTH_LABELS: Record<string, string> = {
  HEALTHY: "Khỏe mạnh",
  DISEASED: "Bệnh",
  TREATING: "Đang điều trị",
  SUSPECTED: "Nghi ngờ",
  RECOVERED: "Đã hồi phục",
};

const HEALTH_COLORS: Record<string, string> = {
  HEALTHY: "#16a34a",
  DISEASED: "#dc2626",
  TREATING: "#ea580c",
  SUSPECTED: "#ca8a04",
  RECOVERED: "#0891b2",
};

const HEALTH_BG: Record<string, string> = {
  HEALTHY: "#dcfce7",
  DISEASED: "#fee2e2",
  TREATING: "#ffedd5",
  SUSPECTED: "#fef9c3",
  RECOVERED: "#e0f2fe",
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
      .list({ search: prediction.disease.code, size: 2, status: "PUBLISHED" })
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

const RECOVERY_OUTCOME_ELIGIBLE = new Set(["RECOVERED", "IMPROVED"]);

const RECOVERY_OUTCOME_LABEL: Record<string, string> = {
  RECOVERED: "Đã hồi phục",
  IMPROVED: "Có dấu hiệu cải thiện",
  STABLE: "Chưa có cải thiện rõ ràng",
  WORSENED: "Có dấu hiệu xấu đi",
  UNCERTAIN: "Chưa xác định",
};

const RECOVERY_OUTCOME_COLOR: Record<string, string> = {
  RECOVERED: "#16a34a",
  IMPROVED: "#059669",
  STABLE: "#ca8a04",
  WORSENED: "#dc2626",
  UNCERTAIN: "#6b7280",
};

const RECOVERY_OUTCOME_BG: Record<string, string> = {
  RECOVERED: "#dcfce7",
  IMPROVED: "#d1fae5",
  STABLE: "#fef9c3",
  WORSENED: "#fee2e2",
  UNCERTAIN: "#f3f4f6",
};

const RECOVERY_NEXT_ACTION: Record<string, string> = {
  RECOVERED: "Có thể xác nhận cây đã hồi phục. Backend vẫn kiểm tra lại điều kiện trước khi cập nhật Tree Map.",
  IMPROVED: "Tiếp tục kế hoạch chăm sóc hiện tại và đặt lịch tái khám tiếp theo nếu cần.",
  STABLE: "Tiếp tục điều trị/theo dõi. Chưa cho xác nhận hồi phục.",
  WORSENED: "Đánh giá lại hướng xử lý, xem lại Knowledge Base hoặc tạo kế hoạch chăm sóc mới.",
  UNCERTAIN: "Chụp/đưa ảnh rõ hơn hoặc kiểm tra thêm trước khi kết luận.",
};

function formatPercent(value?: number | null) {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}

function RecoveryEvaluationCard({
  evaluation,
  eligible,
}: {
  evaluation: RecoveryEvaluationResponse;
  eligible?: boolean;
}) {
  const color = RECOVERY_OUTCOME_COLOR[evaluation.outcome] ?? RECOVERY_OUTCOME_COLOR.UNCERTAIN;
  const backgroundColor = RECOVERY_OUTCOME_BG[evaluation.outcome] ?? RECOVERY_OUTCOME_BG.UNCERTAIN;
  return (
    <View style={[styles.evalBox, { backgroundColor, borderColor: color }]}>
      <View style={styles.evalHeader}>
        <Text style={[styles.evalOutcome, { color }]}>
          {RECOVERY_OUTCOME_LABEL[evaluation.outcome] ?? evaluation.outcome}
        </Text>
        {eligible === false ? (
          <Text style={[styles.evalPill, { color }]}>Không đủ điều kiện RECOVERED</Text>
        ) : null}
      </View>
      <Text style={styles.evalReason}>{evaluation.reason}</Text>
      <View style={styles.evalCompareRow}>
        <View style={styles.evalCompareBox}>
          <Text style={styles.evalCompareLabel}>Lần trước</Text>
          <Text style={styles.evalCompareValue}>{evaluation.previousDiseaseCode ?? "—"}</Text>
          <Text style={styles.evalCompareMeta}>Confidence: {formatPercent(evaluation.previousConfidence)}</Text>
        </View>
        <View style={styles.evalCompareBox}>
          <Text style={styles.evalCompareLabel}>Hiện tại</Text>
          <Text style={styles.evalCompareValue}>{evaluation.currentDiseaseCode ?? "—"}</Text>
          <Text style={styles.evalCompareMeta}>Confidence: {formatPercent(evaluation.currentConfidence)}</Text>
        </View>
      </View>
      <Text style={styles.evalNextAction}>
        {RECOVERY_NEXT_ACTION[evaluation.outcome] ?? RECOVERY_NEXT_ACTION.UNCERTAIN}
      </Text>
    </View>
  );
}

function RecoveryPanel({ treeId, treeCode, onSaved }: RecoveryPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<RecoveryEvaluationResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && !evaluation) {
      setEvaluating(true);
      setError(null);
      try {
        const result = await evaluateRecovery(treeId);
        setEvaluation(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể đánh giá phục hồi.");
      } finally {
        setEvaluating(false);
      }
    }
  }

  async function confirm() {
    const trimmed = notes.trim();
    if (!trimmed) {
      setError("Vui lòng nhập ghi chú xác nhận phục hồi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateTreeHealthStatus(treeId, "RECOVERED");
      setSavedOk(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật trạng thái thất bại.");
    } finally {
      setSaving(false);
    }
  }

  const eligible = evaluation ? RECOVERY_OUTCOME_ELIGIBLE.has(evaluation.outcome) : false;

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
        onPress={handleExpand}
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
          {evaluating ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#16a34a" />
              <Text style={styles.loadingText}>Đang đánh giá tình trạng phục hồi...</Text>
            </View>
          ) : evaluation ? (
            <RecoveryEvaluationCard evaluation={evaluation} eligible={eligible} />
          ) : null}

          {eligible ? (
            <>
              <Text style={styles.recoveryHint}>
                Xác nhận cây đã phục hồi sau điều trị. Backend sẽ kiểm tra lại evaluateRecovery trước khi cập nhật Tree Map.
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
            </>
          ) : null}

          {error ? (
            <Text style={styles.errText}>{error}</Text>
          ) : null}

          {eligible ? (
            saving ? (
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
            )
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ── Care Plan Section ─────────────────────────────────────────────────────────

const PLAN_STATUS_LABEL: Record<CarePlanStatus, string> = {
  PLANNED: "Đã lên kế hoạch",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

const PLAN_STATUS_COLOR: Record<CarePlanStatus, string> = {
  PLANNED: "#ca8a04",
  IN_PROGRESS: "#ea580c",
  COMPLETED: "#16a34a",
  CANCELLED: "#6b7280",
};

interface CarePlanSectionProps {
  treeId: string;
  diseaseCode: string;
  diagnosisId?: string | null;
  onSaved?: () => void;
}

function CarePlanSection({ treeId, diseaseCode, diagnosisId, onSaved }: CarePlanSectionProps) {
  const [plans, setPlans] = useState<TreeCarePlan[]>([]);
  const [recommendation, setRecommendation] = useState<TreeCareRecommendation | null>(null);
  const [planTasks, setPlanTasks] = useState<TreeCareTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [treatment, setTreatment] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      listCarePlans(treeId).catch(() => []),
      getLatestCareRecommendation(treeId).catch(() => null),
    ])
      .then(([planData, recommendationData]) => {
        setPlans(planData);
        setRecommendation(recommendationData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [treeId]);

  const activePlan = plans.find(
    (p) => p.status === "PLANNED" || p.status === "IN_PROGRESS",
  );

  useEffect(() => {
    if (!activePlan?.id) {
      setPlanTasks([]);
      return;
    }
    listCarePlanTasks(activePlan.id).then(setPlanTasks).catch(() => setPlanTasks([]));
  }, [activePlan?.id]);

  async function generateRecommendation() {
    setSaving(true);
    setError(null);
    try {
      const draft = await createCareRecommendation(treeId, { diagnosisId: diagnosisId ?? undefined });
      setRecommendation(draft);
      setFollowUpDate(draft.followUpDate ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo đề xuất AI.");
    } finally {
      setSaving(false);
    }
  }

  async function acceptRecommendation() {
    if (!recommendation) return;
    setSaving(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const plan = await acceptCareRecommendation(treeId, recommendation.id, {
        treatment: treatment.trim() || undefined,
        startDate: today,
        followUpDate: followUpDate || recommendation.followUpDate || undefined,
        tasks: recommendation.tasks,
      });
      setPlans((prev) => [plan, ...prev.filter((item) => item.id !== plan.id)]);
      const refreshed = await getLatestCareRecommendation(treeId).catch(() => null);
      setRecommendation(refreshed);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể chấp nhận đề xuất.");
    } finally {
      setSaving(false);
    }
  }

  async function create() {
    if (!diseaseCode) return;
    setSaving(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const plan = await createCarePlan(treeId, {
        diseaseCode,
        diagnosisId: diagnosisId ?? undefined,
        treatment: treatment.trim() || undefined,
        startDate: today,
        followUpDate: followUpDate || undefined,
      } as CreateCarePlanRequest);
      setPlans((prev) => [plan, ...prev]);
      setExpanded(false);
      setTreatment("");
      setFollowUpDate("");
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo kế hoạch.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <View style={styles.card}>
      <Pressable onPress={() => setExpanded((v) => !v)} style={styles.panelHeader}>
        <Text style={styles.cardTitle}>Kế hoạch chăm sóc</Text>
        {expanded ? (
          <ChevronUp size={18} color="#6b7280" />
        ) : (
          <ChevronDown size={18} color="#6b7280" />
        )}
      </Pressable>

      {activePlan ? (
        <View style={styles.activePlanBox}>
          <View style={styles.activePlanRow}>
            <Text style={styles.activePlanLabel}>Trạng thái:</Text>
            <Text style={[styles.activePlanStatus, { color: PLAN_STATUS_COLOR[activePlan.status] }]}>
              {PLAN_STATUS_LABEL[activePlan.status]}
            </Text>
          </View>
          {activePlan.treatment ? (
            <View style={styles.activePlanRow}>
              <Text style={styles.activePlanLabel}>Điều trị:</Text>
              <Text style={styles.activePlanValue}>{activePlan.treatment}</Text>
            </View>
          ) : null}
          {activePlan.followUpDate ? (
            <View style={styles.activePlanRow}>
              <Text style={styles.activePlanLabel}>Tái khám:</Text>
              <Text style={styles.activePlanValue}>{activePlan.followUpDate}</Text>
            </View>
          ) : null}
          {planTasks.map((task) => (
            <View key={task.id} style={styles.taskRow}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              {task.scheduledDate ? <Text style={styles.taskDate}>{task.scheduledDate}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}

      {!activePlan ? (
        <View style={styles.recommendationBox}>
          <Text style={styles.recommendationTitle}>AI đề xuất chăm sóc</Text>
          {!recommendation ? (
            <Pressable
              onPress={generateRecommendation}
              disabled={saving || !diagnosisId}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: "#047857" },
                (pressed || saving || !diagnosisId) && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.primaryBtnText}>Tạo đề xuất từ AI/KB</Text>
            </Pressable>
          ) : (
            <>
              <Text style={styles.recommendationDisease}>
                {String(recommendation.recommendationSnapshot.vietnameseName ?? recommendation.diseaseCode)}
              </Text>
              {typeof recommendation.recommendationSnapshot.summary === "string" ? (
                <Text style={styles.recommendationText}>{recommendation.recommendationSnapshot.summary}</Text>
              ) : null}
              {Array.isArray(recommendation.recommendationSnapshot.careActions)
                ? recommendation.recommendationSnapshot.careActions.slice(0, 4).map((item, index) => (
                    <Text key={`${String(item)}-${index}`} style={styles.recommendationText}>• {String(item)}</Text>
                  ))
                : null}
              <TextInput
                style={[styles.notesInput, { marginTop: 8 }]}
                placeholder="Chỉnh nội dung kế hoạch trước khi chấp nhận..."
                placeholderTextColor="#9ca3af"
                multiline
                value={treatment}
                onChangeText={setTreatment}
              />
              <TextInput
                style={[styles.notesInput, { marginTop: 8 }]}
                placeholder="Ngày tái khám (yyyy-mm-dd)..."
                placeholderTextColor="#9ca3af"
                value={followUpDate || recommendation.followUpDate || ""}
                onChangeText={setFollowUpDate}
              />
              {recommendation.status === "DRAFT" ? (
                <Pressable
                  onPress={acceptRecommendation}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: "#047857", marginTop: 8 },
                    (pressed || saving) && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.primaryBtnText}>Chấp nhận kế hoạch</Text>
                </Pressable>
              ) : (
                <Text style={styles.recommendationAccepted}>Đã chấp nhận thành kế hoạch chăm sóc.</Text>
              )}
            </>
          )}
        </View>
      ) : null}

      {expanded ? (
        <View style={styles.aiBody}>
          <Text style={styles.recoveryHint}>
            Tạo kế hoạch điều trị và lên lịch tái khám cho cây.
          </Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Ghi chú điều trị (tùy chọn)..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            value={treatment}
            onChangeText={setTreatment}
          />
          <TextInput
            style={[styles.notesInput, { marginTop: 8 }]}
            placeholder="Ngày tái khám (yyyy-mm-dd)..."
            placeholderTextColor="#9ca3af"
            value={followUpDate}
            onChangeText={setFollowUpDate}
          />
          {error ? <Text style={styles.errText}>{error}</Text> : null}
          {saving ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#ea580c" />
              <Text style={styles.loadingText}>Đang lưu...</Text>
            </View>
          ) : (
            <Pressable
              onPress={create}
              style={({ pressed }) => [
                styles.recoveryBtn,
                { backgroundColor: "#ea580c" },
                pressed && { opacity: 0.8 },
              ]}
            >
              <CheckCircle size={15} color="#fff" />
              <Text style={styles.primaryBtnText}>Tạo kế hoạch chăm sóc</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

// ── Treatment Panel (DISEASED → TREATING) ────────────────────────────────────

interface TreatmentPanelProps {
  treeId: string;
  onSaved: () => void;
}

function TreatmentPanel({ treeId, onSaved }: TreatmentPanelProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startTreating() {
    setSaving(true);
    setError(null);
    try {
      await updateTreeHealthStatus(treeId, "TREATING");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật thất bại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.card, { borderColor: "#fed7aa" }]}>
      <Text style={[styles.cardTitle, { color: "#ea580c" }]}>Bắt đầu điều trị</Text>
      <Text style={[styles.recoveryHint]}>
        Xác nhận bạn đã bắt đầu điều trị cho cây này. Trạng thái sẽ chuyển sang "Đang điều trị".
      </Text>
      {error ? <Text style={styles.errText}>{error}</Text> : null}
      {saving ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#ea580c" />
          <Text style={styles.loadingText}>Đang cập nhật...</Text>
        </View>
      ) : (
        <Pressable
          onPress={startTreating}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: "#ea580c" },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.primaryBtnText}>Bắt đầu điều trị</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── TreeDetailContent — reusable (used by screen and by inline sheet) ─────────

interface ContentProps {
  treeId: string;
  onClose?: () => void;
  onDiagnosisSaved?: () => void;
  onRemoved?: () => void;
}

function treeFailureMessage(error: unknown, fallback: string) {
  const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 0;
  const messages: Record<number, string> = {400:"Thông tin cây không hợp lệ. Vui lòng kiểm tra lại.",401:"Vui lòng đăng nhập lại.",403:"Bạn không có quyền thao tác trên cây này.",404:"Không tìm thấy cây. Vui lòng tải lại danh sách.",409:"Trạng thái cây đã thay đổi. Vui lòng tải lại."};
  return status >= 500 ? "Dịch vụ cây đang gặp lỗi. Vui lòng thử lại sau." : messages[status] ?? fallback;
}

export function TreeDetailContent({ treeId, onClose, onDiagnosisSaved, onRemoved }: ContentProps) {
  const [tree, setTree] = useState<TreeDetail | null>(null);
  const [diagnoses, setDiagnoses] = useState<TreeDiagnosis[]>([]);
  const [progressEvaluation, setProgressEvaluation] =
    useState<RecoveryEvaluationResponse | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load(active: { value: boolean }) {
    setLoading(true);
    Promise.all([getTree(treeId), listDiagnoses(treeId, 0, 20)])
      .then(([treeData, diagData]) => {
        if (!active.value) return;
        setTree(treeData);
        setDiagnoses(diagData.content ?? []);
        setProgressEvaluation(null);
      })
      .catch((err) => {
        if (!active.value) return;
        setError(treeFailureMessage(err, "Không thể tải chi tiết cây. Vui lòng kiểm tra kết nối."));
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

  useEffect(() => {
    if (!treeId || diagnoses.length < 2 || tree?.healthStatus === "RECOVERED") {
      setProgressEvaluation(null);
      return;
    }
    const active = { value: true };
    setProgressLoading(true);
    evaluateRecovery(treeId)
      .then((result) => {
        if (active.value) setProgressEvaluation(result);
      })
      .catch(() => {
        if (active.value) setProgressEvaluation(null);
      })
      .finally(() => {
        if (active.value) setProgressLoading(false);
      });
    return () => {
      active.value = false;
    };
  }, [treeId, diagnoses.length, tree?.healthStatus]);

  function refresh() {
    const active = { value: true };
    load(active);
    onDiagnosisSaved?.();
  }

  function confirmRemoveTree() {
    if (!tree) return;
    Alert.alert(
      "Đã đốn cây?",
      `Cây ${tree.treeCode} sẽ được xóa khỏi bản đồ và danh sách cây đang hoạt động. Lịch sử chẩn đoán/kế hoạch chăm sóc vẫn được giữ lại.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đã đốn cây",
          style: "destructive",
          onPress: async () => {
            setRemoving(true);
            setError(null);
            try {
              await removeTree(treeId);
              onRemoved?.();
              onClose?.();
            } catch (err) {
              setError(treeFailureMessage(err, "Không thể xóa cây khỏi bản đồ. Vui lòng kiểm tra kết nối."));
            } finally {
              setRemoving(false);
            }
          },
        },
      ],
    );
  }

  const health = tree?.healthStatus;
  const needsRecovery = health === "TREATING";
  const needsTreatment = health === "DISEASED" || health === "SUSPECTED";
  const needsCarePlan =
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

      {tree.status !== "REMOVED" ? (
        <Pressable
          accessibilityRole="button"
          onPress={confirmRemoveTree}
          disabled={removing}
          style={({ pressed }) => [
            styles.removeTreeBtn,
            pressed && { opacity: 0.82 },
            removing && { opacity: 0.55 },
          ]}
        >
          {removing ? (
            <ActivityIndicator size="small" color="#b91c1c" />
          ) : (
            <Trash2 size={15} color="#b91c1c" />
          )}
          <Text style={styles.removeTreeBtnText}>Đã đốn cây</Text>
        </Pressable>
      ) : (
        <View style={styles.removedBadge}>
          <Text style={styles.removedBadgeText}>Đã xóa khỏi bản đồ</Text>
        </View>
      )}

      {/* Start treatment button — for DISEASED or SUSPECTED trees */}
      {needsTreatment ? (
        <TreatmentPanel treeId={treeId} onSaved={refresh} />
      ) : null}

      {/* Recovery confirmation panel — only for trees being treated */}
      {needsRecovery ? (
        <RecoveryPanel treeId={treeId} treeCode={tree.treeCode} onSaved={refresh} />
      ) : null}

      {/* Care plan section — for sick/suspected/treating trees */}
      {needsCarePlan ? (
        <CarePlanSection
          treeId={treeId}
          diseaseCode={tree.latestDiseaseCode ?? "UNKNOWN"}
          diagnosisId={diagnoses[0]?.id ?? null}
          onSaved={refresh}
        />
      ) : null}

      {/* Embedded AI diagnosis panel */}
      <AIPanel treeId={treeId} treeCode={tree.treeCode} onSaved={refresh} />

      {progressLoading ? (
        <View style={styles.card}>
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={durianTheme.colors.moss} />
            <Text style={styles.loadingText}>Đang đánh giá tiến triển...</Text>
          </View>
        </View>
      ) : progressEvaluation ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Đánh giá tiến triển</Text>
          <RecoveryEvaluationCard evaluation={progressEvaluation} />
        </View>
      ) : null}

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
  removeTreeBtn: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  removeTreeBtnText: { color: "#b91c1c", fontSize: 13, fontWeight: "800" },
  removedBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f3f4f6",
    borderColor: "#e5e7eb",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  removedBadgeText: { color: "#6b7280", fontSize: 12, fontWeight: "800" },

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
  activePlanBox: { marginTop: 8, padding: 10, backgroundColor: "#fff7ed", borderRadius: 8, gap: 4 },
  activePlanRow: { flexDirection: "row", gap: 6 },
  activePlanLabel: { fontSize: 12, fontWeight: "600", color: "#6b7280", minWidth: 80 },
  activePlanStatus: { fontSize: 12, fontWeight: "700" },
  activePlanValue: { fontSize: 12, color: "#374151", flex: 1 },
  taskRow: { backgroundColor: "#eff6ff", borderRadius: 8, padding: 8, gap: 2 },
  taskTitle: { color: "#1f2937", fontSize: 12, fontWeight: "800" },
  taskDate: { color: "#6b7280", fontSize: 11 },
  recommendationBox: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
    padding: 10,
  },
  recommendationTitle: { color: "#047857", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  recommendationDisease: { color: durianTheme.colors.ink, fontSize: 14, fontWeight: "900" },
  recommendationText: { color: "#374151", fontSize: 12, lineHeight: 18 },
  recommendationAccepted: {
    backgroundColor: "#fff",
    borderRadius: 8,
    color: "#047857",
    fontSize: 12,
    fontWeight: "800",
    padding: 8,
  },

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

  evalBox: { borderWidth: 1, borderRadius: 10, gap: 8, padding: 10, marginBottom: 8 },
  evalHeader: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  evalOutcome: { flex: 1, fontSize: 13, fontWeight: "800" },
  evalPill: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 999,
    fontSize: 9,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  evalReason: { fontSize: 12, color: durianTheme.colors.muted, lineHeight: 18 },
  evalCompareRow: { flexDirection: "row", gap: 8 },
  evalCompareBox: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 9,
    flex: 1,
    padding: 8,
  },
  evalCompareLabel: { color: durianTheme.colors.muted, fontSize: 10, fontWeight: "800" },
  evalCompareValue: { color: durianTheme.colors.ink, fontSize: 11, fontWeight: "900", marginTop: 3 },
  evalCompareMeta: { color: durianTheme.colors.muted, fontSize: 10, marginTop: 2 },
  evalNextAction: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 9,
    color: durianTheme.colors.ink,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 17,
    padding: 8,
  },
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
