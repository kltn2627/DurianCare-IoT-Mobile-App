import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
  Trash2,
} from "lucide-react-native";
import { ConfirmModal } from "@/src/components/ConfirmModal";
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
  TreeHealthStatus,
} from "./treeTypes";
import { knowledgeApi } from "@/src/features/knowledge/knowledgeApi";
import type { KnowledgeArticle } from "@/src/features/knowledge/knowledgeTypes";
import { createTreeYieldObservation, getSeasonYieldHistory, getZoneYieldForecast, listTreeYieldObservations, updateYieldForecastSettings, type SeasonYieldHistory, type TreeYieldForecast, type TreeYieldObservation, type ZoneYieldForecast } from "./yieldForecastApi";
import { listCultivationSeasons } from "@/src/features/cultivation/api/cultivationApi";
import type { CultivationSeason } from "@/src/features/cultivation/api/cultivationTypes";

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

const RISK_LABEL: Record<string, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  CRITICAL: "Nghiêm trọng",
};

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
  // Synchronous guards: a fast double tap must not send two uploads or two saves.
  const predictingRef = useRef(false);
  const savingRef = useRef(false);

  useEffect(() => () => abortRef.current?.abort(), []);

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
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setPredError("Cần cấp quyền truy cập thư viện ảnh.");
      return;
    }
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
    if (!photo || predictingRef.current) return;
    predictingRef.current = true;
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
      predictingRef.current = false;
      if (!ctrl.signal.aborted) setPredicting(false);
    }
  }

  async function saveResult() {
    if (!prediction || !photo || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setPredError(null);
    try {
      await saveDiagnosis(treeId, {
        // Server-stored image from /api/v1/predict; a device-local file:// path is useless to other clients.
        imageUrl: prediction.image?.url || "MOBILE_AI_NO_STORED_IMAGE",
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
      savingRef.current = false;
      setSaving(false);
    }
  }

  const cat = prediction?.disease.category;
  const risk = prediction?.decisionSupport?.riskLevel;
  const actions = (prediction?.decisionSupport?.immediateActions ?? []).filter(Boolean).slice(0, 4);
  const summary = prediction?.recommendation?.diseaseSummary;

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.panelHeader}
        accessibilityRole="button"
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Chẩn đoán bệnh bằng ảnh</Text>
        </View>
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
              <Pressable onPress={pickFromCamera} disabled={predicting || saving}
                style={[styles.pickerBtn, (predicting || saving) && { opacity: 0.5 }]}>
                <Camera size={15} color={durianTheme.colors.moss} />
                <Text style={styles.pickerBtnText}>Chụp ảnh</Text>
              </Pressable>
              <Pressable onPress={pickFromGallery} disabled={predicting || saving}
                style={[styles.pickerBtn, (predicting || saving) && { opacity: 0.5 }]}>
                <Images size={15} color={durianTheme.colors.moss} />
                <Text style={styles.pickerBtnText}>{photo ? "Chọn ảnh khác" : "Thư viện"}</Text>
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
              disabled={predicting}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.primaryBtnText}>Tải ảnh lên & chẩn đoán</Text>
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
              {risk ? (
                <Text style={styles.resultNote}>Mức rủi ro: {RISK_LABEL[risk] ?? risk}</Text>
              ) : null}
              {summary ? <Text style={styles.resultNote}>{summary}</Text> : null}
              {actions.length > 0 ? (
                <View style={{ marginTop: 4, gap: 2 }}>
                  <Text style={styles.kbSectionTitle}>Khuyến nghị xử lý</Text>
                  {actions.map((action, i) => (
                    <Text key={i} style={styles.resultNote}>• {action}</Text>
                  ))}
                </View>
              ) : null}
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
              disabled={saving}
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
              {/* Upload/AI failures retry with the "Tải ảnh lên & chẩn đoán" button above (photo is kept). */}
              <Pressable onPress={reset} style={styles.ghostBtn}>
                <Text style={styles.ghostBtnText}>Bắt đầu lại</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ── AI recovery evaluation (advisory only; never blocks a manual status change) ─

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
  RECOVERED: "AI thấy cây đã hồi phục. Bạn có thể cập nhật trạng thái “Đã hồi phục” nếu đồng ý.",
  IMPROVED: "Tiếp tục kế hoạch chăm sóc hiện tại và đặt lịch tái khám tiếp theo nếu cần.",
  STABLE: "Tiếp tục điều trị/theo dõi và tái khám để có thêm dữ liệu.",
  WORSENED: "Đánh giá lại hướng xử lý, xem lại Knowledge Base hoặc tạo kế hoạch chăm sóc mới.",
  UNCERTAIN: "Chụp/đưa ảnh rõ hơn hoặc kiểm tra thêm trước khi kết luận.",
};

function formatPercent(value?: number | null) {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}

function RecoveryEvaluationCard({ evaluation }: { evaluation: RecoveryEvaluationResponse }) {
  const color = RECOVERY_OUTCOME_COLOR[evaluation.outcome] ?? RECOVERY_OUTCOME_COLOR.UNCERTAIN;
  const backgroundColor = RECOVERY_OUTCOME_BG[evaluation.outcome] ?? RECOVERY_OUTCOME_BG.UNCERTAIN;
  return (
    <View style={[styles.evalBox, { backgroundColor, borderColor: color }]}>
      <View style={styles.evalHeader}>
        <Text style={[styles.evalOutcome, { color }]}>
          {RECOVERY_OUTCOME_LABEL[evaluation.outcome] ?? evaluation.outcome}
        </Text>
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

// ── Manual health status (any of the five values; AI diagnosis is optional) ───

const HEALTH_OPTIONS: Array<{ value: TreeHealthStatus; label: string }> = [
  { value: "HEALTHY", label: "Khỏe mạnh" },
  { value: "SUSPECTED", label: "Nghi ngờ" },
  { value: "DISEASED", label: "Bệnh" },
  { value: "TREATING", label: "Đang điều trị" },
  { value: "RECOVERED", label: "Đã hồi phục" },
];

interface HealthStatusPickerProps {
  treeId: string;
  treeCode: string;
  current?: TreeHealthStatus | null;
  onSaved: () => void;
}

function HealthStatusPicker({ treeId, treeCode, current, onSaved }: HealthStatusPickerProps) {
  const [choice, setChoice] = useState<TreeHealthStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<TreeHealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const target = choice ?? current ?? null;
  const canSave = Boolean(choice) && choice !== current && !saving;

  async function save() {
    if (!choice || choice === current || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const updated = await updateTreeHealthStatus(treeId, choice);
      setSaved((updated.healthStatus ?? choice) as TreeHealthStatus);
      setChoice(null);
      onSaved();
    } catch (err) {
      setError(treeFailureMessage(err, "Cập nhật trạng thái thất bại."));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Cập nhật trạng thái sức khỏe</Text>
      <View style={styles.statusOptions} accessibilityRole="radiogroup">
        {HEALTH_OPTIONS.map((option) => {
          const selected = target === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: saving }}
              disabled={saving}
              onPress={() => { setChoice(option.value); setSaved(null); setError(null); }}
              style={[styles.statusOption, selected && styles.statusOptionSelected]}
            >
              <Text style={[styles.statusOptionText, selected && styles.statusOptionTextSelected]}>
                {option.label}{option.value === current ? " (hiện tại)" : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.errText}>{error}</Text> : null}
      {saved ? (
        <Text style={styles.statusSaved}>
          Đã lưu: cây {treeCode} chuyển sang {HEALTH_OPTIONS.find((o) => o.value === saved)?.label ?? saved}.
        </Text>
      ) : null}
      <Pressable
        onPress={() => void save()}
        disabled={!canSave}
        style={({ pressed }) => [styles.primaryBtn, !canSave && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}
      >
        {saving ? <ActivityIndicator size="small" color="#fff" /> : null}
        <Text style={styles.primaryBtnText}>{saving ? "Đang lưu..." : "Lưu trạng thái"}</Text>
      </Pressable>
    </View>
  );
}

// ── TreeDetailContent — reusable (used by screen and by inline sheet) ─────────

interface ContentProps {
  treeId: string;
  onClose?: () => void;
  onDiagnosisSaved?: () => void;
  onYieldSaved?: () => void;
  onRemoved?: () => void;
}

function TreeYieldPanel({ treeId, farmId, zoneId, onChanged }: { treeId: string; farmId: string; zoneId: string; onChanged?: () => void }) {
  const [season, setSeason] = useState<CultivationSeason | null>(null);
  const [forecast, setForecast] = useState<ZoneYieldForecast | null>(null);
  const [treeForecast, setTreeForecast] = useState<TreeYieldForecast | null>(null);
  const [observations, setObservations] = useState<TreeYieldObservation[]>([]);
  const [history, setHistory] = useState<SeasonYieldHistory[]>([]);
  const [fruitCount, setFruitCount] = useState("");
  const [weightOverride, setWeightOverride] = useState("");
  const [note, setNote] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async (activeSeason?: CultivationSeason) => {
    const seasons = activeSeason ? [activeSeason] : await listCultivationSeasons({ farmId, plotId: zoneId });
    const now = new Date();
    const chosen = seasons.find((item) => new Date(item.startDate) <= now && (!item.endDate || new Date(item.endDate) >= now))
      ?? seasons.filter((item) => !item.endDate || new Date(item.endDate) >= now).sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
      ?? null;
    setSeason(chosen);
    if (!chosen) { setForecast(null); setTreeForecast(null); setObservations([]); setHistory([]); return; }
    const [nextForecast, nextObservations, nextHistory] = await Promise.all([
      getZoneYieldForecast(chosen.id, zoneId),
      listTreeYieldObservations(treeId, chosen.id),
      getSeasonYieldHistory(chosen.id, zoneId),
    ]);
    setForecast(nextForecast);
    setTreeForecast(nextForecast.trees?.find((item) => item.treeId === treeId) ?? null);
    setObservations(nextObservations);
    setHistory(nextHistory);
    setPrice(nextForecast.expectedPricePerKg == null ? "" : String(nextForecast.expectedPricePerKg));
  }, [farmId, zoneId, treeId]);

  useEffect(() => { let active = true; reload().catch((e) => { if (active) setError(e instanceof Error ? e.message : "Không thể tải dự báo mùa vụ."); }); return () => { active = false; }; }, [reload]);

  async function saveObservation() {
    const count = Number(fruitCount);
    if (!season || !Number.isInteger(count) || count < 0) { setError("Nhập số trái hợp lệ."); return; }
    setBusy(true); setError(null); setMessage(null);
    try {
      await createTreeYieldObservation(treeId, { seasonId: season.id, zoneId, fruitCount: count, ...(weightOverride.trim() ? { averageFruitWeightKgOverride: Number(weightOverride) } : {}), ...(note.trim() ? { note: note.trim() } : {}) });
      await reload(season); onChanged?.(); setFruitCount(""); setWeightOverride(""); setNote(""); setMessage("Đã lưu và tải lại số liệu từ hệ thống.");
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể lưu ghi nhận."); }
    finally { setBusy(false); }
  }

  async function savePrice() {
    if (!season || !price.trim() || !Number.isFinite(Number(price)) || Number(price) < 0) { setError("Nhập giá dự kiến/kg hợp lệ."); return; }
    setBusy(true); setError(null); setMessage(null);
    try { await updateYieldForecastSettings(season.id, zoneId, { expectedPricePerKg: Number(price), currencyCode: "VND" }); await reload(season); onChanged?.(); setMessage("Đã lưu giá và doanh thu dự kiến."); }
    catch (e) { setError(e instanceof Error ? e.message : "Không thể lưu giá."); }
    finally { setBusy(false); }
  }

  async function useHistoricalWeight() {
    if (!season || forecast?.suggestedAverageFruitWeightKg == null) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      await updateYieldForecastSettings(season.id, zoneId, { defaultAverageFruitWeightKg: forecast.suggestedAverageFruitWeightKg, expectedPricePerKg: forecast.expectedPricePerKg ?? undefined, currencyCode: forecast.currencyCode ?? "VND" });
      await reload(season); onChanged?.(); setMessage("Đã dùng khối lượng trung bình lịch sử cho dự báo vụ hiện tại.");
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể lưu khối lượng lịch sử."); }
    finally { setBusy(false); }
  }

  return <View style={styles.card}>
    <Text style={styles.cardTitle}>Sản lượng mùa vụ · {season?.name ?? "Chưa có vụ hiện tại"}</Text>
    {!season ? <Text style={styles.emptyText}>Chưa có mùa vụ hiện tại cho vùng này.</Text> : <>
      <InfoRow label="Trạng thái" value="MÙA HIỆN TẠI · DỰ KIẾN" />
      <InfoRow label="Số trái hiện tại" value={treeForecast?.fruitCount ?? observations[0]?.fruitCount ?? "Chưa ghi nhận"} />
      <InfoRow label="Khối lượng TB/trái" value={treeForecast?.averageFruitWeightKgUsed != null ? `${treeForecast.averageFruitWeightKgUsed} kg (${treeForecast.averageWeightSource === "ZONE_DEFAULT" ? "ZONE_SEASON_DEFAULT" : treeForecast.averageWeightSource ?? "—"})` : "Chưa đủ dữ liệu"} />
      <InfoRow label="Sản lượng cây dự kiến" value={treeForecast?.estimatedYieldKg != null ? `${treeForecast.estimatedYieldKg} kg` : "Chưa đủ dữ liệu"} />
      <InfoRow label="Ghi nhận gần nhất" value={treeForecast?.lastObservedAt ? new Date(treeForecast.lastObservedAt).toLocaleString("vi-VN") : "Chưa ghi nhận"} />
      <TextInput style={styles.notesInput} keyboardType="number-pad" value={fruitCount} onChangeText={setFruitCount} placeholder="Số trái *" placeholderTextColor="#9ca3af" />
      <TextInput style={styles.notesInput} keyboardType="decimal-pad" value={weightOverride} onChangeText={setWeightOverride} placeholder="Khối lượng kg/trái (tùy chọn)" placeholderTextColor="#9ca3af" />
      <TextInput style={styles.notesInput} value={note} onChangeText={setNote} placeholder="Ghi chú (tùy chọn)" placeholderTextColor="#9ca3af" />
      <Pressable disabled={busy} onPress={saveObservation} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>{busy ? "Đang lưu…" : "Ghi nhận số trái"}</Text></Pressable>
      <Text style={styles.infoLabel}>Giá bán dự kiến (VND/kg)</Text>
      <TextInput style={styles.notesInput} keyboardType="decimal-pad" value={price} onChangeText={setPrice} placeholder="Chưa nhập giá" placeholderTextColor="#9ca3af" />
      <Pressable disabled={busy} onPress={savePrice} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>Lưu giá và tải lại dự báo</Text></Pressable>
      {forecast ? <>
        <InfoRow label="Dự kiến toàn vùng" value={`${forecast.estimatedYieldKg} kg · ${forecast.observedTrees}/${forecast.totalTrees} cây đã ghi nhận`} />
        <InfoRow label="Doanh thu dự kiến" value={forecast.estimatedRevenue == null ? "Chưa có giá" : new Intl.NumberFormat("vi-VN", { style: "currency", currency: forecast.currencyCode ?? "VND", maximumFractionDigits: 0 }).format(forecast.estimatedRevenue)} />
        {forecast.historyAvailable ? <>
          <InfoRow label="Vụ trước · thực tế" value={forecast.previousSeasonActualYieldKg == null ? "Chưa có" : `${forecast.previousSeasonActualYieldKg} kg`} />
          <InfoRow label="Trung bình lịch sử · thực tế" value={forecast.historicalAverageYieldKg == null ? "Chưa có" : `${forecast.historicalAverageYieldKg} kg`} />
          <InfoRow label="Chênh lệch với TB thực tế" value={forecast.differenceFromHistoricalAveragePercent == null ? "Chưa đủ dữ liệu" : `${forecast.differenceFromHistoricalAveragePercent > 0 ? "+" : ""}${forecast.differenceFromHistoricalAveragePercent}%`} />
          <InfoRow label="TB lịch sử mỗi trái" value={forecast.historicalAverageFruitWeightKg == null ? "Chưa đủ dữ liệu" : `${forecast.historicalAverageFruitWeightKg} kg/trái`} />
          {forecast.suggestedAverageFruitWeightKg != null ? <Pressable disabled={busy} onPress={useHistoricalWeight} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>Dùng {forecast.suggestedAverageFruitWeightKg} kg/trái làm khối lượng ước tính</Text></Pressable> : null}
        </> : null}
      </> : null}
      <Text style={styles.infoLabel}>Vụ trước · thực tế</Text>
      {history.length ? history.map((item) => <View key={item.seasonId} style={styles.activePlanBox}><Text style={styles.activePlanValue}>{item.seasonName} · Đã kết thúc · Thực tế: {item.actualYieldKg == null ? "chưa có khối lượng" : `${item.actualYieldKg} kg`}{item.actualFruitCount == null ? "" : ` · ${item.actualFruitCount} trái`}{item.actualAverageFruitWeightKg == null ? "" : ` · ${item.actualAverageFruitWeightKg} kg/trái`}{item.actualRevenue == null ? "" : ` · doanh thu ${item.actualRevenue} ${forecast?.currencyCode ?? "VND"}`}{item.finalHarvestDate ? ` · thu cuối ${item.finalHarvestDate}` : ""}</Text></View>) : <Text style={styles.emptyText}>Chưa có dữ liệu mùa vụ trước.</Text>}
    </>}
    {error ? <Text style={styles.errText}>{error}</Text> : null}{message ? <Text style={styles.successText}>{message}</Text> : null}
  </View>;
}

function treeFailureMessage(error: unknown, fallback: string) {
  const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 0;
  const messages: Record<number, string> = {400:"Thông tin cây không hợp lệ. Vui lòng kiểm tra lại.",401:"Vui lòng đăng nhập lại.",403:"Bạn không có quyền thao tác trên cây này.",404:"Không tìm thấy cây. Vui lòng tải lại danh sách.",409:"Trạng thái cây đã thay đổi. Vui lòng tải lại."};
  return status >= 500 ? "Dịch vụ cây đang gặp lỗi. Vui lòng thử lại sau." : messages[status] ?? fallback;
}

export function TreeDetailContent({ treeId, onClose, onDiagnosisSaved, onYieldSaved, onRemoved }: ContentProps) {
  const [tree, setTree] = useState<TreeDetail | null>(null);
  const [diagnoses, setDiagnoses] = useState<TreeDiagnosis[]>([]);
  const [progressEvaluation, setProgressEvaluation] =
    useState<RecoveryEvaluationResponse | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load(active: { value: boolean }) {
    setLoading(true);
    setError(null);
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

  // In-app ConfirmModal, not Alert.alert: on Expo web a multi-button Alert is a no-op, so the
  // "Đã đốn cây" button silently did nothing.
  async function removeConfirmedTree() {
    setRemoving(true);
    setError(null);
    try {
      await removeTree(treeId);
      setConfirmingRemove(false);
      onRemoved?.();
      onClose?.();
    } catch (err) {
      setConfirmingRemove(false);
      setError(treeFailureMessage(err, "Không thể xóa cây khỏi bản đồ. Vui lòng kiểm tra kết nối."));
    } finally {
      setRemoving(false);
    }
  }


  const health = tree?.healthStatus;
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
        <Pressable onPress={() => load({ value: true })} style={styles.ghostBtn} accessibilityRole="button">
          <RefreshCcw size={13} color={durianTheme.colors.moss} />
          <Text style={styles.ghostBtnText}>Thử lại</Text>
        </Pressable>
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
          onPress={() => setConfirmingRemove(true)}
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

      {/* Manual health status — any of the five values, no AI prerequisite */}
      {tree.status !== "REMOVED" ? (
        <HealthStatusPicker treeId={treeId} treeCode={tree.treeCode} current={health} onSaved={refresh} />
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
      <TreeYieldPanel treeId={tree.id} farmId={tree.farmId} zoneId={tree.farmZoneId} onChanged={onYieldSaved} />
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
      <ConfirmModal
        visible={confirmingRemove}
        title={`Đã đốn cây ${tree.treeCode}?`}
        message="Cây sẽ được xóa khỏi bản đồ và danh sách cây đang hoạt động. Lịch sử chẩn đoán/kế hoạch chăm sóc vẫn được giữ lại."
        confirmLabel="Đã đốn cây"
        tone="danger"
        busy={removing}
        onCancel={() => setConfirmingRemove(false)}
        onConfirm={() => void removeConfirmedTree()}
      />
    </ScrollView>
  );
}

// ── Standalone screen wrapper ─────────────────────────────────────────────────

interface Props {
  treeId: string;
}

export function TreeDetailScreen({ treeId }: Props) {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Pressable
        accessibilityRole="button"
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/(main)/farms"))}
        style={styles.backRow}
      >
        <Text style={styles.backRowText}>← Quay lại</Text>
      </Pressable>
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
  statusOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 },
  statusOption: { borderColor: "#d1d5db", borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  statusOptionSelected: { backgroundColor: durianTheme.colors.moss, borderColor: durianTheme.colors.moss },
  statusOptionText: { color: "#374151", fontSize: 13, fontWeight: "700" },
  statusOptionTextSelected: { color: "#fff" },
  statusSaved: { color: "#15803d", fontSize: 13, fontWeight: "600", marginBottom: 6 },
  container: { flex: 1, backgroundColor: durianTheme.colors.canvas },
  backRow: { paddingHorizontal: 16, paddingTop: 8 },
  backRowText: { fontSize: 14, fontWeight: "700", color: durianTheme.colors.moss },
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
