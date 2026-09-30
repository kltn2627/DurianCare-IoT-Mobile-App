import {
  AlertCircle,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit3,
  Leaf,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  approveCultivationActivity,
  cancelCultivationActivity,
  completeCultivationActivity,
  createCultivationSeason,
  createCultivationActivity,
  createFarmZone,
  createOwnedFarm,
  createCultivationPlan,
  getCareHistory,
  listAgriculturalInputs,
  listAuthorizedFarms,
  listCultivationActivities,
  listCultivationPlans,
  listCultivationSeasons,
  listOwnedFarms,
  rejectCultivationActivity,
  skipCultivationActivity,
  startCultivationActivity,
  updateCultivationActivity,
} from "@/src/features/cultivation/api/cultivationApi";
import {
  activityStatusLabels,
  activityTypeLabels,
  activityTypes,
  getActivityStatusTone,
  isClosedActivityStatus,
} from "@/src/features/cultivation/api/cultivationLabels";
import {
  formatDate,
  formatDateTime,
  formatTime,
  getActivityEffectiveStatus,
  getDueLabel,
  getWeekDays,
  getWeekRangeLabel,
  instantToLocalInputValue,
  localDateTimeToInstant,
  toActivityDateKey,
  toLocalDateKey,
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
  ActivityStatus,
  ActivityType,
  AgriculturalInput,
  ActivityExecution,
  ActivityInputUsage,
  AuthorizedFarm,
  CareFarmOption,
  CareHistoryResponse,
  CareSeasonOption,
  CareZoneOption,
  CultivationSeason,
  CultivationActivity,
  CultivationPlan,
  FarmCatalog,
} from "@/src/features/cultivation/api/cultivationTypes";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

type ViewKey = "calendar" | "today" | "tasks" | "history" | "more";
type StatusAction = "start" | "complete" | "skip" | "cancel";
type StatusFilter = "ACTIVE" | "ALL" | ActivityStatus;
type RejectDraft = { activity: CultivationActivity; reason: string };

type CareData = {
  activities: CultivationActivity[];
  authorizedFarms: AuthorizedFarm[];
  inputs: AgriculturalInput[];
  ownedFarms: FarmCatalog[];
  plans: CultivationPlan[];
  seasons: CultivationSeason[];
};

type ActivityDraft = {
  activityType: ActivityType;
  description: string;
  planId: string;
  scheduledEndAt: string;
  scheduledStartAt: string;
  selectedInputIds: string[];
  title: string;
};

type PlanDraft = {
  expectedHarvestDate: string;
  name: string;
  startDate: string;
  targetMarketCodes: string;
};

type FarmSetupDraft = {
  crop: string;
  farmName: string;
  seasonName: string;
  startDate: string;
  variety: string;
  zoneName: string;
};

const emptyData: CareData = { activities: [], authorizedFarms: [], inputs: [], ownedFarms: [], plans: [], seasons: [] };
const emptyCareHistory: CareHistoryResponse = { activities: [], executions: [], inputUsages: [] };
const defaultActivityDraft: ActivityDraft = {
  activityType: "IRRIGATION",
  description: "",
  planId: "",
  scheduledEndAt: "",
  scheduledStartAt: "",
  selectedInputIds: [],
  title: "",
};
const defaultPlanDraft: PlanDraft = {
  expectedHarvestDate: "",
  name: "",
  startDate: "",
  targetMarketCodes: "VN",
};
const defaultFarmSetupDraft: FarmSetupDraft = {
  crop: "DURIAN",
  farmName: "",
  seasonName: "",
  startDate: new Date().toISOString().slice(0, 10),
  variety: "",
  zoneName: "",
};

const viewLabels: Record<ViewKey, string> = {
  calendar: "Lịch chăm sóc",
  history: "Nhật ký",
  more: "Khác",
  tasks: "Công việc",
  today: "Hôm nay",
};

function hasPermission(role: string | undefined, permission: "view" | "managePlan" | "execute") {
  if (!role) return false;
  if (role === "ADMIN") return true;
  if (role === "FARMER") return true;
  if (role === "ENGINEER" || role === "EXPERT") return permission !== "managePlan";
  return false;
}

function friendlyError(error: unknown, fallback: string) {
  if (error instanceof AuthApiError && error.status === 403) return "Tài khoản hiện tại chưa có quyền thực hiện thao tác này.";
  return error instanceof Error && error.message ? error.message : fallback;
}

function isActive(activity: CultivationActivity) {
  return !isClosedActivityStatus(activity.status);
}

function sortBySchedule(left: CultivationActivity, right: CultivationActivity) {
  return left.scheduledStartAt.localeCompare(right.scheduledStartAt);
}

function statusActions(activity: CultivationActivity): Array<{ label: string; value: StatusAction }> {
  if (["COMPLETED", "CANCELLED", "SKIPPED", "PENDING_APPROVAL"].includes(activity.status)) return [];
  const actions: Array<{ label: string; value: StatusAction }> = [];
  if (activity.status !== "IN_PROGRESS") actions.push({ label: "Bắt đầu", value: "start" });
  actions.push({ label: "Hoàn thành", value: "complete" });
  actions.push({ label: "Hoãn", value: "skip" });
  actions.push({ label: "Hủy", value: "cancel" });
  return actions;
}

function canReviewActivity(activity: CultivationActivity) {
  return activity.approvalRequired && activity.status === "PENDING_APPROVAL";
}

function inputNames(activity: CultivationActivity, inputs: AgriculturalInput[]) {
  const ids = [...(activity.plannedInputIds ?? []), ...(activity.agriculturalInputIds ?? []), ...(activity.inputIds ?? [])];
  const byId = ids.map((id) => inputs.find((input) => input.id === id)?.productName).filter(Boolean) as string[];
  const byObject = activity.plannedInputs?.map((input) => input.productName).filter(Boolean) ?? [];
  return Array.from(new Set([...byObject, ...byId]));
}

export function DurianCultivationCalendarScreen({ entryPoint = "calendar" }: { entryPoint?: "calendar" | "farm" }) {
  const { session } = useSession();
  const [data, setData] = useState<CareData>(emptyData);
  const [selection, setSelection] = useState<CareFoundationSelection>(emptyFoundationSelection);
  const [view, setView] = useState<ViewKey>(entryPoint === "farm" ? "more" : "calendar");
  const [weekOffset, setWeekOffset] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  const [selectedActivity, setSelectedActivity] = useState<CultivationActivity | null>(null);
  const [activityDraft, setActivityDraft] = useState<ActivityDraft>(defaultActivityDraft);
  const [planDraft, setPlanDraft] = useState<PlanDraft>(defaultPlanDraft);
  const [farmSetupDraft, setFarmSetupDraft] = useState<FarmSetupDraft>(defaultFarmSetupDraft);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showFarmSetupForm, setShowFarmSetupForm] = useState(false);
  const [rejectDraft, setRejectDraft] = useState<RejectDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [careHistory, setCareHistory] = useState<CareHistoryResponse>(emptyCareHistory);
  const [careHistoryError, setCareHistoryError] = useState<string | null>(null);
  const [careHistoryLoading, setCareHistoryLoading] = useState(false);

  const role = session?.user.backendRole;
  const actorId = session?.user.id ?? "";
  const canView = hasPermission(role, "view");
  const canExecute = hasPermission(role, "execute");
  const canManagePlan = hasPermission(role, "managePlan");

  const loadData = useCallback(
    async function loadData(options?: { silent?: boolean }) {
      if (!canView) {
        setLoading(false);
        return;
      }
      if (!options?.silent) setLoading(true);
      setError(null);
      setWarning(null);
      try {
        const [owned, authorized, plans, activities, inputs] = await Promise.allSettled([
          listOwnedFarms(),
          listAuthorizedFarms(),
          listCultivationPlans(),
          listCultivationActivities(),
          listAgriculturalInputs({ status: "VERIFIED" }),
        ]);
        if (plans.status === "rejected") throw plans.reason;
        if (activities.status === "rejected") throw activities.reason;
        const ownedFarms = owned.status === "fulfilled" ? owned.value : [];
        const authorizedFarms = authorized.status === "fulfilled" ? authorized.value : [];
        const farmIds = Array.from(new Set([
          ...ownedFarms.map((farm) => farm.id),
          ...authorizedFarms.map((farm) => farm.farmId),
          ...plans.value.map((plan) => plan.farmId),
          ...activities.value.map((activity) => activity.farmId),
        ].filter(Boolean)));
        const seasonResults = await Promise.allSettled(farmIds.map((farmId) => listCultivationSeasons({ farmId })));
        const next: CareData = {
          activities: activities.value,
          authorizedFarms,
          inputs: inputs.status === "fulfilled" ? inputs.value : [],
          ownedFarms,
          plans: plans.value,
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
        if (inputs.status === "rejected") {
          setWarning((current) => `${current ? `${current} ` : ""}Danh mục vật tư chưa tải được.`);
        }
        setData(next);
        setSelection((current) => reconcileFoundationSelection(next, current));
        setLastSyncedAt(new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date()));
      } catch (caught) {
        setError(friendlyError(caught, "Không thể tải dữ liệu lịch chăm sóc."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canView],
  );

  useEffect(() => {
    setData(emptyData);
    setCareHistory(emptyCareHistory);
    setCareHistoryError(null);
    setSelection(emptyFoundationSelection);
    setSelectedActivity(null);
    setFarmSetupDraft(defaultFarmSetupDraft);
    void loadData();
  }, [loadData, session?.user.id]);

  const loadCareHistory = useCallback(
    async function loadCareHistory(seasonId = selection.seasonId) {
      setCareHistoryError(null);
      if (!seasonId) {
        setCareHistory(emptyCareHistory);
        return;
      }
      setCareHistoryLoading(true);
      try {
        setCareHistory(await getCareHistory(seasonId));
      } catch (caught) {
        setCareHistory(emptyCareHistory);
        setCareHistoryError(friendlyError(caught, "Không thể tải lịch sử chăm sóc."));
      } finally {
        setCareHistoryLoading(false);
      }
    },
    [selection.seasonId],
  );

  useEffect(() => {
    setCareHistory(emptyCareHistory);
    setCareHistoryError(null);
    if (view === "history" && selection.seasonId) void loadCareHistory(selection.seasonId);
  }, [loadCareHistory, selection.seasonId, view]);

  const farms = useMemo(() => buildFoundationFarmOptions(data), [data]);
  const zones = useMemo(() => buildFoundationZoneOptions(data, selection.farmId), [data, selection.farmId]);
  const seasons = useMemo(() => buildFoundationSeasonOptions(data, selection.farmId, selection.zoneId), [data, selection.farmId, selection.zoneId]);
  const plans = useMemo(
    () =>
      data.plans.filter(
        (plan) =>
          (!selection.farmId || plan.farmId === selection.farmId) &&
          (!selection.zoneId || plan.plotId === selection.zoneId) &&
          (!selection.seasonId || plan.cultivationSeasonId === selection.seasonId),
      ),
    [data.plans, selection],
  );
  const activities = useMemo(
    () =>
      data.activities.filter(
        (activity) =>
          (!selection.farmId || activity.farmId === selection.farmId) &&
          (!selection.zoneId || activity.plotId === selection.zoneId) &&
          (!selection.seasonId || activity.cultivationSeasonId === selection.seasonId),
      ),
    [data.activities, selection],
  );

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const weekKeys = useMemo(() => new Set(weekDays.map((day) => day.key)), [weekDays]);
  const todayKey = toLocalDateKey(new Date());
  const todayActivities = activities.filter((activity) => toActivityDateKey(activity.scheduledStartAt) === todayKey).sort(sortBySchedule);
  const weekActivities = activities.filter((activity) => weekKeys.has(toActivityDateKey(activity.scheduledStartAt))).sort(sortBySchedule);
  const activeActivities = activities.filter(isActive);
  const overdueCount = activities.filter((activity) => getActivityEffectiveStatus(activity) === "OVERDUE").length;
  const completedCount = activities.filter((activity) => activity.status === "COMPLETED").length;
  const filteredTasks = activities
    .filter((activity) => {
      const effective = getActivityEffectiveStatus(activity);
      const matchesStatus = statusFilter === "ALL" || (statusFilter === "ACTIVE" ? isActive(activity) : effective === statusFilter);
      const normalized = query.trim().toLocaleLowerCase("vi");
      return matchesStatus && (!normalized || activity.title.toLocaleLowerCase("vi").includes(normalized) || activity.description?.toLocaleLowerCase("vi").includes(normalized));
    })
    .sort(sortBySchedule);

  function refresh() {
    setRefreshing(true);
    void loadData({ silent: true });
    if (view === "history") void loadCareHistory();
  }

  function selectFarm(farmId: string) {
    const nextZones = buildFoundationZoneOptions(data, farmId);
    const zoneId = nextZones[0]?.zoneId ?? "";
    const nextSeasons = buildFoundationSeasonOptions(data, farmId, zoneId);
    setSelection({ farmId, seasonId: nextSeasons[0]?.seasonId ?? "", zoneId });
    setSelectedActivity(null);
  }

  function selectZone(zoneId: string) {
    const nextSeasons = buildFoundationSeasonOptions(data, selection.farmId, zoneId);
    setSelection((current) => ({ ...current, seasonId: nextSeasons[0]?.seasonId ?? "", zoneId }));
    setSelectedActivity(null);
  }

  async function submitFarmSetup() {
    setSubmitting(true);
    setError(null);
    try {
      if (!farms.length) {
        if (!farmSetupDraft.farmName.trim()) {
          Alert.alert("Thiếu tên trang trại", "Vui lòng nhập tên trang trại để tạo farm thật.");
          return;
        }
        const farm = await createOwnedFarm({ name: farmSetupDraft.farmName.trim() });
        setSelection({ farmId: farm.id, seasonId: "", zoneId: "" });
        setNotice("Đã tạo trang trại trên backend. Tiếp tục tạo khu canh tác.");
      } else if (!zones.length) {
        const farmId = selection.farmId || farms[0]?.farmId;
        if (!farmId || !farmSetupDraft.zoneName.trim()) {
          Alert.alert("Thiếu khu canh tác", "Vui lòng chọn farm và nhập tên khu canh tác.");
          return;
        }
        const zone = await createFarmZone(farmId, { name: farmSetupDraft.zoneName.trim() });
        setSelection({ farmId, seasonId: "", zoneId: zone.id });
        setNotice("Đã tạo khu canh tác trên backend. Tiếp tục tạo mùa vụ.");
      } else {
        const farmId = selection.farmId || farms[0]?.farmId;
        const zoneId = selection.zoneId || zones[0]?.zoneId;
        if (!farmId || !zoneId || !farmSetupDraft.seasonName.trim() || !farmSetupDraft.startDate.trim()) {
          Alert.alert("Thiếu mùa vụ", "Vui lòng chọn farm/khu, nhập tên mùa vụ và ngày bắt đầu.");
          return;
        }
        const season = await createCultivationSeason({
          createdBy: actorId,
          crop: farmSetupDraft.crop.trim() || "DURIAN",
          farmId,
          name: farmSetupDraft.seasonName.trim(),
          plotId: zoneId,
          startDate: farmSetupDraft.startDate.trim(),
          variety: farmSetupDraft.variety.trim() || null,
        });
        setSelection({ farmId, seasonId: season.id, zoneId });
        setNotice("Đã tạo mùa vụ trên backend. Calendar, Harvest và Compliance có thể dùng ngữ cảnh này.");
        setShowFarmSetupForm(false);
      }
      setFarmSetupDraft(defaultFarmSetupDraft);
      await loadData({ silent: true });
    } catch (caught) {
      setError(friendlyError(caught, "Không thể thiết lập farm/khu/season."));
    } finally {
      setSubmitting(false);
    }
  }

  function openCreateActivity() {
    setActivityDraft({ ...defaultActivityDraft, planId: plans[0]?.id ?? "" });
    setShowActivityForm(true);
  }

  async function submitCreateActivity() {
    const plan = plans.find((item) => item.id === activityDraft.planId);
    const scheduledStartAt = localDateTimeToInstant(activityDraft.scheduledStartAt);
    const scheduledEndAt = localDateTimeToInstant(activityDraft.scheduledEndAt);
    if (!plan || !scheduledStartAt || !activityDraft.title.trim()) {
      Alert.alert("Chưa đủ thông tin", "Vui lòng chọn kế hoạch, nhập tên công việc và thời gian bắt đầu.");
      return;
    }
    setSubmitting(true);
    try {
      await createCultivationActivity({
        activityType: activityDraft.activityType,
        agriculturalInputIds: activityDraft.selectedInputIds,
        approvalRequired: activityDraft.activityType === "CHEMICAL_TREATMENT",
        approvalUserId: activityDraft.activityType === "CHEMICAL_TREATMENT" ? actorId : undefined,
        assignedUserIds: actorId ? [actorId] : [],
        cultivationPlanId: plan.id,
        cultivationSeasonId: plan.cultivationSeasonId,
        description: activityDraft.description.trim() || null,
        farmId: plan.farmId,
        plotId: plan.plotId,
        priority: "NORMAL",
        scheduledEndAt: scheduledEndAt ?? null,
        scheduledStartAt,
        targetPestOrDisease: activityDraft.activityType === "CHEMICAL_TREATMENT" ? activityDraft.title.trim() : undefined,
        title: activityDraft.title.trim(),
      });
      setShowActivityForm(false);
      setNotice("Đã tạo công việc chăm sóc trên backend.");
      await loadData({ silent: true });
    } catch (caught) {
      setError(friendlyError(caught, "Không thể tạo công việc."));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCreatePlan() {
    if (!selection.farmId || !selection.zoneId || !selection.seasonId || !planDraft.name.trim() || !planDraft.startDate) {
      Alert.alert("Chưa đủ ngữ cảnh", "Cần farm, khu, season thật và tên kế hoạch/ngày bắt đầu.");
      return;
    }
    setSubmitting(true);
    try {
      await createCultivationPlan({
        createdBy: actorId,
        cultivationSeasonId: selection.seasonId,
        expectedHarvestDate: planDraft.expectedHarvestDate || null,
        farmId: selection.farmId,
        name: planDraft.name.trim(),
        plotId: selection.zoneId,
        startDate: planDraft.startDate,
        targetMarketCodes: planDraft.targetMarketCodes.split(",").map((item) => item.trim()).filter(Boolean),
      });
      setShowPlanForm(false);
      setPlanDraft(defaultPlanDraft);
      setNotice("Đã tạo kế hoạch mùa vụ trên backend.");
      await loadData({ silent: true });
    } catch (caught) {
      setError(friendlyError(caught, "Không thể tạo kế hoạch."));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitUpdateActivity(activity: CultivationActivity, draft: ActivityDraft) {
    const scheduledStartAt = localDateTimeToInstant(draft.scheduledStartAt);
    const scheduledEndAt = localDateTimeToInstant(draft.scheduledEndAt);
    if (!scheduledStartAt || !draft.title.trim()) {
      Alert.alert("Chưa đủ thông tin", "Tên công việc và thời gian bắt đầu là bắt buộc.");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await updateCultivationActivity(activity.id, {
        assignedUserIds: activity.assignedUserIds,
        description: draft.description.trim() || null,
        priority: activity.priority ?? "NORMAL",
        scheduledEndAt: scheduledEndAt ?? null,
        scheduledStartAt,
        title: draft.title.trim(),
      });
      setSelectedActivity(updated);
      setNotice("Đã cập nhật công việc trên backend.");
      await loadData({ silent: true });
    } catch (caught) {
      setError(friendlyError(caught, "Không thể cập nhật công việc."));
    } finally {
      setSubmitting(false);
    }
  }

  async function changeStatus(activity: CultivationActivity, action: StatusAction) {
    setSubmitting(true);
    try {
      if (action === "start") await startCultivationActivity(activity.id);
      if (action === "skip") await skipCultivationActivity(activity.id);
      if (action === "cancel") await cancelCultivationActivity(activity.id);
      if (action === "complete") {
        const now = new Date().toISOString();
        await completeCultivationActivity(activity.id, {
          actualArea: 0,
          actualTreeCount: 0,
          completedAt: now,
          evidenceFiles: [],
          executedBy: actorId,
          inputUsages: [],
          startedAt: now,
          weatherSnapshot: {},
        });
      }
      setSelectedActivity(null);
      setNotice("Đã cập nhật trạng thái công việc.");
      await loadData({ silent: true });
    } catch (caught) {
      setError(friendlyError(caught, "Không thể cập nhật trạng thái."));
    } finally {
      setSubmitting(false);
    }
  }

  async function approveActivity(activity: CultivationActivity) {
    if (!canReviewActivity(activity)) {
      setWarning("Chỉ công việc đang chờ phê duyệt mới được duyệt trên Mobile.");
      return;
    }
    setSubmitting(true);
    try {
      const approved = await approveCultivationActivity(activity.id, { userId: actorId });
      setSelectedActivity((current) => (current?.id === approved.id ? approved : current));
      setNotice("Đã phê duyệt công việc.");
      await loadData({ silent: true });
    } catch (caught) {
      setError(friendlyError(caught, "Không thể phê duyệt công việc."));
    } finally {
      setSubmitting(false);
    }
  }

  function openRejectActivity(activity: CultivationActivity) {
    if (!canReviewActivity(activity)) {
      setWarning("Chỉ công việc đang chờ phê duyệt mới được từ chối trên Mobile.");
      return;
    }
    setRejectDraft({ activity, reason: "" });
  }

  async function submitRejectActivity() {
    const draft = rejectDraft;
    const reason = draft?.reason.trim() ?? "";
    if (!draft || !reason) {
      setWarning("Vui lòng nhập lý do từ chối.");
      return;
    }
    setSubmitting(true);
    try {
      const rejected = await rejectCultivationActivity(draft.activity.id, { reason, userId: actorId });
      setRejectDraft(null);
      setSelectedActivity((current) => (current?.id === rejected.id ? rejected : current));
      setNotice("Đã từ chối công việc.");
      await loadData({ silent: true });
    } catch (caught) {
      setError(friendlyError(caught, "Không thể từ chối công việc."));
    } finally {
      setSubmitting(false);
    }
  }

  if (!canView) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <DurianScreenHeader eyebrow="LỊCH CHĂM SÓC" icon={CalendarCheck} title="Không có quyền truy cập" subtitle="Tài khoản hiện tại chưa có quyền xem module canh tác." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <DurianScreenHeader eyebrow={entryPoint === "farm" ? "KHU CANH TÁC" : "LỊCH CHĂM SÓC"} icon={CalendarCheck} title={entryPoint === "farm" ? "Farm, khu & mùa vụ" : "Lịch chăm sóc vụ mùa"} subtitle={lastSyncedAt ? `Đồng bộ lúc ${lastSyncedAt}` : "Dữ liệu lấy từ backend thật"} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl colors={[durianTheme.colors.moss]} onRefresh={refresh} refreshing={refreshing} tintColor={durianTheme.colors.moss} />} showsVerticalScrollIndicator={false}>
        <ContextPanel canSetup={canManagePlan} farms={farms} loading={loading} onFarmChange={selectFarm} onOpenSetup={() => setShowFarmSetupForm(true)} onRefresh={refresh} onSeasonChange={(seasonId) => setSelection((current) => ({ ...current, seasonId }))} onZoneChange={selectZone} seasons={seasons} selection={selection} warning={warning} zones={zones} />
        {error ? <MessageCard kind="error" message={error} /> : null}
        {notice ? <MessageCard kind="success" message={notice} /> : null}
        <View style={styles.summaryRow}>
          <SummaryCard label="Hôm nay" value={String(todayActivities.length)} />
          <SummaryCard label="Đang mở" value={String(activeActivities.length)} />
          <SummaryCard label="Quá hạn" value={String(overdueCount)} warning />
          <SummaryCard label="Xong" value={String(completedCount)} />
        </View>
        <View style={styles.tabRow}>
          {(Object.keys(viewLabels) as ViewKey[]).map((key) => (
            <Pressable key={key} onPress={() => setView(key)} style={[styles.tabButton, view === key && styles.tabButtonActive]}>
              <Text style={[styles.tabText, view === key && styles.tabTextActive]}>{viewLabels[key]}</Text>
            </Pressable>
          ))}
        </View>
        {loading ? <LoadingCard /> : null}
        {!loading && view === "calendar" ? <CalendarView activities={weekActivities} canExecute={canExecute} onApprove={approveActivity} onCreate={openCreateActivity} onOpenDetail={setSelectedActivity} onReject={openRejectActivity} onStatusChange={changeStatus} onWeekChange={setWeekOffset} weekDays={weekDays} weekOffset={weekOffset} zones={zones} /> : null}
        {!loading && view === "today" ? <TaskList activities={todayActivities} canExecute={canExecute} emptyText={selection.seasonId ? "Hôm nay chưa có công việc chăm sóc." : "Chưa có mùa vụ để hiển thị công việc hôm nay."} inputs={data.inputs} onApprove={approveActivity} onOpenDetail={setSelectedActivity} onReject={openRejectActivity} onStatusChange={changeStatus} zones={zones} /> : null}
        {!loading && view === "tasks" ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>Công việc chăm sóc</Text>
                <Text style={styles.sectionSubtitle}>Lọc theo trạng thái và tìm theo tên công việc.</Text>
              </View>
              {canExecute ? <IconButton label="Thêm" onPress={openCreateActivity} /> : null}
            </View>
            <View style={styles.searchBox}>
              <Search color={durianTheme.colors.muted} size={16} />
              <TextInput onChangeText={setQuery} placeholder="Tìm công việc" placeholderTextColor={durianTheme.colors.muted} style={styles.searchInput} value={query} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.statusFilterRow}>
                {(["ACTIVE", "ALL", "SCHEDULED", "IN_PROGRESS", "PENDING_APPROVAL", "OVERDUE", "COMPLETED", "SKIPPED", "CANCELLED"] as StatusFilter[]).map((status) => (
                  <Pressable key={status} onPress={() => setStatusFilter(status)} style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}>
                    <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]}>{status === "ACTIVE" ? "Đang mở" : status === "ALL" ? "Tất cả" : activityStatusLabels[status]}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <TaskList activities={filteredTasks} canExecute={canExecute} emptyText="Không có công việc phù hợp bộ lọc." inputs={data.inputs} onApprove={approveActivity} onOpenDetail={setSelectedActivity} onReject={openRejectActivity} onStatusChange={changeStatus} zones={zones} />
          </View>
        ) : null}
        {!loading && view === "history" ? <CareHistoryView error={careHistoryError} history={careHistory} loading={careHistoryLoading} onRetry={() => void loadCareHistory()} /> : null}
        {!loading && view === "more" ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kế hoạch mùa vụ</Text>
            <Text style={styles.sectionSubtitle}>Season được lấy từ `cultivationSeasonId` của kế hoạch/công việc backend.</Text>
            {canManagePlan ? <Pressable onPress={() => setShowPlanForm(true)} style={styles.fullButton}><Plus color={durianTheme.colors.white} size={18} /><Text style={styles.fullButtonText}>Tạo kế hoạch theo season đang chọn</Text></Pressable> : null}
            {plans.length ? plans.map((plan) => <View key={plan.id} style={styles.planCard}><Text style={styles.planName}>{plan.name}</Text><Text style={styles.planMeta}>{formatDate(plan.startDate)} - {formatDate(plan.expectedHarvestDate)} · {plan.status}</Text><Text style={styles.planMeta}>Thị trường: {plan.targetMarketCodes.join(", ") || "Chưa có"}</Text></View>) : <EmptyState text="Chưa có kế hoạch mùa vụ trong farm/khu/season đang chọn." />}
          </View>
        ) : null}
      </ScrollView>
      <ActivityDetailModal activity={selectedActivity} canExecute={canExecute} inputs={data.inputs} onApprove={approveActivity} onClose={() => setSelectedActivity(null)} onReject={openRejectActivity} onStatusChange={changeStatus} onUpdate={submitUpdateActivity} submitting={submitting} zones={zones} />
      <FarmSetupModal draft={farmSetupDraft} farms={farms} onChange={setFarmSetupDraft} onClose={() => setShowFarmSetupForm(false)} onSubmit={submitFarmSetup} seasons={seasons} submitting={submitting} visible={showFarmSetupForm} zones={zones} />
      <ActivityFormModal draft={activityDraft} inputs={data.inputs} onChange={setActivityDraft} onClose={() => setShowActivityForm(false)} onSubmit={submitCreateActivity} plans={plans} submitting={submitting} visible={showActivityForm} />
      <PlanFormModal draft={planDraft} onChange={setPlanDraft} onClose={() => setShowPlanForm(false)} onSubmit={submitCreatePlan} selection={selection} submitting={submitting} visible={showPlanForm} />
      <RejectActivityModal draft={rejectDraft} onChangeReason={(reason) => setRejectDraft((current) => (current ? { ...current, reason } : current))} onClose={() => setRejectDraft(null)} onSubmit={submitRejectActivity} submitting={submitting} />
    </SafeAreaView>
  );
}

function ContextPanel({ canSetup, farms, loading, onFarmChange, onOpenSetup, onRefresh, onSeasonChange, onZoneChange, seasons, selection, warning, zones }: { canSetup: boolean; farms: CareFarmOption[]; loading: boolean; onFarmChange: (id: string) => void; onOpenSetup: () => void; onRefresh: () => void; onSeasonChange: (id: string) => void; onZoneChange: (id: string) => void; seasons: CareSeasonOption[]; selection: CareFoundationSelection; warning: string | null; zones: CareZoneOption[] }) {
  return (
    <View style={styles.contextCard}>
      <View style={styles.contextTop}><View><Text style={styles.contextTitle}>Ngữ cảnh chăm sóc</Text><Text style={styles.contextSubtitle}>Farm → khu canh tác → season từ API thật.</Text></View><Pressable disabled={loading} onPress={onRefresh} style={styles.refreshButton}>{loading ? <ActivityIndicator color={durianTheme.colors.moss} size="small" /> : <RefreshCw color={durianTheme.colors.moss} size={17} />}</Pressable></View>
      <SelectorRow emptyText="Chưa có farm thật." label="Trang trại" onChange={onFarmChange} options={farms.map((farm) => ({ id: farm.farmId, label: farm.label }))} selectedId={selection.farmId} />
      <SelectorRow disabled={!selection.farmId} emptyText={selection.farmId ? "Farm này chưa có khu canh tác trong dữ liệu thật." : "Chọn farm trước."} label="Khu canh tác" onChange={onZoneChange} options={zones.map((zone) => ({ id: zone.zoneId, label: zone.label }))} selectedId={selection.zoneId} />
      <SelectorRow disabled={!selection.zoneId} emptyText={selection.zoneId ? "Khu này chưa có season trong dữ liệu thật." : "Chọn khu trước."} label="Season" onChange={onSeasonChange} options={seasons.map((season) => ({ id: season.seasonId, label: season.label }))} selectedId={selection.seasonId} />
      {canSetup ? <Pressable onPress={onOpenSetup} style={styles.fullButtonSecondary}><Text style={styles.fullButtonSecondaryText}>Thiết lập farm / khu / season</Text></Pressable> : null}
      {warning ? <MessageCard compact kind="warning" message={warning} /> : null}
    </View>
  );
}

function SelectorRow({ disabled, emptyText, label, onChange, options, selectedId }: { disabled?: boolean; emptyText: string; label: string; onChange: (id: string) => void; options: Array<{ id: string; label: string }>; selectedId: string }) {
  return <View style={styles.selectorBlock}><Text style={styles.selectorLabel}>{label}</Text>{options.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={styles.selectorChips}>{options.map((option) => <Pressable disabled={disabled} key={option.id} onPress={() => onChange(option.id)} style={[styles.selectorChip, selectedId === option.id && styles.selectorChipActive, disabled && styles.disabled]}><Text style={[styles.selectorChipText, selectedId === option.id && styles.selectorChipTextActive]}>{option.label}</Text></Pressable>)}</View></ScrollView> : <Text style={styles.emptyInline}>{emptyText}</Text>}</View>;
}

function CareHistoryView({ error, history, loading, onRetry }: { error: string | null; history: CareHistoryResponse; loading: boolean; onRetry: () => void }) {
  const executionsByActivity = new Map<string, ActivityExecution[]>();
  history.executions.forEach((execution) => {
    const items = executionsByActivity.get(execution.cultivationActivityId) ?? [];
    items.push(execution);
    executionsByActivity.set(execution.cultivationActivityId, items);
  });

  const usageByExecution = new Map<string, ActivityInputUsage[]>();
  history.inputUsages.forEach((usage) => {
    const items = usageByExecution.get(usage.activityExecutionId) ?? [];
    items.push(usage);
    usageByExecution.set(usage.activityExecutionId, items);
  });

  const sortedActivities = [...history.activities].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const hasHistory = sortedActivities.length > 0 || history.executions.length > 0 || history.inputUsages.length > 0;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionCopy}>
          <Text style={styles.sectionTitle}>Lịch sử chăm sóc</Text>
          <Text style={styles.sectionSubtitle}>Dữ liệu đọc trực tiếp từ endpoint care-history của backend theo season đang chọn.</Text>
        </View>
        <IconButton label="Tải lại" onPress={onRetry} />
      </View>
      {loading ? <LoadingCard /> : null}
      {error ? <MessageCard kind="error" message={error} /> : null}
      {!loading && !error && !hasHistory ? <EmptyState text="Chưa có lịch sử chăm sóc cho season này." /> : null}
      {!loading && sortedActivities.map((activity) => {
        const executions = [...(executionsByActivity.get(activity.id) ?? [])].sort((left, right) => right.completedAt.localeCompare(left.completedAt));
        return (
          <View key={activity.id} style={styles.historyCard}>
            <View style={styles.historyTop}>
              <View style={styles.historyIcon}><ClipboardList color={durianTheme.colors.moss} size={18} /></View>
              <View style={styles.historyCopy}>
                <Text style={styles.historyTitle}>{activity.title}</Text>
                <Text style={styles.historyMeta}>{activityTypeLabels[activity.activityType]} · {activityStatusLabels[activity.status]} · {formatDateTime(activity.updatedAt)}</Text>
              </View>
            </View>
            {activity.description ? <Text style={styles.historyBody}>{activity.description}</Text> : null}
            {executions.length ? executions.map((execution) => <ExecutionBlock execution={execution} key={execution.id} usages={usageByExecution.get(execution.id) ?? []} />) : <Text style={styles.emptyInline}>Backend chưa ghi execution cho công việc này.</Text>}
          </View>
        );
      })}
      {!loading && history.executions.filter((execution) => !history.activities.some((activity) => activity.id === execution.cultivationActivityId)).map((execution) => (
        <ExecutionBlock execution={execution} key={execution.id} usages={usageByExecution.get(execution.id) ?? []} />
      ))}
    </View>
  );
}

function ExecutionBlock({ execution, usages }: { execution: ActivityExecution; usages: ActivityInputUsage[] }) {
  return (
    <View style={styles.executionBlock}>
      <InfoRow label="Thực hiện" value={`${formatDateTime(execution.startedAt)} -> ${formatDateTime(execution.completedAt)}`} />
      <InfoRow label="Người thực hiện" value={execution.executedBy || "Chưa có"} />
      {execution.supervisedBy ? <InfoRow label="Giám sát" value={execution.supervisedBy} /> : null}
      {execution.applicationMethod ? <InfoRow label="Phương pháp" value={execution.applicationMethod} /> : null}
      {execution.equipment ? <InfoRow label="Thiết bị" value={execution.equipment} /> : null}
      {execution.resultObservation ? <Text style={styles.historyBody}>Kết quả: {execution.resultObservation}</Text> : null}
      {execution.notes ? <Text style={styles.historyBody}>Ghi chú: {execution.notes}</Text> : null}
      {usages.length ? (
        <View style={styles.usageList}>
          {usages.map((usage) => (
            <View key={usage.id} style={styles.usagePill}>
              <Text style={styles.usageText}>{usage.agriculturalInputSnapshot?.productName ?? usage.agriculturalInputId}</Text>
              <Text style={styles.usageMeta}>{usage.quantityUsed} {usage.quantityUnit}{usage.calculatedSafeHarvestDate ? ` · safe ${formatDate(usage.calculatedSafeHarvestDate)}` : ""}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function CalendarView({ activities, canExecute, onApprove, onCreate, onOpenDetail, onReject, onStatusChange, onWeekChange, weekDays, weekOffset, zones }: { activities: CultivationActivity[]; canExecute: boolean; onApprove: (activity: CultivationActivity) => void; onCreate: () => void; onOpenDetail: (activity: CultivationActivity) => void; onReject: (activity: CultivationActivity) => void; onStatusChange: (activity: CultivationActivity, action: StatusAction) => void; onWeekChange: (updater: (current: number) => number) => void; weekDays: ReturnType<typeof getWeekDays>; weekOffset: number; zones: CareZoneOption[] }) {
  const byDate = new Map<string, CultivationActivity[]>();
  activities.forEach((activity) => {
    const key = toActivityDateKey(activity.scheduledStartAt);
    byDate.set(key, [...(byDate.get(key) ?? []), activity]);
  });
  return <View style={styles.section}><View style={styles.sectionHeader}><View style={styles.sectionCopy}><Text style={styles.sectionTitle}>Lịch chăm sóc trong tuần</Text><Text style={styles.sectionSubtitle}>{getWeekRangeLabel(weekDays)}</Text></View>{canExecute ? <IconButton label="Thêm" onPress={onCreate} /> : null}</View><View style={styles.weekNav}><Pressable onPress={() => onWeekChange((current) => current - 1)} style={styles.weekNavButton}><ChevronLeft color={durianTheme.colors.moss} size={19} /></Pressable><Text style={styles.weekNavText}>{weekOffset === 0 ? "Tuần này" : getWeekRangeLabel(weekDays)}</Text><Pressable onPress={() => onWeekChange((current) => current + 1)} style={styles.weekNavButton}><ChevronRight color={durianTheme.colors.moss} size={19} /></Pressable></View><ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={styles.weekGrid}>{weekDays.map((day) => { const dayActivities = (byDate.get(day.key) ?? []).sort(sortBySchedule); return <View key={day.key} style={[styles.dayColumn, day.isToday && styles.todayColumn]}><Text style={styles.dayName}>{day.weekday}</Text><Text style={styles.dayDate}>{day.dateLabel}</Text><View style={styles.dayTasks}>{dayActivities.length ? dayActivities.map((activity) => <CompactTaskCard activity={activity} key={activity.id} onOpenDetail={onOpenDetail} zones={zones} />) : <Text style={styles.emptyDay}>Không có việc</Text>}</View></View>; })}</View></ScrollView><Text style={styles.sectionTitleSmall}>Tổng hợp công việc trong tuần</Text><TaskList activities={activities} canExecute={canExecute} emptyText="Tuần này chưa có công việc chăm sóc." inputs={[]} onApprove={onApprove} onOpenDetail={onOpenDetail} onReject={onReject} onStatusChange={onStatusChange} zones={zones} /></View>;
}

function TaskList({ activities, canExecute, emptyText, inputs, onApprove, onOpenDetail, onReject, onStatusChange, zones }: { activities: CultivationActivity[]; canExecute: boolean; emptyText: string; inputs: AgriculturalInput[]; onApprove: (activity: CultivationActivity) => void; onOpenDetail: (activity: CultivationActivity) => void; onReject: (activity: CultivationActivity) => void; onStatusChange: (activity: CultivationActivity, action: StatusAction) => void; zones: CareZoneOption[] }) {
  if (!activities.length) return <EmptyState text={emptyText} />;
  return <View style={styles.taskList}>{activities.map((activity) => <TaskCard activity={activity} canExecute={canExecute} inputs={inputs} key={activity.id} onApprove={onApprove} onOpenDetail={onOpenDetail} onReject={onReject} onStatusChange={onStatusChange} zones={zones} />)}</View>;
}

function CompactTaskCard({ activity, onOpenDetail, zones }: { activity: CultivationActivity; onOpenDetail: (activity: CultivationActivity) => void; zones: CareZoneOption[] }) {
  const status = getActivityEffectiveStatus(activity);
  const zoneLabel = zones.find((zone) => zone.zoneId === activity.plotId)?.label ?? `Plot ${shortFoundationId(activity.plotId)}`;
  return <Pressable onPress={() => onOpenDetail(activity)} style={styles.compactTask}><Text style={styles.compactTime}>{formatTime(activity.scheduledStartAt)}</Text><Text numberOfLines={2} style={styles.compactTitle}>{activity.title}</Text><Text style={styles.compactMeta}>{zoneLabel}</Text><Text style={[styles.compactStatus, styles[`${getActivityStatusTone(status)}Tone`]]}>{getDueLabel(activity.scheduledStartAt)}</Text></Pressable>;
}

function TaskCard({ activity, canExecute, inputs, onApprove, onOpenDetail, onReject, onStatusChange, zones }: { activity: CultivationActivity; canExecute: boolean; inputs: AgriculturalInput[]; onApprove: (activity: CultivationActivity) => void; onOpenDetail: (activity: CultivationActivity) => void; onReject: (activity: CultivationActivity) => void; onStatusChange: (activity: CultivationActivity, action: StatusAction) => void; zones: CareZoneOption[] }) {
  const status = getActivityEffectiveStatus(activity);
  const zoneLabel = zones.find((zone) => zone.zoneId === activity.plotId)?.label ?? `Plot ${shortFoundationId(activity.plotId)}`;
  const names = inputNames(activity, inputs);
  const actions = statusActions(activity);
  const reviewable = canReviewActivity(activity);
  return <View style={styles.taskCard}><Pressable onPress={() => onOpenDetail(activity)} style={styles.taskMain}><View style={styles.taskIcon}><Leaf color={durianTheme.colors.moss} size={21} /></View><View style={styles.taskCopy}><View style={styles.taskTitleRow}><Text style={styles.taskTitle}>{activity.title}</Text><StatusPill status={status} /></View><Text style={styles.taskMeta}>{formatDateTime(activity.scheduledStartAt)} · {zoneLabel}</Text><Text style={styles.taskMeta}>{activityTypeLabels[activity.activityType]}</Text>{names.length ? <Text style={styles.taskMeta}>Vật tư: {names.join(", ")}</Text> : null}{activity.description ? <Text numberOfLines={2} style={styles.taskDescription}>{activity.description}</Text> : null}</View></Pressable>{canExecute && reviewable ? <View style={styles.actionRow}><Pressable onPress={() => onApprove(activity)} style={styles.actionButtonPrimary}><Text style={styles.actionButtonPrimaryText}>Phê duyệt</Text></Pressable><Pressable onPress={() => onReject(activity)} style={styles.actionButtonDanger}><Text style={styles.actionButtonDangerText}>Từ chối</Text></Pressable></View> : null}{canExecute && actions.length ? <View style={styles.actionRow}>{actions.map((action) => <Pressable key={action.value} onPress={() => onStatusChange(activity, action.value)} style={styles.actionButton}><Text style={styles.actionButtonText}>{action.label}</Text></Pressable>)}</View> : null}</View>;
}

function ActivityDetailModal({ activity, canExecute, inputs, onApprove, onClose, onReject, onStatusChange, onUpdate, submitting, zones }: { activity: CultivationActivity | null; canExecute: boolean; inputs: AgriculturalInput[]; onApprove: (activity: CultivationActivity) => void; onClose: () => void; onReject: (activity: CultivationActivity) => void; onStatusChange: (activity: CultivationActivity, action: StatusAction) => void; onUpdate: (activity: CultivationActivity, draft: ActivityDraft) => void; submitting: boolean; zones: CareZoneOption[] }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ActivityDraft>(defaultActivityDraft);
  useEffect(() => {
    if (!activity) return;
    setEditing(false);
    setDraft({ activityType: activity.activityType, description: activity.description ?? "", planId: activity.cultivationPlanId, scheduledEndAt: instantToLocalInputValue(activity.scheduledEndAt), scheduledStartAt: instantToLocalInputValue(activity.scheduledStartAt), selectedInputIds: [], title: activity.title });
  }, [activity]);
  if (!activity) return null;
  const status = getActivityEffectiveStatus(activity);
  const zoneLabel = zones.find((zone) => zone.zoneId === activity.plotId)?.label ?? `Plot ${shortFoundationId(activity.plotId)}`;
  const actions = statusActions(activity);
  const names = inputNames(activity, inputs);
  const reviewable = canReviewActivity(activity);
  return <Modal animationType="slide" onRequestClose={onClose} visible><SafeAreaView style={styles.modalSafeArea}><View style={styles.modalHeader}><Pressable onPress={onClose} style={styles.modalIconButton}><X color={durianTheme.colors.ink} size={20} /></Pressable><Text style={styles.modalTitle}>Chi tiết công việc</Text><Pressable onPress={() => setEditing((value) => !value)} style={styles.modalIconButton}><Edit3 color={durianTheme.colors.moss} size={18} /></Pressable></View><ScrollView contentContainerStyle={styles.modalContent}>{editing ? <View style={styles.formCard}><FormInput label="Tên công việc" onChangeText={(title) => setDraft({ ...draft, title })} value={draft.title} /><FormInput label="Mô tả" multiline onChangeText={(description) => setDraft({ ...draft, description })} value={draft.description} /><FormInput label="Bắt đầu (YYYY-MM-DDTHH:mm)" onChangeText={(scheduledStartAt) => setDraft({ ...draft, scheduledStartAt })} value={draft.scheduledStartAt} /><FormInput label="Kết thúc (YYYY-MM-DDTHH:mm)" onChangeText={(scheduledEndAt) => setDraft({ ...draft, scheduledEndAt })} value={draft.scheduledEndAt} /><Pressable disabled={submitting} onPress={() => onUpdate(activity, draft)} style={styles.fullButton}>{submitting ? <ActivityIndicator color={durianTheme.colors.white} /> : <Check color={durianTheme.colors.white} size={18} />}<Text style={styles.fullButtonText}>Lưu cập nhật</Text></Pressable></View> : <View style={styles.detailPanel}><Text style={styles.detailTitle}>{activity.title}</Text><StatusPill status={status} /><InfoRow label="Loại công việc" value={activityTypeLabels[activity.activityType]} /><InfoRow label="Thời gian bắt đầu" value={formatDateTime(activity.scheduledStartAt)} /><InfoRow label="Thời gian kết thúc" value={formatDateTime(activity.scheduledEndAt)} /><InfoRow label="Khu canh tác" value={zoneLabel} /><InfoRow label="Farm ID" value={activity.farmId} /><InfoRow label="Season ID" value={activity.cultivationSeasonId} /><InfoRow label="Plan ID" value={activity.cultivationPlanId} /><InfoRow label="Người được giao" value={activity.assignedUserIds.join(", ") || "Chưa gán"} /><InfoRow label="Phê duyệt" value={activity.approvalRequired ? "Cần phê duyệt" : "Không yêu cầu"} />{activity.approvedAt ? <InfoRow label="Đã duyệt lúc" value={formatDateTime(activity.approvedAt)} /> : null}{activity.approvedBy ? <InfoRow label="Người duyệt/từ chối" value={activity.approvedBy} /> : null}{activity.rejectionReason ? <InfoRow label="Lý do từ chối" value={activity.rejectionReason} /> : null}<InfoRow label="Vật tư" value={names.join(", ") || "Chưa gắn vật tư"} /><InfoRow label="Tạo lúc" value={formatDateTime(activity.createdAt)} /><InfoRow label="Cập nhật lúc" value={formatDateTime(activity.updatedAt)} />{activity.description ? <Text style={styles.detailDescription}>{activity.description}</Text> : null}</View>}{!editing && canExecute && reviewable ? <View style={styles.modalActions}><Pressable disabled={submitting} onPress={() => onApprove(activity)} style={styles.fullButton}>{submitting ? <ActivityIndicator color={durianTheme.colors.white} /> : <Check color={durianTheme.colors.white} size={18} />}<Text style={styles.fullButtonText}>Phê duyệt công việc</Text></Pressable><Pressable disabled={submitting} onPress={() => onReject(activity)} style={styles.fullButtonDanger}><Text style={styles.fullButtonDangerText}>Từ chối công việc</Text></Pressable></View> : null}{!editing && canExecute && actions.length ? <View style={styles.modalActions}>{actions.map((action) => <Pressable disabled={submitting} key={action.value} onPress={() => onStatusChange(activity, action.value)} style={styles.fullButtonSecondary}><Text style={styles.fullButtonSecondaryText}>{action.label}</Text></Pressable>)}</View> : null}</ScrollView></SafeAreaView></Modal>;
}

function RejectActivityModal({ draft, onChangeReason, onClose, onSubmit, submitting }: { draft: RejectDraft | null; onChangeReason: (reason: string) => void; onClose: () => void; onSubmit: () => void; submitting: boolean }) {
  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={Boolean(draft)}><View style={styles.rejectBackdrop}><View style={styles.rejectSheet}><View style={styles.sectionHeader}><View style={styles.sectionCopy}><Text style={styles.sectionTitle}>Từ chối công việc</Text><Text style={styles.sectionSubtitle}>{draft?.activity.title ?? "Công việc đang chờ duyệt"}</Text></View><Pressable disabled={submitting} onPress={onClose} style={styles.modalIconButton}><X color={durianTheme.colors.ink} size={20} /></Pressable></View><FormInput label="Lý do từ chối" multiline onChangeText={onChangeReason} placeholder="Nhập lý do để lưu vào backend" value={draft?.reason ?? ""} /><View style={styles.modalActions}><Pressable disabled={submitting} onPress={onSubmit} style={styles.fullButtonDanger}>{submitting ? <ActivityIndicator color={durianTheme.colors.white} /> : null}<Text style={styles.fullButtonDangerText}>Xác nhận từ chối</Text></Pressable><Pressable disabled={submitting} onPress={onClose} style={styles.fullButtonSecondary}><Text style={styles.fullButtonSecondaryText}>Hủy</Text></Pressable></View></View></View></Modal>;
}

function FarmSetupModal({ draft, farms, onChange, onClose, onSubmit, seasons, submitting, visible, zones }: { draft: FarmSetupDraft; farms: CareFarmOption[]; onChange: (draft: FarmSetupDraft) => void; onClose: () => void; onSubmit: () => void; seasons: CareSeasonOption[]; submitting: boolean; visible: boolean; zones: CareZoneOption[] }) {
  const step = !farms.length ? "farm" : !zones.length ? "zone" : !seasons.length ? "season" : "season";
  const title = step === "farm" ? "Tạo trang trại" : step === "zone" ? "Tạo khu canh tác" : "Tạo mùa vụ";
  const helper = step === "farm" ? "Tạo farm sở hữu bởi tài khoản Farmer hiện tại." : step === "zone" ? "Khu canh tác sẽ được lưu trong farm catalog thật." : "Season sẽ được lưu bằng cultivation season catalog thật.";
  return <Modal animationType="slide" onRequestClose={onClose} visible={visible}><SafeAreaView style={styles.modalSafeArea}><View style={styles.modalHeader}><Pressable onPress={onClose} style={styles.modalIconButton}><X color={durianTheme.colors.ink} size={20} /></Pressable><Text style={styles.modalTitle}>{title}</Text><View style={styles.modalIconButton} /></View><ScrollView contentContainerStyle={styles.modalContent}><View style={styles.formCard}><MessageCard compact kind="warning" message={helper} />{step === "farm" ? <FormInput label="Tên trang trại" onChangeText={(farmName) => onChange({ ...draft, farmName })} placeholder="Trang trại Minh Phát" value={draft.farmName} /> : null}{step === "zone" ? <FormInput label="Tên khu canh tác" onChangeText={(zoneName) => onChange({ ...draft, zoneName })} placeholder="Khu Ri6 A1" value={draft.zoneName} /> : null}{step === "season" ? <><FormInput label="Tên mùa vụ" onChangeText={(seasonName) => onChange({ ...draft, seasonName })} placeholder="Vụ mùa 2026" value={draft.seasonName} /><FormInput label="Ngày bắt đầu (YYYY-MM-DD)" onChangeText={(startDate) => onChange({ ...draft, startDate })} value={draft.startDate} /><FormInput label="Cây trồng" onChangeText={(crop) => onChange({ ...draft, crop })} value={draft.crop} /><FormInput label="Giống" onChangeText={(variety) => onChange({ ...draft, variety })} placeholder="Ri6, Dona..." value={draft.variety} /></> : null}<Pressable disabled={submitting} onPress={onSubmit} style={styles.fullButton}>{submitting ? <ActivityIndicator color={durianTheme.colors.white} /> : <Plus color={durianTheme.colors.white} size={18} />}<Text style={styles.fullButtonText}>{title}</Text></Pressable></View></ScrollView></SafeAreaView></Modal>;
}

function ActivityFormModal({ draft, inputs, onChange, onClose, onSubmit, plans, submitting, visible }: { draft: ActivityDraft; inputs: AgriculturalInput[]; onChange: (draft: ActivityDraft) => void; onClose: () => void; onSubmit: () => void; plans: CultivationPlan[]; submitting: boolean; visible: boolean }) {
  return <Modal animationType="slide" onRequestClose={onClose} visible={visible}><SafeAreaView style={styles.modalSafeArea}><View style={styles.modalHeader}><Pressable onPress={onClose} style={styles.modalIconButton}><X color={durianTheme.colors.ink} size={20} /></Pressable><Text style={styles.modalTitle}>Tạo công việc</Text><View style={styles.modalIconButton} /></View><ScrollView contentContainerStyle={styles.modalContent}>{!plans.length ? <EmptyState text="Chưa có kế hoạch mùa vụ thật trong ngữ cảnh đang chọn, nên chưa thể tạo công việc." /> : <View style={styles.formCard}><SelectorRow emptyText="Chưa có kế hoạch." label="Kế hoạch" onChange={(planId) => onChange({ ...draft, planId })} options={plans.map((plan) => ({ id: plan.id, label: plan.name }))} selectedId={draft.planId} /><SelectorRow emptyText="Không có loại công việc." label="Loại công việc" onChange={(activityType) => onChange({ ...draft, activityType: activityType as ActivityType })} options={activityTypes.map((type) => ({ id: type, label: activityTypeLabels[type] }))} selectedId={draft.activityType} /><FormInput label="Tên công việc" onChangeText={(title) => onChange({ ...draft, title })} value={draft.title} /><FormInput label="Mô tả" multiline onChangeText={(description) => onChange({ ...draft, description })} value={draft.description} /><FormInput label="Bắt đầu (YYYY-MM-DDTHH:mm)" onChangeText={(scheduledStartAt) => onChange({ ...draft, scheduledStartAt })} placeholder="2026-08-12T07:30" value={draft.scheduledStartAt} /><FormInput label="Kết thúc (YYYY-MM-DDTHH:mm)" onChangeText={(scheduledEndAt) => onChange({ ...draft, scheduledEndAt })} placeholder="2026-08-12T09:00" value={draft.scheduledEndAt} />{draft.activityType === "CHEMICAL_TREATMENT" ? <SelectorRow emptyText="Chưa tải được vật tư đã xác minh." label="Vật tư hóa chất" onChange={(inputId) => onChange({ ...draft, selectedInputIds: draft.selectedInputIds.includes(inputId) ? draft.selectedInputIds.filter((id) => id !== inputId) : [...draft.selectedInputIds, inputId] })} options={inputs.map((input) => ({ id: input.id, label: input.productName }))} selectedId={draft.selectedInputIds[0] ?? ""} /> : null}<Pressable disabled={submitting} onPress={onSubmit} style={styles.fullButton}>{submitting ? <ActivityIndicator color={durianTheme.colors.white} /> : <Plus color={durianTheme.colors.white} size={18} />}<Text style={styles.fullButtonText}>Tạo công việc trên backend</Text></Pressable></View>}</ScrollView></SafeAreaView></Modal>;
}

function PlanFormModal({ draft, onChange, onClose, onSubmit, selection, submitting, visible }: { draft: PlanDraft; onChange: (draft: PlanDraft) => void; onClose: () => void; onSubmit: () => void; selection: CareFoundationSelection; submitting: boolean; visible: boolean }) {
  return <Modal animationType="slide" onRequestClose={onClose} visible={visible}><SafeAreaView style={styles.modalSafeArea}><View style={styles.modalHeader}><Pressable onPress={onClose} style={styles.modalIconButton}><X color={durianTheme.colors.ink} size={20} /></Pressable><Text style={styles.modalTitle}>Tạo kế hoạch</Text><View style={styles.modalIconButton} /></View><ScrollView contentContainerStyle={styles.modalContent}>{!selection.farmId || !selection.zoneId || !selection.seasonId ? <EmptyState text="Backend chưa có đủ farm/khu/season thật để tạo kế hoạch từ Mobile." /> : <View style={styles.formCard}><InfoRow label="Farm ID" value={selection.farmId} /><InfoRow label="Khu ID" value={selection.zoneId} /><InfoRow label="Season ID" value={selection.seasonId} /><FormInput label="Tên kế hoạch" onChangeText={(name) => onChange({ ...draft, name })} value={draft.name} /><FormInput label="Ngày bắt đầu (YYYY-MM-DD)" onChangeText={(startDate) => onChange({ ...draft, startDate })} placeholder="2026-08-12" value={draft.startDate} /><FormInput label="Ngày thu hoạch dự kiến" onChangeText={(expectedHarvestDate) => onChange({ ...draft, expectedHarvestDate })} placeholder="2026-12-20" value={draft.expectedHarvestDate} /><FormInput label="Thị trường mục tiêu" onChangeText={(targetMarketCodes) => onChange({ ...draft, targetMarketCodes })} value={draft.targetMarketCodes} /><Pressable disabled={submitting} onPress={onSubmit} style={styles.fullButton}>{submitting ? <ActivityIndicator color={durianTheme.colors.white} /> : <Plus color={durianTheme.colors.white} size={18} />}<Text style={styles.fullButtonText}>Tạo kế hoạch trên backend</Text></Pressable></View>}</ScrollView></SafeAreaView></Modal>;
}

function SummaryCard({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return <View style={styles.summaryCard}><Text style={[styles.summaryValue, warning && styles.warningText]}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

function StatusPill({ status }: { status: ActivityStatus }) {
  return <Text style={[styles.statusPill, styles[`${getActivityStatusTone(status)}Tone`]]}>{activityStatusLabels[status]}</Text>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

function FormInput({ label, multiline, onChangeText, placeholder, value }: { label: string; multiline?: boolean; onChangeText: (value: string) => void; placeholder?: string; value: string }) {
  return <View style={styles.inputGroup}><Text style={styles.inputLabel}>{label}</Text><TextInput multiline={multiline} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={durianTheme.colors.muted} style={[styles.input, multiline && styles.textArea]} value={value} /></View>;
}

function IconButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.iconButton}><Plus color={durianTheme.colors.white} size={16} /><Text style={styles.iconButtonText}>{label}</Text></Pressable>;
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
  actionButton: { borderColor: durianTheme.colors.mossSoft, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  actionButtonDanger: { backgroundColor: durianTheme.colors.dangerSoft, borderRadius: durianTheme.radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  actionButtonDangerText: { color: durianTheme.colors.danger, fontSize: 11, fontWeight: "900" },
  actionButtonPrimary: { backgroundColor: durianTheme.colors.moss, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  actionButtonPrimaryText: { color: durianTheme.colors.white, fontSize: 11, fontWeight: "900" },
  actionButtonText: { color: durianTheme.colors.moss, fontSize: 11, fontWeight: "900" },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  compactMessage: { marginTop: 6, padding: 10 },
  compactMeta: { color: durianTheme.colors.muted, fontSize: 10, fontWeight: "800" },
  compactStatus: { borderRadius: 8, fontSize: 10, fontWeight: "900", marginTop: 7, overflow: "hidden", paddingHorizontal: 7, paddingVertical: 5, textAlign: "center" },
  compactTask: { backgroundColor: durianTheme.colors.canvas, borderColor: durianTheme.colors.mossSoft, borderRadius: 12, borderWidth: 1, gap: 4, padding: 10 },
  compactTime: { color: durianTheme.colors.moss, fontSize: 12, fontWeight: "900" },
  compactTitle: { color: durianTheme.colors.ink, fontSize: 12, fontWeight: "900", lineHeight: 17 },
  content: { gap: durianTheme.spacing.lg, padding: durianTheme.spacing.lg, paddingBottom: 42 },
  contextCard: { backgroundColor: durianTheme.colors.surface, borderColor: durianTheme.colors.mossSoft, borderRadius: durianTheme.radius.md, borderWidth: 1, gap: 13, padding: 15 },
  contextSubtitle: { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "700", marginTop: 3 },
  contextTitle: { color: durianTheme.colors.ink, fontSize: 17, fontWeight: "900" },
  contextTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  dangerTone: { backgroundColor: "#FCEDEA", color: durianTheme.colors.danger },
  dayColumn: { backgroundColor: durianTheme.colors.surface, borderColor: durianTheme.colors.mossSoft, borderRadius: 16, borderWidth: 1, minHeight: 260, padding: 10, width: 154 },
  dayDate: { color: durianTheme.colors.muted, fontSize: 11, fontWeight: "800", textAlign: "center" },
  dayName: { color: durianTheme.colors.ink, fontSize: 13, fontWeight: "900", textAlign: "center", textTransform: "capitalize" },
  dayTasks: { gap: 8, marginTop: 10 },
  detailDescription: { backgroundColor: durianTheme.colors.canvas, borderRadius: 12, color: durianTheme.colors.ink, fontSize: 13, fontWeight: "700", lineHeight: 20, padding: 12 },
  detailPanel: { backgroundColor: durianTheme.colors.surface, borderRadius: durianTheme.radius.md, gap: 10, padding: 16 },
  detailTitle: { color: durianTheme.colors.ink, fontSize: 22, fontWeight: "900", lineHeight: 28 },
  disabled: { opacity: 0.45 },
  emptyCard: { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderRadius: durianTheme.radius.md, gap: 8, padding: 18 },
  emptyDay: { color: durianTheme.colors.muted, fontSize: 11, fontWeight: "700", paddingTop: 38, textAlign: "center" },
  emptyInline: { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "700" },
  emptyText: { color: durianTheme.colors.muted, fontSize: 13, fontWeight: "800", lineHeight: 19, textAlign: "center" },
  errorCard: { backgroundColor: durianTheme.colors.dangerSoft, borderColor: durianTheme.colors.danger },
  filterChip: { backgroundColor: durianTheme.colors.canvas, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  filterChipActive: { backgroundColor: durianTheme.colors.moss },
  filterChipText: { color: durianTheme.colors.moss, fontSize: 11, fontWeight: "900" },
  filterChipTextActive: { color: durianTheme.colors.white },
  formCard: { backgroundColor: durianTheme.colors.surface, borderRadius: durianTheme.radius.md, gap: 13, padding: 16 },
  fullButton: { alignItems: "center", backgroundColor: durianTheme.colors.moss, borderRadius: durianTheme.radius.sm, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: durianTheme.control.minHeight },
  fullButtonDanger: { alignItems: "center", backgroundColor: durianTheme.colors.danger, borderRadius: 14, flexDirection: "row", gap: 8, justifyContent: "center", paddingVertical: 13 },
  fullButtonDangerText: { color: durianTheme.colors.white, fontSize: 13, fontWeight: "900" },
  fullButtonSecondary: { alignItems: "center", borderColor: durianTheme.colors.mossSoft, borderRadius: 14, borderWidth: 1, paddingVertical: 13 },
  fullButtonSecondaryText: { color: durianTheme.colors.moss, fontSize: 13, fontWeight: "900" },
  fullButtonText: { color: durianTheme.colors.white, fontSize: 13, fontWeight: "900" },
  executionBlock: { backgroundColor: durianTheme.colors.canvas, borderRadius: 13, gap: 8, padding: 11 },
  historyBody: { color: durianTheme.colors.ink, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  historyCard: { backgroundColor: durianTheme.colors.canvas, borderColor: durianTheme.colors.mossSoft, borderRadius: durianTheme.radius.md, borderWidth: 1, gap: 10, padding: 13 },
  historyCopy: { flex: 1, gap: 3 },
  historyIcon: { alignItems: "center", backgroundColor: durianTheme.colors.mossSoft, borderRadius: 13, height: 42, justifyContent: "center", width: 42 },
  historyMeta: { color: durianTheme.colors.muted, fontSize: 11, fontWeight: "800", lineHeight: 16 },
  historyTitle: { color: durianTheme.colors.ink, fontSize: 15, fontWeight: "900", lineHeight: 20 },
  historyTop: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  iconButton: { alignItems: "center", backgroundColor: durianTheme.colors.moss, borderRadius: 12, flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
  iconButtonText: { color: durianTheme.colors.white, fontSize: 12, fontWeight: "900" },
  infoLabel: { color: durianTheme.colors.muted, flexShrink: 1, fontSize: 11, fontWeight: "900" },
  infoRow: { backgroundColor: durianTheme.colors.canvas, borderRadius: 12, gap: 4, padding: 11 },
  infoValue: { color: durianTheme.colors.ink, flexShrink: 1, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  input: { backgroundColor: durianTheme.colors.canvas, borderColor: durianTheme.colors.mossSoft, borderRadius: 13, borderWidth: 1, color: durianTheme.colors.ink, fontSize: 13, fontWeight: "800", paddingHorizontal: 12, paddingVertical: 11 },
  inputGroup: { gap: 6 },
  inputLabel: { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "900" },
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
  planCard: { backgroundColor: durianTheme.colors.canvas, borderRadius: 14, gap: 5, padding: 13 },
  planMeta: { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "800" },
  planName: { color: durianTheme.colors.ink, fontSize: 15, fontWeight: "900" },
  refreshButton: { alignItems: "center", backgroundColor: durianTheme.colors.canvas, borderRadius: 12, height: 42, justifyContent: "center", width: 42 },
  rejectBackdrop: { backgroundColor: "rgba(9, 30, 20, 0.32)", flex: 1, justifyContent: "flex-end" },
  rejectSheet: { backgroundColor: durianTheme.colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, gap: 14, padding: 16, paddingBottom: 28 },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  searchBox: { alignItems: "center", backgroundColor: durianTheme.colors.canvas, borderColor: durianTheme.colors.mossSoft, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 8, paddingHorizontal: 12 },
  searchInput: { color: durianTheme.colors.ink, flex: 1, fontSize: 13, fontWeight: "800", paddingVertical: 11 },
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
  statusFilterRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  statusPill: { borderRadius: 999, fontSize: 10, fontWeight: "900", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5 },
  successCard: { backgroundColor: "#EDF8EF", borderColor: "#CDE6D3" },
  successTone: { backgroundColor: "#E7F6EC", color: "#1E7A3D" },
  summaryCard: { backgroundColor: durianTheme.colors.surface, borderRadius: 15, flex: 1, gap: 3, padding: 12 },
  summaryLabel: { color: durianTheme.colors.muted, fontSize: 10, fontWeight: "800" },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryValue: { color: durianTheme.colors.moss, fontSize: 22, fontWeight: "900" },
  tabButton: { backgroundColor: durianTheme.colors.surface, borderColor: durianTheme.colors.mossSoft, borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 9 },
  tabButtonActive: { backgroundColor: durianTheme.colors.moss, borderColor: durianTheme.colors.moss },
  tabRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tabText: { color: durianTheme.colors.moss, fontSize: 12, fontWeight: "900" },
  tabTextActive: { color: durianTheme.colors.white },
  taskCard: { backgroundColor: durianTheme.colors.surface, borderColor: durianTheme.colors.mossSoft, borderRadius: durianTheme.radius.md, borderWidth: 1, gap: 12, padding: 14 },
  taskCopy: { flex: 1, gap: 4 },
  taskDescription: { color: durianTheme.colors.ink, fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 4 },
  taskIcon: { alignItems: "center", backgroundColor: durianTheme.colors.mossSoft, borderRadius: 14, height: 46, justifyContent: "center", width: 46 },
  taskList: { gap: 11 },
  taskMain: { alignItems: "flex-start", flexDirection: "row", gap: 11 },
  taskMeta: { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "800", lineHeight: 17 },
  taskTitle: { color: durianTheme.colors.ink, flex: 1, fontSize: 15, fontWeight: "900", lineHeight: 20 },
  taskTitleRow: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  textArea: { minHeight: 88, textAlignVertical: "top" },
  todayColumn: { backgroundColor: "#EEF7F0", borderColor: durianTheme.colors.moss },
  usageList: { gap: 7 },
  usageMeta: { color: durianTheme.colors.muted, fontSize: 11, fontWeight: "800", lineHeight: 16 },
  usagePill: { backgroundColor: durianTheme.colors.surface, borderRadius: 12, gap: 2, padding: 10 },
  usageText: { color: durianTheme.colors.moss, fontSize: 12, fontWeight: "900", lineHeight: 17 },
  warningCard: { backgroundColor: "#FFF8E2", borderColor: "#F4E3A2" },
  warningText: { color: durianTheme.colors.danger },
  warningTone: { backgroundColor: "#FFF3CD", color: "#936B00" },
  weekGrid: { flexDirection: "row", gap: 10, paddingBottom: 2 },
  weekNav: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  weekNavButton: { alignItems: "center", backgroundColor: durianTheme.colors.canvas, borderRadius: 12, height: 40, justifyContent: "center", width: 40 },
  weekNavText: { color: durianTheme.colors.ink, fontSize: 14, fontWeight: "900" },
});
