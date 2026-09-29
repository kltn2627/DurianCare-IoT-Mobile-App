import { Bell, CalendarClock, CheckCheck, ExternalLink, LoaderCircle, Trash2 } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { friendlyApiMessage } from "@/src/lib/feedback";
import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

import { notificationClient, NotificationApiError } from "./notificationApi";
import { resolveNotificationTarget } from "./notificationTargetResolver";
import type { NotificationItem } from "./types";

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

export function NotificationDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { session } = useSession();
  const navigation = useDurianSafeNavigation();
  const [item, setItem] = useState<NotificationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"read" | "delete" | null>(null);
  const [error, setError] = useState("");

  const id = useMemo(() => {
    const raw = Array.isArray(params.id) ? params.id[0] : params.id;
    return raw?.trim() ?? "";
  }, [params.id]);

  const loadDetail = useCallback(async () => {
    if (!session?.user.id) {
      setError("Thiếu thông tin người dùng đăng nhập.");
      setLoading(false);
      return;
    }

    try {
      const response = await notificationClient.list(session.user.id, {
        page: 0,
        size: 100,
        sortBy: "createdAt",
        sortDirection: "desc",
      });
      const targetId = id || response.notifications[0]?.id || "";
      const found = response.notifications.find((notification) => notification.id === targetId) ?? null;
      setItem(found);
      setError(found ? "" : "Không tìm thấy thông báo.");
    } catch (cause) {
      setError(
        friendlyApiMessage(
          cause instanceof NotificationApiError
            ? { message: cause.message, status: cause.status }
            : null,
          "notification",
          "Không thể tải chi tiết thông báo.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [id, session?.user.id]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const markRead = useCallback(async () => {
    if (!item || !session?.user.id) return;
    setActionLoading("read");
    try {
      await notificationClient.markRead(session.user.id, item.id);
      setItem({ ...item, isRead: true });
    } catch (cause) {
      setError(
        friendlyApiMessage(
          cause instanceof NotificationApiError
            ? { message: cause.message, status: cause.status }
            : null,
          "notification",
          "Không thể đánh dấu đã đọc.",
        ),
      );
    } finally {
      setActionLoading(null);
    }
  }, [item, session?.user.id]);

  const remove = useCallback(() => {
    if (!item || !session?.user.id) return;
    Alert.alert("Xóa thông báo", "Bạn muốn xóa thông báo này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setActionLoading("delete");
            try {
              await notificationClient.delete(session.user.id, item.id);
              setItem(null);
              setError("Thông báo đã được xóa.");
            } catch (cause) {
              setError(
                friendlyApiMessage(
                  cause instanceof NotificationApiError
                    ? { message: cause.message, status: cause.status }
                    : null,
                  "notification",
                  "Không thể xóa thông báo.",
                ),
              );
            } finally {
              setActionLoading(null);
            }
          })();
        },
      },
    ]);
  }, [item, session?.user.id]);

  const openTarget = useCallback(async () => {
    if (!item) return;
    if (session?.user.id && !item.isRead) {
      try {
        await notificationClient.markRead(session.user.id, item.id);
        setItem({ ...item, isRead: true });
      } catch {
        // Opening the target should still work when a read receipt fails.
      }
    }
    const target = resolveNotificationTarget(item);
    navigation.push({
      pathname: target.pathname as never,
      params: target.params,
    });
  }, [item, navigation, session?.user.id]);

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <DurianScreenHeader
          eyebrow="THÔNG BÁO"
          icon={Bell}
          title="Đang tải chi tiết..."
          subtitle="Lấy dữ liệu từ inbox."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <DurianScreenHeader
        eyebrow="THÔNG BÁO"
        icon={Bell}
        title="Chi tiết thông báo"
        subtitle="Xem nội dung, đánh dấu đã đọc hoặc xóa thông báo."
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {item ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrap}>
                <Bell color={durianTheme.colors.durianYellow} size={20} />
              </View>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>{item.type}</Text>
              </View>
              {!item.isRead ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>Chưa đọc</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.message}>{item.message}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <CalendarClock color={durianTheme.colors.moss} size={12} />
                <Text style={styles.metaChipText}>{formatDate(item.createdAt)}</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <Pressable
                disabled={actionLoading !== null}
                onPress={() => void openTarget()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  actionLoading !== null && styles.disabled,
                  pressed && actionLoading === null && styles.pressed,
                ]}
              >
                <ExternalLink color={durianTheme.colors.mossDark} size={16} />
                <Text style={styles.primaryButtonText}>{resolveNotificationTarget(item).label}</Text>
              </Pressable>

              <Pressable
                disabled={actionLoading === "read" || item.isRead}
                onPress={() => void markRead()}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  (actionLoading === "read" || item.isRead) && styles.disabled,
                  pressed && actionLoading !== "read" && !item.isRead && styles.pressed,
                ]}
              >
                {actionLoading === "read" ? (
                  <LoaderCircle color={durianTheme.colors.moss} size={16} />
                ) : (
                  <CheckCheck color={durianTheme.colors.moss} size={16} />
                )}
                <Text style={styles.secondaryButtonText}>Đánh dấu đã đọc</Text>
              </Pressable>

              <Pressable
                disabled={actionLoading === "delete"}
                onPress={() => remove()}
                style={({ pressed }) => [
                  styles.deleteButton,
                  actionLoading === "delete" && styles.disabled,
                  pressed && actionLoading !== "delete" && styles.pressed,
                ]}
              >
                {actionLoading === "delete" ? (
                  <LoaderCircle color={durianTheme.colors.danger} size={16} />
                ) : (
                  <Trash2 color={durianTheme.colors.danger} size={16} />
                )}
                <Text style={styles.deleteButtonText}>Xóa</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" },
  card: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: "#E7E1D1",
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  cardHeader: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  content: { gap: 14, padding: 18, paddingBottom: 44 },
  deleteButton: {
    alignItems: "center",
    backgroundColor: "#FCE8E5",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  deleteButtonText: {
    color: durianTheme.colors.danger,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 18,
  },
  disabled: { opacity: 0.45 },
  errorCard: {
    backgroundColor: "#FFF5F3",
    borderColor: "#F0C2BA",
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  errorText: { color: "#A53C2F", fontSize: 13, lineHeight: 20 },
  headerCopy: { flex: 1, gap: 3 },
  iconWrap: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  message: {
    color: durianTheme.colors.ink,
    fontSize: 14,
    lineHeight: 21,
  },
  meta: {
    color: durianTheme.colors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  metaChip: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: durianTheme.radius.pill,
    flexDirection: "row",
    gap: 5,
    minHeight: 30,
    paddingHorizontal: 10,
  },
  metaChipText: {
    color: durianTheme.colors.moss,
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 14,
  },
  metaRow: { alignItems: "center", flexDirection: "row", justifyContent: "flex-end" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  primaryButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 16,
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
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#F7F9F4",
    borderColor: "#D9E3DB",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: durianTheme.colors.moss,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 18,
  },
  title: {
    color: durianTheme.colors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
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
