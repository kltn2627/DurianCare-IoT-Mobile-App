import {
  AlertCircle,
  Check,
  ClipboardList,
  Eye,
  Leaf,
  LoaderCircle,
  PackageCheck,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  X,
} from "lucide-react-native";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { AuthApiError } from "@/src/features/auth/authApi";
import {
  assessCompliance,
  approveExportRelease,
  createExportRelease,
  createHarvestBatch,
  getChemicalHistory,
  getExportReleaseTraceability,
  getSafeHarvestDate,
  listAuthorizedFarms,
  listCultivationActivities,
  listCultivationPlans,
  listCultivationSeasons,
  listExportReleases,
  listHarvestBatches,
  listLabSamples,
  listOwnedFarms,
  listResidueStandards,
  recallExportRelease,
  releaseExportRelease,
  submitExportRelease,
} from "@/src/features/cultivation/api/cultivationApi";
import {
  exportReleaseStatusLabels,
  getExportStatusTone,
  getHarvestStatusTone,
  harvestBatchStatusLabels,
  riskLevelLabels,
} from "@/src/features/cultivation/api/cultivationLabels";
import {
  formatDate,
  formatDateTime,
  instantToLocalInputValue,
  localDateTimeToInstant,
} from "@/src/features/cultivation/api/cultivationDateUtils";
import {
  buildFoundationFarmOptions,
  buildFoundationSeasonOptions,
  buildFoundationZoneOptions,
  emptyFoundationSelection,
  reconcileFoundationSelection,
  shortFoundationId,
  type CareFoundationSelection,
} from "@/src/features/cultivation/api/farmFoundation";
import type {
  AuthorizedFarm,
  CareFarmOption,
  CareSeasonOption,
  CareZoneOption,
  ComplianceAssessment,
  CultivationSeason,
  CultivationActivity,
  CultivationPlan,
  ExportRelease,
  FarmCatalog,
  HarvestBatch,
  LabSample,
  ResidueStandard,
  SafeHarvestDateResponse,
  TraceabilityResponse,
} from "@/src/features/cultivation/api/cultivationTypes";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

type TraceabilityData = {
  activities: CultivationActivity[];
  authorizedFarms: AuthorizedFarm[];
  harvestBatches: HarvestBatch[];
  ownedFarms: FarmCatalog[];
  plans: CultivationPlan[];
  releases: ExportRelease[];
  seasons: CultivationSeason[];
};

type SafetyData = {
  assessment: ComplianceAssessment | null;
  chemicalHistory: CultivationActivity[];
  labSamples: LabSample[];
  residueStandards: ResidueStandard[];
  safeHarvest: SafeHarvestDateResponse | null;
};

type HarvestDraft = {
  batchCode: string;
  expectedDestinationMarket: string;
  harvestedAt: string;
  overrideReason: string;
  overrideSafeHarvestDate: boolean;
  quantity: string;
  quantityUnit: string;
};

type ReleaseDraft = {
  harvestBatchId: string;
  releaseCode: string;
  targetMarketCode: string;
};

type ReleaseAction = "submit" | "approve" | "release" | "recall";
type Tone = "danger" | "neutral" | "success" | "warning";

const emptyData: TraceabilityData = {
  activities: [],
  authorizedFarms: [],
  harvestBatches: [],
  ownedFarms: [],
  plans: [],
  releases: [],
  seasons: [],
};

const emptySafetyData: SafetyData = {
  assessment: null,
  chemicalHistory: [],
  labSamples: [],
  residueStandards: [],
  safeHarvest: null,
};

const defaultHarvestDraft: HarvestDraft = {
  batchCode: "",
  expectedDestinationMarket: "VN",
  harvestedAt: instantToLocalInputValue(new Date().toISOString()),
  overrideReason: "",
  overrideSafeHarvestDate: false,
  quantity: "",
  quantityUnit: "kg",
};

const defaultReleaseDraft: ReleaseDraft = {
  harvestBatchId: "",
  releaseCode: "",
  targetMarketCode: "VN",
};

function friendlyError(error: unknown, fallback: string) {
  if (error instanceof AuthApiError && error.status === 403) return "Tài khoản hiện tại chưa có quyền thực hiện thao tác này.";
  return error instanceof Error && error.message ? error.message : fallback;
}

function hasWorkspaceAccess(role?: string | null) {
  return Boolean(role && ["ADMIN", "FARMER", "OWNER", "ENGINEER", "EXPERT"].includes(role));
}

function releaseActions(release: ExportRelease): Array<{ label: string; value: ReleaseAction }> {
  if (release.status === "DRAFT") return [{ label: "Gửi duyệt", value: "submit" }];
  if (release.status === "UNDER_REVIEW") return [{ label: "Duyệt", value: "approve" }, { label: "Thu hồi", value: "recall" }];
  if (release.status === "APPROVED") return [{ label: "Phát hành", value: "release" }, { label: "Thu hồi", value: "recall" }];
  if (release.status === "RELEASED") return [{ label: "Thu hồi", value: "recall" }];
  return [];
}

function readBoolean(value: unknown) {
  if (typeof value === "boolean") return value ? "Có" : "Không";
  return undefined;
}

function readValue(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  return String(value);
}

function snapshotSummary(snapshot?: TraceabilityResponse | null) {
  const data = snapshot?.snapshot;
  if (!data) return [];
  const harvest = data.harvestBatch;
  const compliance = data.complianceAssessment;
  const careHistory = data.careHistory;
  return [
    ["Release ID", snapshot.releaseId],
    ["Mã lô", harvest?.batchCode],
    ["Farm ID", harvest?.farmId],
    ["Khu/plot", harvest?.plotId],
    ["Season ID", harvest?.cultivationSeasonId],
    ["Thu hoạch", formatDateTime(harvest?.harvestedAt)],
    ["Sản lượng", harvest ? `${harvest.quantity} ${harvest.quantityUnit}` : undefined],
    ["Rủi ro hóa chất", harvest?.chemicalRiskLevel ? riskLevelLabels[harvest.chemicalRiskLevel] : undefined],
    ["Đủ điều kiện release", readBoolean(compliance?.eligibleForExportRelease)],
    ["Risk score", readValue(compliance?.riskScore)],
    ["Generated", formatDateTime(data.generatedAt)],
    ["Hoạt động chăm sóc", readValue(careHistory?.activities?.length)],
  ].filter((item): item is [string, string] => Boolean(item[1]));
}

export function DurianTraceabilityScreen() {
  const { session } = useSession();
  const [data, setData] = useState<TraceabilityData>(emptyData);
  const [selection, setSelection] = useState<CareFoundationSelection>(emptyFoundationSelection);
  const [harvestDraft, setHarvestDraft] = useState<HarvestDraft>(defaultHarvestDraft);
  const [releaseDraft, setReleaseDraft] = useState<ReleaseDraft>(defaultReleaseDraft);
  const [complianceMarketCode, setComplianceMarketCode] = useState("VN");
  const [safetyData, setSafetyData] = useState<SafetyData>(emptySafetyData);
  const [selectedRelease, setSelectedRelease] = useState<ExportRelease | null>(null);
  const [traceability, setTraceability] = useState<TraceabilityResponse | null>(null);
  const [showHarvestForm, setShowHarvestForm] = useState(false);
  const [showReleaseForm, setShowReleaseForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState("");

  const role = session?.user.backendRole ?? session?.user.role;
  const actorId = session?.user.id ?? "";
  const canOpen = hasWorkspaceAccess(role);

  const loadData = useCallback(
    async function loadData(options?: { silent?: boolean }) {
      if (!canOpen) {
        setLoading(false);
        return;
      }
      if (!options?.silent) setLoading(true);
      setError(null);
      setWarning(null);
      try {
        const [owned, authorized, plans, activities, harvestBatches, releases] = await Promise.allSettled([
          listOwnedFarms(),
          listAuthorizedFarms(),
          listCultivationPlans(),
          listCultivationActivities(),
          listHarvestBatches(),
          listExportReleases(),
        ]);
        if (plans.status === "rejected") throw plans.reason;
        if (activities.status === "rejected") throw activities.reason;
        if (harvestBatches.status === "rejected") throw harvestBatches.reason;
        if (releases.status === "rejected") throw releases.reason;
        const ownedFarms = owned.status === "fulfilled" ? owned.value : [];
        const authorizedFarms = authorized.status === "fulfilled" ? authorized.value : [];
        const farmIds = Array.from(new Set([
          ...ownedFarms.map((farm) => farm.id),
          ...authorizedFarms.map((farm) => farm.farmId),
          ...plans.value.map((plan) => plan.farmId),
          ...activities.value.map((activity) => activity.farmId),
          ...harvestBatches.value.map((batch) => batch.farmId),
        ].filter(Boolean)));
        const seasonResults = await Promise.allSettled(farmIds.map((farmId) => listCultivationSeasons({ farmId })));
        const next: TraceabilityData = {
          activities: activities.value,
          authorizedFarms,
          harvestBatches: harvestBatches.value,
          ownedFarms,
          plans: plans.value,
          releases: releases.value,
          seasons: seasonResults.flatMap((result) => (result.status === "fulfilled" ? result.value : [])),
        };
        if (owned.status === "rejected") {
          setWarning("Farm catalog chưa tải được; Mobile không dùng farm giả.");
        }
        if (authorized.status === "rejected") {
          setWarning((current) => `${current ? `${current} ` : ""}Danh sách farm được ủy quyền chưa tải được.`);
        }
        if (seasonResults.some((result) => result.status === "rejected")) {
          setWarning((current) => `${current ? `${current} ` : ""}Season catalog tải thiếu một số farm.`);
        }
        setData(next);
        setSelection((current) => reconcileFoundationSelection(next, current));
        setLastSyncedAt(new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date()));
      } catch (caught) {
        setError(friendlyError(caught, "Không thể tải dữ liệu harvest/export/traceability."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canOpen],
  );

  useEffect(() => {
    setData(emptyData);
    setSafetyData(emptySafetyData);
    setSelection(emptyFoundationSelection);
    setSelectedRelease(null);
    setTraceability(null);
    void loadData();
  }, [loadData, session?.user.id]);

  const loadSafetyData = useCallback(
    async function loadSafetyData(options?: { silent?: boolean }) {
      if (!canOpen || !selection.seasonId) {
        setSafetyData(emptySafetyData);
        return;
      }
      if (!options?.silent) setSafetyLoading(true);
      try {
        const [safeHarvest, chemicalHistory, labSamples, residueStandards] = await Promise.all([
          getSafeHarvestDate(selection.seasonId),
          getChemicalHistory(selection.seasonId),
          listLabSamples({ cultivationSeasonId: selection.seasonId }),
          listResidueStandards({ commodityCode: "DURIAN", marketCode: complianceMarketCode.trim() || undefined }),
        ]);
        setSafetyData((current) => ({
          ...current,
          chemicalHistory,
          labSamples,
          residueStandards,
          safeHarvest,
        }));
      } catch (caught) {
        setError(friendlyError(caught, "Không thể tải dữ liệu an toàn mùa vụ."));
      } finally {
        setSafetyLoading(false);
      }
    },
    [canOpen, complianceMarketCode, selection.seasonId],
  );

  useEffect(() => {
    void loadSafetyData();
  }, [loadSafetyData]);

  const farms = useMemo(() => buildFoundationFarmOptions(data), [data]);
  const zones = useMemo(() => buildFoundationZoneOptions(data, selection.farmId), [data, selection.farmId]);
  const seasons = useMemo(() => buildFoundationSeasonOptions(data, selection.farmId, selection.zoneId), [data, selection.farmId, selection.zoneId]);
  const batches = useMemo(
    () =>
      data.harvestBatches.filter(
        (batch) =>
          (!selection.farmId || batch.farmId === selection.farmId) &&
          (!selection.zoneId || batch.plotId === selection.zoneId) &&
          (!selection.seasonId || batch.cultivationSeasonId === selection.seasonId),
      ),
    [data.harvestBatches, selection],
  );
  const releases = useMemo(() => data.releases.filter((release) => batches.some((batch) => batch.id === release.harvestBatchId)), [batches, data.releases]);
  const releasedCount = releases.filter((release) => release.status === "RELEASED").length;
  const blockedCount = [...batches.filter((batch) => batch.status === "BLOCKED"), ...releases.filter((release) => release.status === "BLOCKED")].length;

  function refresh() {
    setRefreshing(true);
    void loadData({ silent: true });
  }

  function selectFarm(farmId: string) {
    const nextZones = buildFoundationZoneOptions(data, farmId);
    const zoneId = nextZones[0]?.zoneId ?? "";
    const nextSeasons = buildFoundationSeasonOptions(data, farmId, zoneId);
    setSelection({ farmId, seasonId: nextSeasons[0]?.seasonId ?? "", zoneId });
  }

  function selectZone(zoneId: string) {
    const nextSeasons = buildFoundationSeasonOptions(data, selection.farmId, zoneId);
    setSelection((current) => ({ ...current, seasonId: nextSeasons[0]?.seasonId ?? "", zoneId }));
  }

  function openHarvestForm() {
    setHarvestDraft({
      ...defaultHarvestDraft,
      batchCode: `HB-${Date.now()}`,
    });
    setShowHarvestForm(true);
  }

  function openReleaseForm(batchId?: string) {
    setReleaseDraft({
      ...defaultReleaseDraft,
      harvestBatchId: batchId ?? batches[0]?.id ?? "",
      releaseCode: `ER-${Date.now()}`,
    });
    setShowReleaseForm(true);
  }

  async function runComplianceAssessment() {
    if (!selection.seasonId || !complianceMarketCode.trim()) {
      Alert.alert("Chưa đủ thông tin", "Cần season thật và thị trường mục tiêu để chạy compliance assessment.");
      return;
    }
    setSubmitting(true);
    try {
      const assessment = await assessCompliance(selection.seasonId, complianceMarketCode.trim());
      setSafetyData((current) => ({ ...current, assessment }));
      setNotice("Backend đã tạo compliance assessment cho season đang chọn.");
      await loadSafetyData({ silent: true });
      await loadData({ silent: true });
    } catch (caught) {
      setError(friendlyError(caught, "Không thể chạy compliance assessment."));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitHarvest() {
    const harvestedAt = localDateTimeToInstant(harvestDraft.harvestedAt);
    const quantity = Number(harvestDraft.quantity);
    if (!selection.farmId || !selection.zoneId || !selection.seasonId || !harvestDraft.batchCode.trim() || !harvestedAt || !Number.isFinite(quantity) || quantity <= 0) {
      Alert.alert("Chưa đủ thông tin", "Cần farm/khu/season thật, mã lô, thời điểm thu hoạch và sản lượng hợp lệ.");
      return;
    }
    if (harvestDraft.overrideSafeHarvestDate && !harvestDraft.overrideReason.trim()) {
      Alert.alert("Thiếu lý do", "Backend yêu cầu lý do khi override ngày thu hoạch an toàn.");
      return;
    }
    setSubmitting(true);
    try {
      await createHarvestBatch({
        batchCode: harvestDraft.batchCode.trim(),
        createdBy: actorId,
        cultivationSeasonId: selection.seasonId,
        expectedDestinationMarket: harvestDraft.expectedDestinationMarket.trim(),
        farmId: selection.farmId,
        harvestedAt,
        overrideReason: harvestDraft.overrideReason.trim() || null,
        overrideSafeHarvestDate: harvestDraft.overrideSafeHarvestDate,
        plotId: selection.zoneId,
        quantity,
        quantityUnit: harvestDraft.quantityUnit.trim(),
      });
      setShowHarvestForm(false);
      setNotice("Đã tạo lô thu hoạch trên backend.");
      await loadData({ silent: true });
    } catch (caught) {
      setError(friendlyError(caught, "Không thể tạo lô thu hoạch."));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRelease() {
    if (!releaseDraft.harvestBatchId || !releaseDraft.releaseCode.trim() || !releaseDraft.targetMarketCode.trim()) {
      Alert.alert("Chưa đủ thông tin", "Cần lô thu hoạch, mã release và thị trường.");
      return;
    }
    setSubmitting(true);
    try {
      await createExportRelease({
        harvestBatchId: releaseDraft.harvestBatchId,
        releaseCode: releaseDraft.releaseCode.trim(),
        submittedBy: actorId,
        targetMarketCode: releaseDraft.targetMarketCode.trim(),
      });
      setShowReleaseForm(false);
      setNotice("Đã tạo export release theo assessment backend.");
      await loadData({ silent: true });
    } catch (caught) {
      setError(friendlyError(caught, "Không thể tạo export release."));
    } finally {
      setSubmitting(false);
    }
  }

  async function openReleaseDetail(release: ExportRelease) {
    setSelectedRelease(release);
    setTraceability(null);
    setSnapshotLoading(true);
    try {
      setTraceability(await getExportReleaseTraceability(release.id));
    } catch (caught) {
      setError(friendlyError(caught, "Không thể tải traceability snapshot."));
    } finally {
      setSnapshotLoading(false);
    }
  }

  async function runReleaseAction(release: ExportRelease, action: ReleaseAction, recallReason?: string) {
    if (action === "recall" && !recallReason?.trim()) {
      Alert.alert("Thiếu lý do", "Backend yêu cầu lý do thu hồi release.");
      return;
    }
    setSubmitting(true);
    try {
      if (action === "submit") await submitExportRelease(release.id, actorId);
      if (action === "approve") await approveExportRelease(release.id, actorId);
      if (action === "release") await releaseExportRelease(release.id, actorId);
      if (action === "recall") await recallExportRelease(release.id, actorId, recallReason?.trim() ?? "");
      setNotice("Đã cập nhật workflow export release trên backend.");
      setSelectedRelease(null);
      setTraceability(null);
      await loadData({ silent: true });
    } catch (caught) {
      setError(friendlyError(caught, "Không thể cập nhật export release."));
    } finally {
      setSubmitting(false);
    }
  }

  if (!canOpen) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <DurianScreenHeader eyebrow="TRUY XUẤT" icon={Leaf} title="Không có quyền truy cập" subtitle="Module harvest/export dùng dữ liệu backend private và yêu cầu tài khoản farm/cultivation hợp lệ." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <DurianScreenHeader eyebrow="HARVEST / EXPORT / TRACEABILITY" icon={Leaf} title="Lô thu hoạch & release" subtitle={lastSyncedAt ? `Dữ liệu thật đồng bộ lúc ${lastSyncedAt}` : "Không dùng season/QR mẫu"} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl colors={[durianTheme.colors.moss]} onRefresh={refresh} refreshing={refreshing} tintColor={durianTheme.colors.moss} />} showsVerticalScrollIndicator={false}>
        <ContextPanel farms={farms} loading={loading} onFarmChange={selectFarm} onRefresh={refresh} onSeasonChange={(seasonId) => setSelection((current) => ({ ...current, seasonId }))} onZoneChange={selectZone} seasons={seasons} selection={selection} warning={warning} zones={zones} />
        {error ? <MessageCard kind="error" message={error} /> : null}
        {notice ? <MessageCard kind="success" message={notice} /> : null}
        <MessageCard kind="warning" message="Public QR lookup chưa có controller/service contract thật. Mobile không tạo QR giả hoặc URL từ internal release id." />
        <View style={styles.summaryRow}>
          <SummaryCard label="Lô thu hoạch" value={String(batches.length)} />
          <SummaryCard label="Release" value={String(releases.length)} />
          <SummaryCard label="Đã phát hành" value={String(releasedCount)} />
          <SummaryCard label="Bị chặn" value={String(blockedCount)} warning />
        </View>
        <SafetyCompliancePanel
          data={safetyData}
          loading={safetyLoading}
          marketCode={complianceMarketCode}
          onAssess={() => void runComplianceAssessment()}
          onMarketChange={setComplianceMarketCode}
          seasonId={selection.seasonId}
          submitting={submitting}
        />
        {loading ? <LoadingCard /> : null}
        {!loading ? (
          <>
            <Section title="Lô thu hoạch" subtitle="Danh sách lấy từ /api/v1/harvest-batches theo farm/khu/season thật." actionLabel="Tạo lô" onAction={openHarvestForm}>
              {batches.length ? batches.map((batch) => <HarvestCard batch={batch} key={batch.id} onCreateRelease={() => openReleaseForm(batch.id)} />) : <EmptyState text={selection.seasonId ? "Season này chưa có lô thu hoạch." : "Chưa có season thật để tải lô thu hoạch."} />}
            </Section>
            <Section title="Export release" subtitle="Release là workflow xuất xưởng/phát hành traceability snapshot, không phải PDF/Excel." actionLabel="Tạo release" onAction={() => openReleaseForm()}>
              {releases.length ? releases.map((release) => <ReleaseCard key={release.id} onOpen={() => void openReleaseDetail(release)} release={release} />) : <EmptyState text={batches.length ? "Chưa có export release cho lô đang chọn." : "Cần lô thu hoạch thật trước khi tạo release."} />}
            </Section>
          </>
        ) : null}
      </ScrollView>
      <HarvestFormModal draft={harvestDraft} onChange={setHarvestDraft} onClose={() => setShowHarvestForm(false)} onSubmit={() => void submitHarvest()} selection={selection} submitting={submitting} visible={showHarvestForm} />
      <ReleaseFormModal batches={batches} draft={releaseDraft} onChange={setReleaseDraft} onClose={() => setShowReleaseForm(false)} onSubmit={() => void submitRelease()} submitting={submitting} visible={showReleaseForm} />
      <ReleaseDetailModal onAction={(release, action, reason) => void runReleaseAction(release, action, reason)} onClose={() => setSelectedRelease(null)} release={selectedRelease} snapshot={traceability} snapshotLoading={snapshotLoading} submitting={submitting} />
    </SafeAreaView>
  );
}

function SafetyCompliancePanel({
  data,
  loading,
  marketCode,
  onAssess,
  onMarketChange,
  seasonId,
  submitting,
}: {
  data: SafetyData;
  loading: boolean;
  marketCode: string;
  onAssess: () => void;
  onMarketChange: (value: string) => void;
  seasonId: string;
  submitting: boolean;
}) {
  const assessment = data.assessment;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionCopy}>
          <Text style={styles.sectionTitle}>An toàn mùa vụ & compliance</Text>
          <Text style={styles.sectionSubtitle}>Đọc chemical history, safe harvest, lab sample và residue standard từ backend. Mobile không tự tính điều kiện an toàn.</Text>
        </View>
        {loading ? <ActivityIndicator color={durianTheme.colors.moss} /> : null}
      </View>
      {!seasonId ? (
        <EmptyState text="Chưa có season thật nên chưa thể tải dữ liệu an toàn." />
      ) : (
        <View style={styles.list}>
          <View style={styles.detailPanel}>
            <Text style={styles.sectionTitleSmall}>Safe harvest</Text>
            <InfoRow label="Season" value={shortFoundationId(seasonId)} />
            <InfoRow label="Ngày thu hoạch an toàn sớm nhất" value={formatDate(data.safeHarvest?.earliestSafeHarvestDate) || "Backend chưa trả ngày"} />
          </View>
          <View style={styles.detailPanel}>
            <Text style={styles.sectionTitleSmall}>Compliance assessment</Text>
            <FormInput label="Thị trường mục tiêu" onChangeText={onMarketChange} value={marketCode} />
            {assessment ? (
              <>
                <InfoRow label="Risk level" value={riskLevelLabels[assessment.riskLevel]} />
                <InfoRow label="Risk score" value={String(assessment.riskScore)} />
                <InfoRow label="Cần lab test" value={assessment.requiresLabTest ? "Có" : "Không"} />
                <InfoRow label="Đủ điều kiện harvest" value={assessment.eligibleForHarvest ? "Có" : "Không"} />
                <InfoRow label="Đủ điều kiện export release" value={assessment.eligibleForExportRelease ? "Có" : "Không"} />
                <InfoRow label="Blocking reasons" value={assessment.blockingReasons.length ? assessment.blockingReasons.join(", ") : "Không có"} />
                <InfoRow label="Warnings" value={assessment.warnings.length ? assessment.warnings.join(", ") : "Không có"} />
              </>
            ) : (
              <EmptyState text="Chưa chạy assessment trong phiên Mobile hiện tại." />
            )}
            <SubmitButton label="Chạy assessment bằng backend" onPress={onAssess} submitting={submitting} />
          </View>
          <View style={styles.detailPanel}>
            <Text style={styles.sectionTitleSmall}>Chemical history</Text>
            {data.chemicalHistory.length ? data.chemicalHistory.map((activity) => (
              <InfoRow
                key={activity.id}
                label={activity.title}
                value={`${formatDateTime(activity.scheduledStartAt)} · ${activity.activityType} · ${activity.status}`}
              />
            )) : <EmptyState text="Backend chưa có hoạt động hóa chất hoàn thành cho season này." />}
          </View>
          <View style={styles.detailPanel}>
            <Text style={styles.sectionTitleSmall}>Lab samples</Text>
            {data.labSamples.length ? data.labSamples.map((sample) => (
              <InfoRow
                key={sample.id}
                label={sample.sampleCode}
                value={`${sample.status} · ${sample.laboratoryName} · ${formatDateTime(sample.sampledAt)}`}
              />
            )) : <EmptyState text="Chưa có lab sample thật cho season này." />}
          </View>
          <View style={styles.detailPanel}>
            <Text style={styles.sectionTitleSmall}>Residue standards</Text>
            {data.residueStandards.length ? data.residueStandards.slice(0, 6).map((standard) => (
              <InfoRow
                key={standard.id}
                label={standard.activeIngredientName}
                value={`${standard.marketCode} · ${standard.mrlValue} ${standard.unit} · ${standard.active ? "active" : "inactive"}`}
              />
            )) : <EmptyState text="Chưa có residue standard thật cho thị trường/commodity đang chọn." />}
          </View>
        </View>
      )}
    </View>
  );
}

function ContextPanel({ farms, loading, onFarmChange, onRefresh, onSeasonChange, onZoneChange, seasons, selection, warning, zones }: { farms: CareFarmOption[]; loading: boolean; onFarmChange: (farmId: string) => void; onRefresh: () => void; onSeasonChange: (seasonId: string) => void; onZoneChange: (zoneId: string) => void; seasons: CareSeasonOption[]; selection: CareFoundationSelection; warning: string | null; zones: CareZoneOption[] }) {
  return <View style={styles.contextCard}><View style={styles.contextTop}><View><Text style={styles.contextTitle}>Ngữ cảnh farm/khu/season</Text><Text style={styles.contextSubtitle}>Nguồn chọn ưu tiên catalog thật, không dùng mock farm/khu/season.</Text></View><Pressable onPress={onRefresh} style={styles.refreshButton}>{loading ? <ActivityIndicator color={durianTheme.colors.moss} /> : <RefreshCw color={durianTheme.colors.moss} size={18} />}</Pressable></View>{warning ? <MessageCard compact kind="warning" message={warning} /> : null}<SelectorRow emptyText="Chưa có farm thật." label="Farm" onChange={onFarmChange} options={farms.map((farm) => ({ id: farm.farmId, label: farm.label }))} selectedId={selection.farmId} /><SelectorRow emptyText="Chưa có khu/plot thật." label="Khu canh tác" onChange={onZoneChange} options={zones.map((zone) => ({ id: zone.zoneId, label: zone.label }))} selectedId={selection.zoneId} /><SelectorRow emptyText="Chưa có season thật." label="Season" onChange={onSeasonChange} options={seasons.map((season) => ({ id: season.seasonId, label: season.label }))} selectedId={selection.seasonId} /></View>;
}

function Section({ actionLabel, children, onAction, subtitle, title }: { actionLabel: string; children: ReactNode; onAction: () => void; subtitle: string; title: string }) {
  return <View style={styles.section}><View style={styles.sectionHeader}><View style={styles.sectionCopy}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionSubtitle}>{subtitle}</Text></View><Pressable onPress={onAction} style={styles.iconButton}><Plus color={durianTheme.colors.white} size={16} /><Text style={styles.iconButtonText}>{actionLabel}</Text></Pressable></View><View style={styles.list}>{children}</View></View>;
}

function HarvestCard({ batch, onCreateRelease }: { batch: HarvestBatch; onCreateRelease: () => void }) {
  return <View style={styles.card}><View style={styles.cardTop}><View style={styles.cardIcon}><PackageCheck color={durianTheme.colors.moss} size={21} /></View><View style={styles.cardCopy}><Text style={styles.cardTitle}>{batch.batchCode}</Text><Text style={styles.cardMeta}>{formatDateTime(batch.harvestedAt)} · {batch.quantity} {batch.quantityUnit}</Text></View><StatusPill label={harvestBatchStatusLabels[batch.status]} tone={getHarvestStatusTone(batch.status)} /></View><InfoRow label="Thị trường dự kiến" value={batch.expectedDestinationMarket} /><InfoRow label="Ngày an toàn" value={formatDate(batch.latestSafeHarvestDate)} /><InfoRow label="Rủi ro hóa chất" value={riskLevelLabels[batch.chemicalRiskLevel]} /><InfoRow label="Farm / Khu / Season" value={`${shortFoundationId(batch.farmId)} / ${shortFoundationId(batch.plotId)} / ${shortFoundationId(batch.cultivationSeasonId)}`} /><Pressable onPress={onCreateRelease} style={styles.secondaryButton}><Send color={durianTheme.colors.moss} size={16} /><Text style={styles.secondaryButtonText}>Tạo release từ lô này</Text></Pressable></View>;
}

function ReleaseCard({ onOpen, release }: { onOpen: () => void; release: ExportRelease }) {
  return <Pressable onPress={onOpen} style={styles.card}><View style={styles.cardTop}><View style={styles.cardIcon}><ShieldCheck color={durianTheme.colors.moss} size={21} /></View><View style={styles.cardCopy}><Text style={styles.cardTitle}>{release.releaseCode}</Text><Text style={styles.cardMeta}>{release.targetMarketCode} · batch {shortFoundationId(release.harvestBatchId)}</Text></View><StatusPill label={exportReleaseStatusLabels[release.status]} tone={getExportStatusTone(release.status)} /></View><InfoRow label="Submitted by" value={release.submittedBy || "Chưa có"} /><InfoRow label="Reviewed by" value={release.reviewedBy || "Chưa có"} /><InfoRow label="Released at" value={formatDateTime(release.releasedAt)} /><View style={styles.linkRow}><Eye color={durianTheme.colors.moss} size={16} /><Text style={styles.linkText}>Xem private traceability snapshot</Text></View></Pressable>;
}

function HarvestFormModal({ draft, onChange, onClose, onSubmit, selection, submitting, visible }: { draft: HarvestDraft; onChange: (draft: HarvestDraft) => void; onClose: () => void; onSubmit: () => void; selection: CareFoundationSelection; submitting: boolean; visible: boolean }) {
  return <Modal animationType="slide" onRequestClose={onClose} visible={visible}><SafeAreaView style={styles.modalSafeArea}><ModalHeader onClose={onClose} title="Tạo lô thu hoạch" /><ScrollView contentContainerStyle={styles.modalContent}>{!selection.farmId || !selection.zoneId || !selection.seasonId ? <EmptyState text="Cần farm/khu/season thật từ backend trước khi tạo lô thu hoạch." /> : <View style={styles.formCard}><InfoRow label="Farm / Khu / Season" value={`${shortFoundationId(selection.farmId)} / ${shortFoundationId(selection.zoneId)} / ${shortFoundationId(selection.seasonId)}`} /><FormInput label="Mã lô" onChangeText={(batchCode) => onChange({ ...draft, batchCode })} value={draft.batchCode} /><FormInput label="Thời điểm thu hoạch (YYYY-MM-DDTHH:mm)" onChangeText={(harvestedAt) => onChange({ ...draft, harvestedAt })} value={draft.harvestedAt} /><FormInput keyboardType="decimal-pad" label="Sản lượng" onChangeText={(quantity) => onChange({ ...draft, quantity })} value={draft.quantity} /><FormInput label="Đơn vị" onChangeText={(quantityUnit) => onChange({ ...draft, quantityUnit })} value={draft.quantityUnit} /><FormInput label="Thị trường dự kiến" onChangeText={(expectedDestinationMarket) => onChange({ ...draft, expectedDestinationMarket })} value={draft.expectedDestinationMarket} /><Pressable onPress={() => onChange({ ...draft, overrideSafeHarvestDate: !draft.overrideSafeHarvestDate })} style={styles.toggleRow}><View style={[styles.checkbox, draft.overrideSafeHarvestDate && styles.checkboxActive]}>{draft.overrideSafeHarvestDate ? <Check color={durianTheme.colors.white} size={14} /> : null}</View><Text style={styles.toggleText}>Override ngày thu hoạch an toàn theo backend</Text></Pressable>{draft.overrideSafeHarvestDate ? <FormInput label="Lý do override" multiline onChangeText={(overrideReason) => onChange({ ...draft, overrideReason })} value={draft.overrideReason} /> : null}<SubmitButton label="Tạo lô trên backend" onPress={onSubmit} submitting={submitting} /></View>}</ScrollView></SafeAreaView></Modal>;
}

function ReleaseFormModal({ batches, draft, onChange, onClose, onSubmit, submitting, visible }: { batches: HarvestBatch[]; draft: ReleaseDraft; onChange: (draft: ReleaseDraft) => void; onClose: () => void; onSubmit: () => void; submitting: boolean; visible: boolean }) {
  return <Modal animationType="slide" onRequestClose={onClose} visible={visible}><SafeAreaView style={styles.modalSafeArea}><ModalHeader onClose={onClose} title="Tạo export release" /><ScrollView contentContainerStyle={styles.modalContent}>{!batches.length ? <EmptyState text="Cần lô thu hoạch thật trước khi tạo export release." /> : <View style={styles.formCard}><SelectorRow emptyText="Chưa có lô." label="Lô thu hoạch" onChange={(harvestBatchId) => onChange({ ...draft, harvestBatchId })} options={batches.map((batch) => ({ id: batch.id, label: batch.batchCode }))} selectedId={draft.harvestBatchId} /><FormInput label="Mã release" onChangeText={(releaseCode) => onChange({ ...draft, releaseCode })} value={draft.releaseCode} /><FormInput label="Thị trường mục tiêu" onChangeText={(targetMarketCode) => onChange({ ...draft, targetMarketCode })} value={draft.targetMarketCode} /><MessageCard compact kind="warning" message="Backend sẽ tự chạy compliance assessment và có thể tạo release ở trạng thái BLOCKED." /><SubmitButton label="Tạo release trên backend" onPress={onSubmit} submitting={submitting} /></View>}</ScrollView></SafeAreaView></Modal>;
}

function ReleaseDetailModal({ onAction, onClose, release, snapshot, snapshotLoading, submitting }: { onAction: (release: ExportRelease, action: ReleaseAction, recallReason?: string) => void; onClose: () => void; release: ExportRelease | null; snapshot: TraceabilityResponse | null; snapshotLoading: boolean; submitting: boolean }) {
  const [recallReason, setRecallReason] = useState("");
  if (!release) return null;
  const actions = releaseActions(release);
  const rows = snapshotSummary(snapshot);
  return <Modal animationType="slide" onRequestClose={onClose} visible><SafeAreaView style={styles.modalSafeArea}><ModalHeader onClose={onClose} title="Traceability snapshot" /><ScrollView contentContainerStyle={styles.modalContent}><View style={styles.detailPanel}><Text style={styles.detailTitle}>{release.releaseCode}</Text><StatusPill label={exportReleaseStatusLabels[release.status]} tone={getExportStatusTone(release.status)} /><InfoRow label="Release ID" value={release.id} /><InfoRow label="Harvest batch ID" value={release.harvestBatchId} /><InfoRow label="Target market" value={release.targetMarketCode} /><InfoRow label="Rejected/recall reason" value={release.rejectionReason || "Không có"} /></View><MessageCard kind="warning" message="Snapshot này là private API, yêu cầu auth và farm scope. Chưa có public QR/token contract nên Mobile không hiển thị QR công khai." />{snapshotLoading ? <LoadingCard /> : <View style={styles.detailPanel}><Text style={styles.sectionTitleSmall}>Snapshot từ backend</Text>{rows.length ? rows.map(([label, value]) => <InfoRow key={label} label={label} value={value} />) : <EmptyState text="Backend chưa trả snapshot hoặc release chưa có snapshot." />}</View>}{actions.some((action) => action.value === "recall") ? <FormInput label="Lý do thu hồi nếu chọn Recall" multiline onChangeText={setRecallReason} value={recallReason} /> : null}{actions.length ? <View style={styles.modalActions}>{actions.map((action) => <Pressable disabled={submitting} key={action.value} onPress={() => onAction(release, action.value, recallReason)} style={[styles.fullButton, action.value === "recall" && styles.dangerButton]}>{submitting ? <ActivityIndicator color={durianTheme.colors.white} /> : <Send color={durianTheme.colors.white} size={16} />}<Text style={styles.fullButtonText}>{action.label}</Text></Pressable>)}</View> : <EmptyState text="Không còn action workflow phù hợp với trạng thái hiện tại." />}</ScrollView></SafeAreaView></Modal>;
}

function SelectorRow({ emptyText, label, onChange, options, selectedId }: { emptyText: string; label: string; onChange: (id: string) => void; options: Array<{ id: string; label: string }>; selectedId: string }) {
  return <View style={styles.selectorBlock}><Text style={styles.selectorLabel}>{label}</Text>{options.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorChips}>{options.map((option) => <Pressable key={option.id} onPress={() => onChange(option.id)} style={[styles.selectorChip, selectedId === option.id && styles.selectorChipActive]}><Text style={[styles.selectorChipText, selectedId === option.id && styles.selectorChipTextActive]}>{option.label}</Text></Pressable>)}</ScrollView> : <Text style={styles.emptyInline}>{emptyText}</Text>}</View>;
}

function ModalHeader({ onClose, title }: { onClose: () => void; title: string }) {
  return <View style={styles.modalHeader}><Pressable onPress={onClose} style={styles.modalIconButton}><X color={durianTheme.colors.ink} size={20} /></Pressable><Text style={styles.modalTitle}>{title}</Text><View style={styles.modalIconButton} /></View>;
}

function SummaryCard({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return <View style={styles.summaryCard}><Text style={[styles.summaryValue, warning && styles.warningText]}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return <Text style={[styles.statusPill, styles[`${tone}Tone`]]}>{label}</Text>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

function FormInput({ keyboardType, label, multiline, onChangeText, value }: { keyboardType?: "decimal-pad"; label: string; multiline?: boolean; onChangeText: (value: string) => void; value: string }) {
  return <View style={styles.inputGroup}><Text style={styles.inputLabel}>{label}</Text><TextInput keyboardType={keyboardType} multiline={multiline} onChangeText={onChangeText} placeholderTextColor={durianTheme.colors.muted} style={[styles.input, multiline && styles.textArea]} value={value} /></View>;
}

function SubmitButton({ label, onPress, submitting }: { label: string; onPress: () => void; submitting: boolean }) {
  return <Pressable disabled={submitting} onPress={onPress} style={[styles.fullButton, submitting && styles.disabled]}>{submitting ? <ActivityIndicator color={durianTheme.colors.white} /> : <Plus color={durianTheme.colors.white} size={18} />}<Text style={styles.fullButtonText}>{label}</Text></Pressable>;
}

function LoadingCard() {
  return <View style={styles.loadingCard}><LoaderCircle color={durianTheme.colors.moss} size={24} /><Text style={styles.loadingText}>Đang tải dữ liệu thật từ backend...</Text></View>;
}

function EmptyState({ text }: { text: string }) {
  return <View style={styles.emptyCard}><ClipboardList color={durianTheme.colors.muted} size={22} /><Text style={styles.emptyText}>{text}</Text></View>;
}

function MessageCard({ compact, kind, message }: { compact?: boolean; kind: "error" | "success" | "warning"; message: string }) {
  return <View style={[styles.messageCard, kind === "error" && styles.errorCard, kind === "success" && styles.successCard, kind === "warning" && styles.warningCard, compact && styles.compactMessage]}><AlertCircle color={kind === "error" ? durianTheme.colors.danger : durianTheme.colors.moss} size={16} /><Text style={styles.messageText}>{message}</Text></View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: durianTheme.colors.canvas, borderColor: durianTheme.colors.mossSoft, borderRadius: durianTheme.radius.md, borderWidth: 1, gap: 10, padding: 13 },
  cardCopy: { flex: 1, gap: 4 },
  cardIcon: { alignItems: "center", backgroundColor: durianTheme.colors.mossSoft, borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
  cardMeta: { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "800", lineHeight: 17 },
  cardTitle: { color: durianTheme.colors.ink, fontSize: 15, fontWeight: "900", lineHeight: 20 },
  cardTop: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  checkbox: { alignItems: "center", borderColor: durianTheme.colors.mossSoft, borderRadius: 6, borderWidth: 1, height: 22, justifyContent: "center", width: 22 },
  checkboxActive: { backgroundColor: durianTheme.colors.moss, borderColor: durianTheme.colors.moss },
  compactMessage: { marginTop: 6, padding: 10 },
  content: { gap: 14, padding: 16, paddingBottom: 42 },
  contextCard: { backgroundColor: durianTheme.colors.surface, borderColor: durianTheme.colors.mossSoft, borderRadius: durianTheme.radius.md, borderWidth: 1, gap: 13, padding: 15 },
  contextSubtitle: { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "700", marginTop: 3 },
  contextTitle: { color: durianTheme.colors.ink, fontSize: 17, fontWeight: "900" },
  contextTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  dangerButton: { backgroundColor: durianTheme.colors.danger },
  dangerTone: { backgroundColor: "#FCEDEA", color: durianTheme.colors.danger },
  detailPanel: { backgroundColor: durianTheme.colors.surface, borderRadius: durianTheme.radius.md, gap: 10, padding: 16 },
  detailTitle: { color: durianTheme.colors.ink, fontSize: 22, fontWeight: "900", lineHeight: 28 },
  disabled: { opacity: 0.45 },
  emptyCard: { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderRadius: durianTheme.radius.md, gap: 8, padding: 18 },
  emptyInline: { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "700" },
  emptyText: { color: durianTheme.colors.muted, fontSize: 13, fontWeight: "800", lineHeight: 19, textAlign: "center" },
  errorCard: { backgroundColor: "#FCEDEA", borderColor: "#F2C4BC" },
  formCard: { backgroundColor: durianTheme.colors.surface, borderRadius: durianTheme.radius.md, gap: 13, padding: 16 },
  fullButton: { alignItems: "center", backgroundColor: durianTheme.colors.moss, borderRadius: 14, flexDirection: "row", gap: 8, justifyContent: "center", paddingVertical: 13 },
  fullButtonText: { color: durianTheme.colors.white, fontSize: 13, fontWeight: "900" },
  iconButton: { alignItems: "center", backgroundColor: durianTheme.colors.moss, borderRadius: 12, flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
  iconButtonText: { color: durianTheme.colors.white, fontSize: 12, fontWeight: "900" },
  infoLabel: { color: durianTheme.colors.muted, flexShrink: 1, fontSize: 11, fontWeight: "900" },
  infoRow: { backgroundColor: durianTheme.colors.surface, borderRadius: 12, gap: 4, padding: 11 },
  infoValue: { color: durianTheme.colors.ink, flexShrink: 1, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  input: { backgroundColor: durianTheme.colors.canvas, borderColor: durianTheme.colors.mossSoft, borderRadius: 13, borderWidth: 1, color: durianTheme.colors.ink, fontSize: 13, fontWeight: "800", paddingHorizontal: 12, paddingVertical: 11 },
  inputGroup: { gap: 6 },
  inputLabel: { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "900" },
  linkRow: { alignItems: "center", flexDirection: "row", gap: 7, marginTop: 2 },
  linkText: { color: durianTheme.colors.moss, fontSize: 12, fontWeight: "900" },
  list: { gap: 10 },
  loadingCard: { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderRadius: durianTheme.radius.md, gap: 8, padding: 18 },
  loadingText: { color: durianTheme.colors.moss, fontSize: 13, fontWeight: "900" },
  messageCard: { alignItems: "flex-start", borderColor: durianTheme.colors.mossSoft, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 9, padding: 12 },
  messageText: { color: durianTheme.colors.ink, flex: 1, fontSize: 12, fontWeight: "800", lineHeight: 18 },
  modalActions: { gap: 10 },
  modalContent: { gap: 14, padding: 16, paddingBottom: 36 },
  modalHeader: { alignItems: "center", borderBottomColor: durianTheme.colors.mossSoft, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 14 },
  modalIconButton: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  modalSafeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  modalTitle: { color: durianTheme.colors.ink, fontSize: 17, fontWeight: "900" },
  neutralTone: { backgroundColor: durianTheme.colors.mossSoft, color: durianTheme.colors.moss },
  refreshButton: { alignItems: "center", backgroundColor: durianTheme.colors.canvas, borderRadius: 12, height: 42, justifyContent: "center", width: 42 },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  secondaryButton: { alignItems: "center", borderColor: durianTheme.colors.mossSoft, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 7, justifyContent: "center", paddingVertical: 11 },
  secondaryButtonText: { color: durianTheme.colors.moss, fontSize: 12, fontWeight: "900" },
  section: { backgroundColor: durianTheme.colors.surface, borderRadius: durianTheme.radius.md, gap: 13, padding: 15 },
  sectionCopy: { flex: 1 },
  sectionHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  sectionSubtitle: { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "700", lineHeight: 17, marginTop: 3 },
  sectionTitle: { color: durianTheme.colors.ink, fontSize: 18, fontWeight: "900" },
  sectionTitleSmall: { color: durianTheme.colors.ink, fontSize: 15, fontWeight: "900", marginTop: 2 },
  selectorBlock: { gap: 7 },
  selectorChip: { backgroundColor: durianTheme.colors.canvas, borderColor: durianTheme.colors.mossSoft, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  selectorChipActive: { backgroundColor: durianTheme.colors.moss, borderColor: durianTheme.colors.moss },
  selectorChipText: { color: durianTheme.colors.moss, fontSize: 12, fontWeight: "900" },
  selectorChipTextActive: { color: durianTheme.colors.white },
  selectorChips: { flexDirection: "row", gap: 8 },
  selectorLabel: { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "900" },
  statusPill: { borderRadius: 999, fontSize: 10, fontWeight: "900", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5 },
  successCard: { backgroundColor: "#EDF8EF", borderColor: "#CDE6D3" },
  successTone: { backgroundColor: "#E7F6EC", color: "#1E7A3D" },
  summaryCard: { backgroundColor: durianTheme.colors.surface, borderRadius: 15, flex: 1, gap: 3, padding: 12 },
  summaryLabel: { color: durianTheme.colors.muted, fontSize: 10, fontWeight: "800" },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryValue: { color: durianTheme.colors.moss, fontSize: 22, fontWeight: "900" },
  textArea: { minHeight: 88, textAlignVertical: "top" },
  toggleRow: { alignItems: "center", flexDirection: "row", gap: 9 },
  toggleText: { color: durianTheme.colors.ink, flex: 1, fontSize: 12, fontWeight: "800", lineHeight: 17 },
  warningCard: { backgroundColor: "#FFF8E2", borderColor: "#F4E3A2" },
  warningText: { color: durianTheme.colors.danger },
  warningTone: { backgroundColor: "#FFF3CD", color: "#936B00" },
});
