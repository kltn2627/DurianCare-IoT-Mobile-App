import { AlertTriangle, BadgeCheck, LogOut, ShieldBan } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

function statusTone(status?: string | null) {
  const normalized = String(status ?? "").toUpperCase();
  if (normalized === "REJECTED") {
    return {
      backgroundColor: "#FFF4F1",
      borderColor: "#F1D5CD",
      icon: ShieldBan,
      title: "Hồ sơ kỹ sư chưa được chấp thuận",
      titleColor: "#8b4935",
      badge: "Từ chối",
      message:
        "Hồ sơ chuyên môn của bạn đã bị từ chối. Vui lòng liên hệ quản trị viên để biết lý do chi tiết hoặc nộp lại hồ sơ đã cập nhật.",
    };
  }

  if (normalized === "PENDING_VERIFICATION" || normalized === "PENDING_APPROVAL") {
    return {
      backgroundColor: "#FFF9E8",
      borderColor: "#F1E1AA",
      icon: BadgeCheck,
      title: "Hồ sơ đang chờ quản trị viên duyệt",
      titleColor: "#6d5b15",
      badge: "Đang chờ",
      message:
        "Tài khoản của bạn đã xác minh email nhưng vẫn cần quản trị viên xem xét hồ sơ chuyên môn trước khi được phép truy cập đầy đủ.",
    };
  }

  return {
    backgroundColor: "#F1F8F3",
    borderColor: "#D9E8DD",
    icon: BadgeCheck,
    title: "Tài khoản đã sẵn sàng",
    titleColor: durianTheme.colors.moss,
    badge: "Hoạt động",
    message:
      "Trạng thái hiện tại của tài khoản đã hợp lệ. Bạn có thể quay lại đăng nhập hoặc làm mới phiên để vào đúng khu vực làm việc.",
  };
}

export function DurianApprovalScreen() {
  const navigation = useDurianSafeNavigation();
  const { getCurrentUser, logout, refreshProfile, refreshSession, session } = useSession();
  const [refreshing, setRefreshing] = useState(false);
  const user = session?.user ?? getCurrentUser();
  const tone = useMemo(() => statusTone(user?.accountStatus), [user?.accountStatus]);
  const Icon = tone.icon;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.allSettled([refreshSession(), refreshProfile()]);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigation.replace("/login");
    }
  }

  if (!session && !user) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.centered}>
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Phiên đăng nhập không hợp lệ</Text>
            <Text style={styles.noticeText}>
              Vui lòng đăng nhập lại để tiếp tục xem trạng thái phê duyệt.
            </Text>
            <Pressable
              onPress={() => navigation.replace("/login")}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>Quay lại đăng nhập</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: tone.backgroundColor,
              borderColor: tone.borderColor,
            },
          ]}
        >
          <View style={[styles.statusIcon, { backgroundColor: tone.backgroundColor }]}>
            <Icon color={tone.titleColor} size={24} />
          </View>
          <View style={styles.statusCopy}>
            <Text style={styles.eyebrow}>TRẠNG THÁI TÀI KHOẢN</Text>
            <Text style={[styles.title, { color: tone.titleColor }]}>{tone.title}</Text>
            <Text style={styles.message}>{tone.message}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{tone.badge}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <InfoRow label="Email" value={user?.email ?? "—"} />
          <InfoRow label="Vai trò" value={user?.role ?? "—"} />
          <InfoRow label="Trạng thái" value={String(user?.accountStatus ?? "—")} />
          <InfoRow label="Hồ sơ" value={user?.fullName ?? user?.name ?? "—"} />
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => void handleRefresh()}
            disabled={refreshing}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            {refreshing ? (
              <ActivityIndicator color={durianTheme.colors.mossDark} />
            ) : (
              <BadgeCheck color={durianTheme.colors.mossDark} size={16} />
            )}
            <Text style={styles.primaryButtonText}>Làm mới trạng thái</Text>
          </Pressable>

          <Pressable
            onPress={() => void handleLogout()}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <LogOut color={durianTheme.colors.moss} size={16} />
            <Text style={styles.secondaryButtonText}>Đăng xuất</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.replace("/login")}
            style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
          >
            <AlertTriangle color={durianTheme.colors.moss} size={16} />
            <Text style={styles.linkButtonText}>Quay lại đăng nhập</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10 },
  badge: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: durianTheme.radius.pill,
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  badgeText: {
    color: durianTheme.colors.mossDark,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  content: { gap: 14, padding: 18, paddingBottom: 42 },
  infoCard: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 24,
    gap: 10,
    padding: 16,
  },
  infoLabel: {
    color: durianTheme.colors.muted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  infoRow: {
    alignItems: "center",
    backgroundColor: "#F8F6EB",
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoValue: {
    color: durianTheme.colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },
  eyebrow: {
    color: durianTheme.colors.durianYellow,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  linkButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 46,
  },
  linkButtonText: {
    color: durianTheme.colors.moss,
    fontSize: 13,
    fontWeight: "800",
  },
  message: {
    color: durianTheme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  noticeCard: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 24,
    gap: 12,
    padding: 20,
  },
  noticeText: {
    color: durianTheme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  noticeTitle: {
    color: durianTheme.colors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
    textAlign: "center",
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  primaryButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50,
  },
  primaryButtonText: {
    color: durianTheme.colors.mossDark,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  safeArea: {
    backgroundColor: durianTheme.colors.canvas,
    flex: 1,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.mossSoft,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50,
  },
  secondaryButtonText: {
    color: durianTheme.colors.moss,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  statusCard: {
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  statusCopy: { gap: 6, width: "100%" },
  statusIcon: {
    alignItems: "center",
    borderRadius: 22,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
});
