import {
  AlertCircle,
  BellRing,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  LogOut,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Stethoscope,
  Users,
  WifiOff,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { chatApi } from "@/src/features/chat/chatApi";
import type { ChatConversation } from "@/src/features/chat/chatTypes";
import {
  listAuthorizedFarms,
  listCultivationActivities,
  listCultivationPlans,
  listOwnedFarms,
} from "@/src/features/cultivation/api/cultivationApi";
import {
  buildFoundationFarmOptions,
  buildFoundationZoneOptions,
  shortFoundationId,
} from "@/src/features/cultivation/api/farmFoundation";
import type {
  ActivityStatus,
  AuthorizedFarm,
  CultivationActivity,
  CultivationPlan,
  FarmCatalog,
} from "@/src/features/cultivation/api/cultivationTypes";
import { loadDiagnosisHistory } from "@/src/features/diagnosis/diagnosisHistoryStore";
import type { DiagnosisHistoryEntry } from "@/src/features/diagnosis/types";
import { notificationClient } from "@/src/features/notification/notificationApi";
import type { NotificationItem } from "@/src/features/notification/types";
import { iotApi } from "@/src/features/iot/iotApi";
import type { IotDevice } from "@/src/features/iot/types";
import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

type DashboardSource = {
  activities: CultivationActivity[];
  authorizedFarms: AuthorizedFarm[];
  chatConversations: ChatConversation[];
  diagnoses: DiagnosisHistoryEntry[];
  iotDevices: IotDevice[];
  notificationCount: number | null;
  notifications: NotificationItem[];
  ownedFarms: FarmCatalog[];
  plans: CultivationPlan[];
};

type SectionKey = keyof DashboardSource;

const CLOSED_ACTIVITY_STATUSES = new Set<ActivityStatus>([
  "COMPLETED",
  "SKIPPED",
  "CANCELLED",
]);

const initialDashboardSource: DashboardSource = {
  activities: [],
  authorizedFarms: [],
  chatConversations: [],
  diagnoses: [],
  iotDevices: [],
  notificationCount: null,
  notifications: [],
  ownedFarms: [],
  plans: [],
};

const initialErrors: Record<SectionKey, string | null> = {
  activities: null,
  authorizedFarms: null,
  chatConversations: null,
  diagnoses: null,
  iotDevices: null,
  notificationCount: null,
  notifications: null,
  ownedFarms: null,
  plans: null,
};

export function DurianOperationsScreen() {
  const navigation = useDurianSafeNavigation();
  const { logout, session } = useSession();
  const [data, setData] = useState<DashboardSource>(initialDashboardSource);
  const [errors, setErrors] = useState<Record<SectionKey, string | null>>(initialErrors);
  const [refreshing, setRefreshing] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const user = session?.user;
  const isOwner = user?.role === "OWNER";
  const backendRole = user?.backendRole ?? "GUEST";
  const chatSupported = backendRole === "FARMER" || backendRole === "ENGINEER";

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    const [
      authorizedFarmsResult,
      ownedFarmsResult,
      plansResult,
      activitiesResult,
      diagnosesResult,
      iotDevicesResult,
      notificationCountResult,
      notificationsResult,
      chatResult,
    ] = await Promise.allSettled([
      listAuthorizedFarms(),
      listOwnedFarms(),
      listCultivationPlans(),
      listCultivationActivities(),
      loadDiagnosisHistory(1, 5),
      iotApi.listDevices(),
      notificationClient.count(user.id),
      notificationClient.list(user.id, { page: 0, size: 3, sortBy: "createdAt", sortDirection: "desc" }),
      chatSupported ? chatApi.listConversations() : Promise.resolve({ conversations: [] }),
    ]);

    setData({
      activities: settledValue(activitiesResult, []),
      authorizedFarms: settledValue(authorizedFarmsResult, []),
      chatConversations: settledValue(chatResult, { conversations: [] }).conversations,
      diagnoses: settledValue(diagnosesResult, []),
      iotDevices: normalizeListResponse(settledValue(iotDevicesResult, { devices: [] }).devices),
      notificationCount:
        notificationCountResult.status === "fulfilled" ? notificationCountResult.value.count : null,
      notifications:
        notificationsResult.status === "fulfilled" ? notificationsResult.value.notifications : [],
      ownedFarms: settledValue(ownedFarmsResult, []),
      plans: settledValue(plansResult, []),
    });
    setErrors({
      activities: settledError(activitiesResult),
      authorizedFarms: settledError(authorizedFarmsResult),
      ownedFarms: settledError(ownedFarmsResult),
      chatConversations: chatSupported ? settledError(chatResult) : null,
      diagnoses: settledError(diagnosesResult),
      iotDevices: settledError(iotDevicesResult),
      notificationCount: settledError(notificationCountResult),
      notifications: settledError(notificationsResult),
      plans: settledError(plansResult),
    });
    setLoadedOnce(true);
    setRefreshing(false);
  }, [chatSupported, user]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function handleLogout() {
    await logout();
  }

  const foundation = useMemo(() => {
    const farms = buildFoundationFarmOptions(data);
    const zoneCount = farms.reduce(
      (total, farm) => total + buildFoundationZoneOptions(data, farm.farmId).length,
      0,
    );
    return { farms, zoneCount };
  }, [data]);

  const activitySummary = useMemo(() => summarizeActivities(data.activities), [data.activities]);
  const activePlanCount = data.plans.filter((plan) => plan.status === "ACTIVE").length;
  const unreadChatCount = data.chatConversations.reduce(
    (total, conversation) => total + Math.max(conversation.unreadCount ?? 0, 0),
    0,
  );
  const latestDiagnosis = data.diagnoses[0];
  const latestNotification = data.notifications[0];
  const primaryFarmLabel =
    foundation.farms[0]?.label ?? (loadedOnce ? "Chưa có dữ liệu vườn" : "Đang tải dữ liệu");

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[durianTheme.colors.moss]}
            onRefresh={loadDashboard}
            refreshing={refreshing}
            tintColor={durianTheme.colors.moss}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{backendRole}</Text>
            </View>
            <View style={styles.heroActions}>
              <Pressable hitSlop={12} onPress={loadDashboard}>
                <RefreshCw color={durianTheme.colors.mist} size={20} />
              </Pressable>
              <Pressable hitSlop={12} onPress={handleLogout}>
                <LogOut color={durianTheme.colors.mist} size={22} />
              </Pressable>
            </View>
          </View>

          <Text style={styles.greeting}>Xin chào, {user?.name}</Text>

          <Text style={styles.heroCopy}>
            {isOwner
              ? `Tổng quan từ dữ liệu thật của ${primaryFarmLabel}: lịch chăm sóc, chẩn đoán, chat và thông báo.`
              : "Tổng quan công việc từ farm được ủy quyền, lịch chăm sóc, trao đổi kỹ thuật và thông báo mới."}
          </Text>

          <View style={styles.connection}>
            <CheckCircle2 color={durianTheme.colors.durianYellow} size={16} />
            <Text style={styles.connectionText}>
              Đồng bộ qua API thật • Kéo xuống để làm mới từng nguồn dữ liệu
            </Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <StatCard
            label={isOwner ? "Vườn/khu có dữ liệu" : "Vườn được ủy quyền"}
            value={String(foundation.farms.length).padStart(2, "0")}
          />
          <StatCard label="Việc chăm sóc mở" value={String(activitySummary.open).padStart(2, "0")} />
          <StatCard label="Quá hạn" value={String(activitySummary.overdue).padStart(2, "0")} warning />
        </View>

        <View style={styles.statRow}>
          <StatCard label="Kế hoạch active" value={String(activePlanCount).padStart(2, "0")} />
          <StatCard label="Chẩn đoán gần đây" value={String(data.diagnoses.length).padStart(2, "0")} />
          <StatCard label="Thông báo chưa đọc" value={formatNullableCount(data.notificationCount)} />
        </View>

        <SectionError
          message={firstError([
            errors.authorizedFarms,
            errors.plans,
            errors.activities,
            errors.diagnoses,
            errors.iotDevices,
            errors.notificationCount,
            errors.notifications,
            errors.chatConversations,
          ])}
        />

        <Text style={styles.sectionTitle}>Ngữ cảnh vườn</Text>
        <SummaryCard
          icon={ShieldCheck}
          title={primaryFarmLabel}
          body={`${foundation.zoneCount} khu/plot từ authorized scope, kế hoạch hoặc hoạt động canh tác. ${data.plans.length} kế hoạch đã được tải.`}
          meta={errors.authorizedFarms ? "Nguồn farm authorization đang lỗi, vẫn hiển thị dữ liệu canh tác nếu có." : "Farm/zone lấy từ API thật."}
        />

        <Text style={styles.sectionTitle}>Công việc ưu tiên</Text>
        {activitySummary.upcoming.length > 0 ? (
          activitySummary.upcoming.map((activity) => (
            <SummaryCard
              body={`${activityLabel(activity.status)} • ${formatDateTime(activity.scheduledStartAt)} • Farm ${shortFoundationId(activity.farmId)}`}
              icon={CalendarDays}
              key={activity.id}
              meta={`Plot ${shortFoundationId(activity.plotId)}`}
              title={activity.title}
            />
          ))
        ) : (
          <SummaryCard
            body={
              errors.activities
                ? "Không thể tải lịch chăm sóc lúc này."
                : "Chưa có công việc mở hoặc quá hạn trong dữ liệu hiện tại."
            }
            icon={CalendarDays}
            title="Lịch chăm sóc"
            meta="Không dùng công việc mẫu."
          />
        )}

        <ActionCard
          description="Mở lịch chăm sóc để tạo, cập nhật trạng thái và ghi nhận công việc bằng API cultivation."
          icon={CalendarDays}
          label="Mở lịch canh tác"
          onPress={() => navigation.push("/(main)/calendar")}
        />

        <Text style={styles.sectionTitle}>Chẩn đoán & cảnh báo</Text>
        <SummaryCard
          body={
            latestDiagnosis
              ? `${latestDiagnosis.diseaseName} • ${latestDiagnosis.confidenceText ?? `${Math.round(latestDiagnosis.confidence * 100)}%`} • ${formatDateTime(latestDiagnosis.createdAt)}`
              : errors.diagnoses
                ? "Không thể tải lịch sử AI Diagnosis lúc này."
                : "Chưa có chẩn đoán gần đây từ backend."
          }
          icon={Stethoscope}
          meta="Nguồn: /api/v1/predict/history"
          title={latestDiagnosis ? "Chẩn đoán AI mới nhất" : "AI Diagnosis"}
        />
        <SummaryCard
          body={
            latestNotification
              ? `${latestNotification.title}: ${latestNotification.message}`
              : errors.notifications
                ? "Không thể tải danh sách thông báo lúc này."
                : "Chưa có thông báo mới."
          }
          icon={BellRing}
          meta={
            data.notificationCount === null
              ? "Số chưa đọc không khả dụng."
              : `${data.notificationCount} thông báo chưa đọc`
          }
          title="Thông báo"
        />

        <Text style={styles.sectionTitle}>Chat & cộng tác</Text>
        <SummaryCard
          body={
            chatSupported
              ? `${data.chatConversations.length} cuộc trò chuyện, ${unreadChatCount} tin chưa đọc từ backend chat.`
              : "Role hiện tại không nằm trong contract Chat farmer/engineer."
          }
          icon={MessageCircle}
          meta={errors.chatConversations ? "Không thể tải chat lúc này." : "Nguồn: /api/chat/conversations"}
          title="Chat kỹ thuật"
        />
        <ActionCard
          description="Trao đổi với nhà vườn/kỹ sư, gửi báo cáo AI và cập nhật phác đồ đã lưu."
          icon={MessageCircle}
          label="Mở Chat"
          onPress={() => navigation.push("/(main)/chat")}
        />
        <ActionCard
          description="Xem feed, bình luận, phản ứng và bài viết cộng đồng bằng API Community."
          icon={Users}
          label="Cộng đồng DurianCare"
          onPress={() => navigation.push("/(main)/community")}
        />

        <Text style={styles.sectionTitle}>Truy cập nhanh</Text>
        <ActionCard
          description="Đọc cẩm nang, danh mục và bài viết đã duyệt từ Knowledge API."
          icon={BookOpen}
          label="Không gian tri thức"
          onPress={() => navigation.push("/(main)/knowledge")}
        />
        <ActionCard
          description={
            isOwner
              ? "Tìm kỹ sư, gửi lời mời, cập nhật phạm vi và thu hồi quyền theo farm-service."
              : "Xem lời mời và farm/khu được ủy quyền từ farm-service."
          }
          icon={Send}
          label="Ủy quyền vườn"
          onPress={() => navigation.push("/(main)/authorization")}
        />

        <Text style={styles.sectionTitle}>IoT telemetry</Text>
        <IotSummary devices={data.iotDevices} error={errors.iotDevices} />
      </ScrollView>
    </SafeAreaView>
  );
}

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function settledError<T>(result: PromiseSettledResult<T>) {
  if (result.status === "fulfilled") return null;
  return result.reason instanceof Error ? result.reason.message : "Không thể tải dữ liệu.";
}

function summarizeActivities(activities: CultivationActivity[]) {
  const todayKey = dateKey(new Date());
  const upcoming = activities
    .filter((activity) => !CLOSED_ACTIVITY_STATUSES.has(activity.status))
    .sort((left, right) => dateTime(left.scheduledStartAt) - dateTime(right.scheduledStartAt))
    .slice(0, 3);
  return {
    open: activities.filter((activity) => !CLOSED_ACTIVITY_STATUSES.has(activity.status)).length,
    overdue: activities.filter((activity) => activity.status === "OVERDUE").length,
    today: activities.filter((activity) => dateKey(activity.scheduledStartAt) === todayKey).length,
    upcoming,
  };
}

function dateTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function dateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có thời gian";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatNullableCount(value: number | null) {
  return value === null ? "--" : String(value).padStart(2, "0");
}

function firstError(messages: Array<string | null>) {
  return messages.find(Boolean) ?? null;
}

function activityLabel(status: ActivityStatus) {
  const labels: Record<ActivityStatus, string> = {
    APPROVED: "Đã duyệt",
    CANCELLED: "Đã hủy",
    COMPLETED: "Hoàn thành",
    DRAFT: "Nháp",
    IN_PROGRESS: "Đang làm",
    OVERDUE: "Quá hạn",
    PENDING_APPROVAL: "Chờ duyệt",
    SCHEDULED: "Đã lên lịch",
    SKIPPED: "Đã hoãn",
  };
  return labels[status] ?? status;
}

function SectionError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.sectionError}>
      <AlertCircle color={durianTheme.colors.warning} size={17} />
      <Text style={styles.sectionErrorText}>
        Một phần dữ liệu chưa tải được: {message}
      </Text>
    </View>
  );
}

function SummaryCard({
  body,
  icon: Icon,
  meta,
  title,
}: {
  body: string;
  icon: typeof BellRing;
  meta: string;
  title: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.actionIcon}>
        <Icon color={durianTheme.colors.moss} size={22} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionLabel}>{title}</Text>
        <Text style={styles.actionDescription}>{body}</Text>
        <Text style={styles.metaText}>{meta}</Text>
      </View>
    </View>
  );
}

function IotSummary({
  devices,
  error,
}: {
  devices?: IotDevice[];
  error: string | null;
}) {
  const safeDevices = normalizeListResponse(devices);
  const device = safeDevices.find((item) => item.latestTelemetry) ?? safeDevices[0];
  const telemetry = device?.latestTelemetry ?? null;
  if (error) {
    return (
      <View style={styles.unavailableCard}>
        <WifiOff color={durianTheme.colors.warning} size={22} />
        <View style={styles.alertCopy}>
          <Text style={styles.unavailableTitle}>Không thể tải IoT</Text>
          <Text style={styles.alertText}>{error}</Text>
        </View>
      </View>
    );
  }
  if (!device) {
    return (
      <View style={styles.unavailableCard}>
        <WifiOff color={durianTheme.colors.muted} size={22} />
        <View style={styles.alertCopy}>
          <Text style={styles.unavailableTitle}>Chưa có device registry</Text>
          <Text style={styles.alertText}>
            API đọc telemetry đã có, nhưng chưa có thiết bị nào được gắn farm/khu trong registry mà tài khoản này được quyền xem.
          </Text>
        </View>
      </View>
    );
  }
  return (
    <SummaryCard
      body={
        telemetry
          ? `Nhiệt độ ${formatTelemetryMetric(telemetry.temperature, "°C")} • Độ ẩm ${formatTelemetryMetric(telemetry.humidity, "%")} • Ánh sáng ${formatTelemetryMetric(telemetry.light, "raw")}`
          : "Thiết bị đã được phân quyền nhưng chưa có telemetry."
      }
      icon={WifiOff}
      meta={`Thiết bị ${device.name} • ${telemetry?.receivedAt ? formatDateTime(telemetry.receivedAt) : "chưa ghi nhận"}`}
      title="Telemetry mới nhất"
    />
  );
}

function formatTelemetryMetric(value: number | null, unit: string) {
  if (value === null) return "--";
  return `${Number.isInteger(value) ? value : value.toFixed(1)} ${unit}`;
}

function normalizeListResponse<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

type ActionCardProps = {
  description: string;
  icon: typeof Send;
  label: string;
  onPress: () => void;
};

function ActionCard({
  description,
  icon: Icon,
  label,
  onPress,
}: ActionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
    >
      <View style={styles.actionIcon}>
        <Icon color={durianTheme.colors.moss} size={22} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
    </Pressable>
  );
}

function StatCard({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, warning && styles.warningValue]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 13,
    padding: 16,
    ...durianTheme.shadow.card,
  },
  actionCopy: { flex: 1, gap: 4 },
  actionDescription: {
    color: durianTheme.colors.muted,
    ...durianTheme.typography.caption,
  },
  actionIcon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surfaceSecondary,
    borderRadius: durianTheme.radius.sm,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  actionLabel: {
    color: durianTheme.colors.ink,
    ...durianTheme.typography.bodyStrong,
  },
  alertCopy: { flex: 1, gap: 3 },
  alertText: { color: durianTheme.colors.muted, ...durianTheme.typography.caption },
  connection: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    marginTop: 6,
  },
  connectionText: {
    color: durianTheme.colors.muted,
    flex: 1,
    ...durianTheme.typography.label,
  },
  content: { gap: durianTheme.spacing.lg, padding: durianTheme.spacing.xl, paddingBottom: 42 },
  greeting: {
    color: durianTheme.colors.ink,
    ...durianTheme.typography.display,
  },
  hero: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.lg,
    borderWidth: 1,
    gap: 9,
    padding: 22,
  },
  heroActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  heroCopy: { color: durianTheme.colors.muted, ...durianTheme.typography.body },
  heroTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaText: {
    color: durianTheme.colors.moss,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 16,
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  roleBadge: {
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: durianTheme.radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  roleBadgeText: {
    color: durianTheme.colors.mossDark,
    ...durianTheme.typography.label,
    letterSpacing: 1,
  },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  sectionError: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.warningSoft,
    borderRadius: durianTheme.radius.md,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  sectionErrorText: {
    color: durianTheme.colors.ink,
    flex: 1,
    ...durianTheme.typography.caption,
  },
  sectionTitle: {
    color: durianTheme.colors.ink,
    ...durianTheme.typography.section,
    marginTop: 7,
  },
  statCard: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    justifyContent: "center",
    minHeight: 100,
    padding: 9,
  },
  statLabel: {
    color: durianTheme.colors.muted,
    ...durianTheme.typography.label,
    textAlign: "center",
  },
  statRow: { flexDirection: "row", gap: durianTheme.spacing.sm },
  statValue: {
    color: durianTheme.colors.moss,
    ...durianTheme.typography.title,
  },
  summaryCard: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 13,
    padding: 16,
    ...durianTheme.shadow.card,
  },
  unavailableCard: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  unavailableTitle: {
    color: durianTheme.colors.ink,
    ...durianTheme.typography.bodyStrong,
  },
  warningValue: { color: durianTheme.colors.danger },
});
