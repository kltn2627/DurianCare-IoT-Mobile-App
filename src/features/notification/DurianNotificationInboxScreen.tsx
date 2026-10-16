import {
  Bell,
  Check,
  CheckCheck,
  Clock3,
  Filter,
  Inbox,
  LoaderCircle,
  RefreshCw,
  Trash2,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { friendlyApiMessage } from "@/src/lib/feedback";
import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

import { notificationClient, NotificationApiError } from "./notificationApi";
import { resolveNotificationTarget } from "./notificationTargetResolver";
import type {
  NotificationItem,
  NotificationPageResponse,
  NotificationSortBy,
  NotificationSortDirection,
} from "./types";

type ViewMode = "ALL" | "UNREAD";

const SORT_OPTIONS: Array<{
  label: string;
  sortBy: NotificationSortBy;
  sortDirection: NotificationSortDirection;
}> = [
  { label: "Mới nhất", sortBy: "createdAt", sortDirection: "desc" },
  { label: "Cũ nhất", sortBy: "createdAt", sortDirection: "asc" },
  { label: "Tiêu đề A-Z", sortBy: "title", sortDirection: "asc" },
  { label: "Tiêu đề Z-A", sortBy: "title", sortDirection: "desc" },
];

const PAGE_SIZES = [10, 20, 50, 100];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function notificationTone(type: string) {
  const normalized = type.toUpperCase();
  if (normalized.includes("ALERT")) return styles.alertChip;
  if (normalized.includes("SYSTEM")) return styles.systemChip;
  if (normalized.includes("AI")) return styles.aiChip;
  return styles.neutralChip;
}

function NotificationSkeleton() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeaderRow}>
        <View style={styles.skeletonIcon} />
        <View style={styles.skeletonStack}>
          <View style={[styles.skeletonLine, { width: "68%" }]} />
          <View style={[styles.skeletonLine, { width: "44%" }]} />
        </View>
      </View>
      <View style={[styles.skeletonLine, { width: "100%" }]} />
      <View style={[styles.skeletonLine, { width: "84%" }]} />
      <View style={styles.skeletonActionRow}>
        <View style={styles.skeletonAction} />
        <View style={styles.skeletonActionSmall} />
      </View>
    </View>
  );
}

function NotificationCard({
  item,
  onOpenDetail,
  onMarkRead,
  onDelete,
  busy,
}: {
  item: NotificationItem;
  onOpenDetail: (item: NotificationItem) => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onOpenDetail(item)}
      style={({ pressed }) => [
        styles.card,
        item.isRead ? styles.cardRead : styles.cardUnread,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.cardTopRow}>
        <View style={[styles.cardIcon, item.isRead ? styles.cardIconRead : styles.cardIconUnread]}>
          <Bell color={item.isRead ? durianTheme.colors.muted : durianTheme.colors.durianYellow} size={18} />
        </View>
        <View style={styles.cardCopy}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {!item.isRead ? <View style={styles.unreadBadge}><Text style={styles.unreadText}>Chưa đọc</Text></View> : null}
            <View style={[styles.typeBadge, notificationTone(item.type)]}>
              <Text style={styles.typeText}>{item.type}</Text>
            </View>
          </View>
          <Text style={styles.cardMessage}>{item.message}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock3 color={durianTheme.colors.muted} size={12} />
              <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Inbox color={durianTheme.colors.muted} size={12} />
              <Text style={styles.metaText}>{item.id}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.cardActions}>
        <Pressable
          disabled={busy || item.isRead}
          onPress={() => onMarkRead(item.id)}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, item.isRead && styles.disabled]}
        >
          {busy ? <LoaderCircle color={durianTheme.colors.moss} size={14} /> : <Check color={durianTheme.colors.moss} size={14} />}
          <Text style={styles.secondaryButtonText}>Đánh dấu đã đọc</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() => onDelete(item.id)}
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed, busy && styles.disabled]}
        >
          {busy ? <LoaderCircle color={durianTheme.colors.danger} size={14} /> : <Trash2 color={durianTheme.colors.danger} size={14} />}
          <Text style={styles.deleteButtonText}>Xoá</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function ToggleChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.toggleChip, selected && styles.toggleChipActive, pressed && styles.pressed]}
    >
      <Text style={[styles.toggleChipText, selected && styles.toggleChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Chip({ icon: Icon, label }: { icon: typeof Filter; label: string }) {
  return (
    <View style={styles.chip}>
      <Icon color={durianTheme.colors.moss} size={12} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export function DurianNotificationInboxScreen() {
  const { session } = useSession();
  const navigation = useDurianSafeNavigation();
  const userId = session?.user.id ?? "";
  const [mode, setMode] = useState<ViewMode>("UNREAD");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sortBy, setSortBy] = useState<NotificationSortBy>("createdAt");
  const [sortDirection, setSortDirection] = useState<NotificationSortDirection>("desc");
  const [data, setData] = useState<NotificationPageResponse | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadInbox() {
      try {
        const [pageResult, countResult] = await Promise.all([
          mode === "UNREAD"
            ? notificationClient.unread(userId, { page, size, sortBy, sortDirection })
            : notificationClient.list(userId, { page, size, sortBy, sortDirection }),
          notificationClient.count(userId),
        ]);

        if (!active) return;
        setData(pageResult);
        setUnreadCount(countResult.count);
        setError("");
      } catch (cause) {
        if (!active) return;
        setData(null);
        setError(
          friendlyApiMessage(
            cause instanceof NotificationApiError
              ? { status: cause.status, message: cause.message }
              : null,
            "notification",
            "Không thể tải hộp thư thông báo.",
          ),
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    if (!userId) {
      setLoading(false);
      setError("Thiếu thông tin người dùng đăng nhập.");
      return () => {
        active = false;
      };
    }

    setLoading(true);
    void loadInbox();

    return () => {
      active = false;
    };
  }, [mode, page, size, sortBy, sortDirection, refreshSeed, userId]);

  const totalLabel = useMemo(() => {
    if (!data) return "0 thông báo";
    return `${data.totalElements.toLocaleString("vi-VN")} thông báo`;
  }, [data]);

  const pageWindow = useMemo(() => {
    if (!data) return [];
    if (data.totalPages <= 7) {
      return Array.from({ length: data.totalPages }, (_, index) => index);
    }
    const start = Math.max(0, Math.min(data.page - 2, data.totalPages - 5));
    return Array.from({ length: 5 }, (_, index) => start + index);
  }, [data]);

  const refresh = useCallback(() => {
    setRefreshSeed((current) => current + 1);
  }, []);

  const changeMode = useCallback((nextMode: ViewMode) => {
    setPage(0);
    setMode(nextMode);
  }, []);

  const markRead = useCallback(
    async (id: string) => {
      if (!userId) return;
      setBusyId(id);
      try {
        await notificationClient.markRead(userId, id);
        refresh();
      } catch (cause) {
        setError(
          friendlyApiMessage(
            cause instanceof NotificationApiError
              ? { status: cause.status, message: cause.message }
              : null,
            "notification",
            "Không thể đánh dấu đã đọc.",
          ),
        );
      } finally {
        setBusyId(null);
      }
    },
    [refresh, userId],
  );

  const markAllRead = useCallback(() => {
    if (!userId) return;
    Alert.alert("Đánh dấu tất cả", "Đánh dấu toàn bộ thông báo hiện tại là đã đọc?", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Đồng ý",
        style: "default",
        onPress: async () => {
          setBusyId("__all__");
          try {
            await notificationClient.markAllRead(userId);
            refresh();
          } catch (cause) {
            setError(
              friendlyApiMessage(
                cause instanceof NotificationApiError
                  ? { status: cause.status, message: cause.message }
                  : null,
                "notification",
                "Không thể đánh dấu tất cả đã đọc.",
              ),
            );
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }, [refresh, userId]);

  const removeNotification = useCallback(
    (id: string) => {
      if (!userId) return;
      Alert.alert("Xoá thông báo", "Xoá thông báo này khỏi hộp thư?", [
        { text: "Huỷ", style: "cancel" },
        {
          text: "Xoá",
          style: "destructive",
          onPress: async () => {
            setBusyId(id);
            try {
              await notificationClient.delete(userId, id);
              refresh();
            } catch (cause) {
              setError(
                friendlyApiMessage(
                  cause instanceof NotificationApiError
                    ? { status: cause.status, message: cause.message }
                    : null,
                  "notification",
                  "Không thể xoá thông báo.",
                ),
              );
            } finally {
              setBusyId(null);
            }
          },
        },
      ]);
    },
    [refresh, userId],
  );

  const openNotificationTarget = useCallback(
    (notification: NotificationItem) => {
      if (userId && !notification.isRead) {
        void notificationClient
          .markRead(userId, notification.id)
          .then(refresh)
          .catch(() => undefined);
      }
      const target = resolveNotificationTarget(notification);
      navigation.push({
        pathname: target.pathname as never,
        params: target.params,
      });
    },
    [navigation, refresh, userId],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FlatList
        contentContainerStyle={styles.content}
        data={data?.notifications ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <DurianScreenHeader
              eyebrow="HỘP THƯ"
              icon={Bell}
              title="Thông báo DurianCare"
              subtitle="Theo dõi OTP, cảnh báo hệ thống và nhắc việc theo đúng hợp đồng API."
            />

            <View style={styles.summaryCard}>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryLabel}>Tổng thông báo</Text>
                <Text style={styles.summaryValue}>{totalLabel}</Text>
              </View>
              <View style={[styles.summaryTile, styles.summaryTileAccent]}>
                <Text style={styles.summaryLabelAccent}>Chưa đọc</Text>
                <Text style={styles.summaryValueAccent}>{unreadCount}</Text>
              </View>
            </View>

            <View style={styles.toolbar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarRow}>
                <Chip icon={Filter} label="Chế độ" />
                <ToggleChip label="Chưa đọc" selected={mode === "UNREAD"} onPress={() => changeMode("UNREAD")} />
                <ToggleChip label="Tất cả" selected={mode === "ALL"} onPress={() => changeMode("ALL")} />
              </ScrollView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarRow}>
                <Chip icon={Filter} label="Sắp xếp" />
                {SORT_OPTIONS.map((option) => {
                  const selected =
                    sortBy === option.sortBy && sortDirection === option.sortDirection;
                  return (
                    <ToggleChip
                      key={`${option.sortBy}:${option.sortDirection}`}
                      label={option.label}
                      selected={selected}
                      onPress={() => {
                        setPage(0);
                        setSortBy(option.sortBy);
                        setSortDirection(option.sortDirection);
                      }}
                    />
                  );
                })}
              </ScrollView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarRow}>
                <Chip icon={Filter} label="Kích thước" />
                {PAGE_SIZES.map((value) => (
                  <ToggleChip
                    key={value}
                    label={`${value}/trang`}
                    selected={size === value}
                    onPress={() => {
                      setPage(0);
                      setSize(value);
                    }}
                  />
                ))}
              </ScrollView>

              <View style={styles.actionRow}>
                <Pressable
                  onPress={refresh}
                  style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
                >
                  <RefreshCw color={durianTheme.colors.moss} size={16} />
                  <Text style={styles.refreshButtonText}>Làm mới</Text>
                </Pressable>
                {mode === "UNREAD" ? (
                  <Pressable
                    disabled={busyId === "__all__" || unreadCount === 0}
                    onPress={markAllRead}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      (busyId === "__all__" || unreadCount === 0) && styles.disabled,
                      pressed && busyId !== "__all__" && unreadCount > 0 && styles.pressed,
                    ]}
                  >
                    {busyId === "__all__" ? (
                      <LoaderCircle color={durianTheme.colors.mossDark} size={16} />
                    ) : (
                      <CheckCheck color={durianTheme.colors.mossDark} size={16} />
                    )}
                    <Text style={styles.primaryButtonText}>Đánh dấu tất cả đã đọc</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={styles.listHeading}>
              <Text style={styles.sectionLabel}>Danh sách thông báo</Text>
              <Text style={styles.sectionTitle}>{loading ? "Đang tải..." : totalLabel}</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : loading ? (
            <View style={styles.listGap}>
              {Array.from({ length: 4 }, (_, index) => (
                <NotificationSkeleton key={index} />
              ))}
              <View style={styles.loadingRow}>
                <LoaderCircle color={durianTheme.colors.moss} size={18} />
                <Text style={styles.loadingText}>Đang tải hộp thư...</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Inbox color={durianTheme.colors.mossSoft} size={36} />
              <Text style={styles.emptyTitle}>
                {mode === "UNREAD" ? "Không còn thông báo chưa đọc" : "Chưa có thông báo nào"}
              </Text>
              <Text style={styles.emptyText}>
                Thông báo hệ thống sẽ xuất hiện ở đây khi backend phát sinh OTP, cảnh báo hoặc nhắc việc.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          data && data.totalPages > 0 ? (
            <View style={styles.pagination}>
              <Text style={styles.paginationText}>
                Trang {data.page + 1} / {data.totalPages} • {data.numberOfElements} mục
              </Text>
              <View style={styles.paginationRow}>
                <Pressable
                  disabled={!data.hasPrevious}
                  onPress={() => setPage((current) => Math.max(0, current - 1))}
                  style={({ pressed }) => [
                    styles.pageButton,
                    !data.hasPrevious && styles.disabled,
                    pressed && data.hasPrevious && styles.pressed,
                  ]}
                >
                  <Text style={styles.pageButtonText}>Trước</Text>
                </Pressable>

                {pageWindow.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => setPage(item)}
                    style={({ pressed }) => [
                      styles.pageNumber,
                      item === data.page && styles.pageNumberActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.pageNumberText, item === data.page && styles.pageNumberTextActive]}>
                      {item + 1}
                    </Text>
                  </Pressable>
                ))}

                <Pressable
                  disabled={!data.hasNext}
                  onPress={() => setPage((current) => Math.min(data.totalPages - 1, current + 1))}
                  style={({ pressed }) => [
                    styles.pageButton,
                    !data.hasNext && styles.disabled,
                    pressed && data.hasNext && styles.pressed,
                  ]}
                >
                  <Text style={styles.pageButtonText}>Sau</Text>
                </Pressable>
              </View>
            </View>
          ) : null
        }
        renderItem={useCallback(
          ({ item }: { item: NotificationItem }) => (
            <NotificationCard
              busy={busyId === item.id}
              item={item}
              onOpenDetail={openNotificationTarget}
              onDelete={removeNotification}
              onMarkRead={markRead}
            />
          ),
          [busyId, markRead, openNotificationTarget, removeNotification],
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 4,
  },
  alertChip: { backgroundColor: durianTheme.colors.dangerSoft, borderColor: durianTheme.colors.danger },
  aiChip: { backgroundColor: durianTheme.colors.successSoft, borderColor: durianTheme.colors.border },
  card: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    gap: 14,
    marginHorizontal: 18,
    marginBottom: 12,
    padding: 16,
  },
  cardActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "flex-end",
  },
  cardCopy: { flex: 1, gap: 8 },
  cardIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  cardIconRead: { backgroundColor: "#F1F4F2" },
  cardIconUnread: { backgroundColor: durianTheme.colors.moss },
  cardMessage: {
    color: durianTheme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  cardRead: { backgroundColor: durianTheme.colors.surface, borderColor: durianTheme.colors.border },
  cardTitle: {
    color: durianTheme.colors.ink,
    flexShrink: 1,
    ...durianTheme.typography.bodyStrong,
  },
  cardTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  cardUnread: {
    backgroundColor: durianTheme.colors.surfaceSecondary,
    borderColor: durianTheme.colors.border,
  },
  chip: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: durianTheme.radius.pill,
    flexDirection: "row",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  chipText: {
    color: durianTheme.colors.moss,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 16,
  },
  content: { paddingBottom: 42 },
  deleteButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.dangerSoft,
    borderRadius: durianTheme.radius.sm,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  deleteButtonText: {
    color: durianTheme.colors.danger,
    ...durianTheme.typography.label,
  },
  disabled: { opacity: 0.45 },
  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 34,
  },
  emptyText: {
    color: durianTheme.colors.muted,
    ...durianTheme.typography.body,
    textAlign: "center",
  },
  emptyTitle: {
    color: durianTheme.colors.ink,
    ...durianTheme.typography.section,
    textAlign: "center",
  },
  errorBox: {
    backgroundColor: durianTheme.colors.dangerSoft,
    borderColor: durianTheme.colors.danger,
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    marginHorizontal: 18,
    padding: 16,
  },
  errorText: {
    color: durianTheme.colors.danger,
    fontSize: 13,
    lineHeight: 20,
  },
  header: { gap: 14 },
  listGap: { gap: 12 },
  listHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 18,
    marginTop: 2,
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    paddingVertical: 4,
  },
  loadingText: {
    color: durianTheme.colors.moss,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  metaItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metaText: {
    color: durianTheme.colors.muted,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
  },
  neutralChip: { backgroundColor: "#F1F4F2", borderColor: "#DDE6E0" },
  pageButton: {
    alignItems: "center",
    borderColor: "#D8E2DB",
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    minWidth: 76,
    paddingHorizontal: 14,
  },
  pageButtonText: {
    color: durianTheme.colors.moss,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 18,
  },
  pageNumber: {
    alignItems: "center",
    borderColor: "#D8E2DB",
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    minWidth: 44,
  },
  pageNumberActive: {
    backgroundColor: durianTheme.colors.moss,
    borderColor: durianTheme.colors.moss,
  },
  pageNumberText: {
    color: durianTheme.colors.ink,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 18,
  },
  pageNumberTextActive: {
    color: durianTheme.colors.white,
  },
  pagination: {
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  paginationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  paginationText: {
    color: durianTheme.colors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#D8E2DB",
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    height: 44,
    justifyContent: "center",
    minWidth: 118,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: durianTheme.colors.moss,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 18,
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  primaryButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: durianTheme.radius.md,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: durianTheme.colors.mossDark,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 18,
  },
  refreshButton: {
    alignItems: "center",
    borderColor: "#D8E2DB",
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  refreshButtonText: {
    color: durianTheme.colors.moss,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 18,
  },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  sectionLabel: {
    color: durianTheme.colors.moss,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
    lineHeight: 14,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: durianTheme.colors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 25,
    marginTop: 3,
  },
  skeletonAction: {
    backgroundColor: "#E3E8E4",
    borderRadius: durianTheme.radius.md,
    height: 44,
    width: 132,
  },
  skeletonActionRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  skeletonActionSmall: {
    backgroundColor: "#E3E8E4",
    borderRadius: durianTheme.radius.md,
    height: 44,
    width: 84,
  },
  skeletonCard: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: "#E7E1D1",
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    marginHorizontal: 18,
    marginBottom: 12,
    padding: 16,
  },
  skeletonHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  skeletonIcon: {
    backgroundColor: "#E3E8E4",
    borderRadius: 16,
    height: 52,
    width: 52,
  },
  skeletonLine: {
    backgroundColor: "#E3E8E4",
    borderRadius: 999,
    height: 12,
  },
  skeletonStack: {
    flex: 1,
    gap: 8,
    paddingTop: 4,
  },
  summaryCard: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 18,
  },
  summaryLabel: {
    color: durianTheme.colors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  summaryLabelAccent: {
    color: "#294434",
    fontSize: 11,
    lineHeight: 16,
  },
  summaryTile: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 20,
    flex: 1,
    gap: 4,
    minHeight: 82,
    padding: 16,
  },
  summaryTileAccent: {
    backgroundColor: durianTheme.colors.durianYellow,
  },
  summaryValue: {
    color: durianTheme.colors.ink,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 28,
  },
  summaryValueAccent: {
    color: durianTheme.colors.mossDark,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 28,
  },
  systemChip: { backgroundColor: "#F3F7F2", borderColor: "#DCE4DD" },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  toggleChip: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.canvas,
    borderColor: "#DCE4DD",
    borderRadius: durianTheme.radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 14,
  },
  toggleChipActive: {
    backgroundColor: durianTheme.colors.moss,
    borderColor: durianTheme.colors.moss,
  },
  toggleChipText: {
    color: durianTheme.colors.moss,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 16,
  },
  toggleChipTextActive: {
    color: durianTheme.colors.white,
  },
  toolbar: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 24,
    gap: 12,
    marginHorizontal: 18,
    padding: 16,
  },
  toolbarRow: {
    alignItems: "center",
    gap: 8,
    paddingRight: 18,
  },
  typeBadge: {
    borderRadius: durianTheme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 14,
    textTransform: "uppercase",
  },
  unreadBadge: {
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: durianTheme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  unreadText: {
    color: durianTheme.colors.mossDark,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 14,
  },
});
