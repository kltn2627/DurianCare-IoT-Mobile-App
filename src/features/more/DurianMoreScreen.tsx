import {
  Activity,
  BadgeCheck,
  Bell,
  Camera,
  History,
  ImagePlus,
  KeyRound,
  PencilLine,
  QrCode,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { notificationClient } from "@/src/features/notification/notificationApi";
import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

const moreItems = [
  {
    description: "Chụp ảnh lá bệnh, nhận kết quả chẩn đoán và mở màn hình kết quả chi tiết.",
    href: "/diagnosis",
    icon: Activity,
    title: "Chẩn đoán AI",
  },
  {
    description: "Xem lại toàn bộ lần quét đã lưu trên máy và mở từng kết quả chẩn đoán.",
    href: "/diagnosis-history",
    icon: History,
    title: "Lịch sử chẩn đoán",
  },
  {
    description: "Tra cứu bài viết, bệnh hại và tài liệu vận hành theo bộ lọc từ web.",
    href: "/(main)/search",
    icon: Search,
    title: "Tìm kiếm",
  },
  {
    description: "Xem OTP, cảnh báo hệ thống và nhắc việc với số lượng chưa đọc.",
    href: "/(main)/notifications",
    icon: Bell,
    title: "Thông báo",
  },
  {
    description: "Mở chi tiết thông báo mới nhất hoặc mở thẳng một thông báo theo id.",
    href: "/notification-detail",
    icon: Bell,
    title: "Chi tiết thông báo",
  },
  {
    description: "Trao đổi kinh nghiệm, đăng tình trạng vườn và bình luận với nhà nông khác.",
    href: "/(main)/community",
    icon: Users,
    title: "Cộng đồng",
  },
  {
    description: "Theo dõi cảm biến nhiệt độ, độ ẩm đất và trạng thái trạm tại vườn.",
    href: "/(main)/sensors",
    icon: Activity,
    title: "Thiết bị IoT",
  },
  {
    description: "Xem ảnh chụp từ ESP32-CAM, chụp ngay và xem kết quả chẩn đoán bệnh lá AI.",
    href: "/(main)/camera",
    icon: Camera,
    title: "Camera AI Vision",
  },
  {
    description: "Điểm sẵn sàng xuất khẩu, kiểm tra dư lượng MRL và thời gian cách ly PHI theo từng thị trường.",
    href: "/(main)/export-compliance",
    icon: BadgeCheck,
    title: "Đánh giá Xuất khẩu",
  },
  {
    description: "Quản lý hồ sơ vụ mùa và tạo mã QR định danh nông sản.",
    href: "/(main)/traceability",
    icon: QrCode,
    title: "Truy xuất",
  },
  {
    description: "Cập nhật thông tin cá nhân, ảnh đại diện và trạng thái tài khoản.",
    href: "/(main)/profile",
    icon: UserRound,
    title: "Hồ sơ cá nhân",
  },
  {
    description: "Chỉnh sửa thông tin hồ sơ mà backend đang cho phép cập nhật.",
    href: "/profile-edit",
    icon: PencilLine,
    title: "Chỉnh sửa hồ sơ",
  },
  {
    description: "Quản lý ảnh đại diện bằng camera hoặc thư viện ảnh.",
    href: "/avatar-management",
    icon: ImagePlus,
    title: "Quản lý avatar",
  },
  {
    description: "Màn hình giữ chỗ cho contract đổi mật khẩu khi backend bổ sung.",
    href: "/change-password",
    icon: KeyRound,
    title: "Đổi mật khẩu",
  },
  {
    description: "Trang hồ sơ riêng để vào nhanh từ vai trò Kỹ sư.",
    href: "/engineer-profile",
    icon: ShieldCheck,
    title: "Hồ sơ kỹ sư",
  },
  {
    description: "Màn hình duyệt kỹ sư dành cho tài khoản quản trị.",
    href: "/admin-engineer-approval",
    icon: Users,
    title: "Duyệt kỹ sư",
  },
];

export function DurianMoreScreen() {
  const navigation = useDurianSafeNavigation();
  const { session } = useSession();
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function loadUnreadCount() {
      const userId = session?.user.id;
      if (!userId) {
        setUnreadCount(null);
        return;
      }

      try {
        const response = await notificationClient.count(userId);
        if (active) setUnreadCount(response.count);
      } catch {
        if (active) setUnreadCount(null);
      }
    }

    void loadUnreadCount();
    return () => {
      active = false;
    };
  }, [session?.user.id]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <DurianScreenHeader
        eyebrow="MENU MỞ RỘNG"
        icon={Users}
        title="Tính năng khác"
        subtitle="Các mục ít dùng hơn được gom lại để thanh điều hướng gọn và dễ thao tác."
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => navigation.push("/(main)/profile")}
          style={({ pressed }) => [styles.profileCard, pressed && styles.pressed]}
        >
          <View style={styles.profileAvatarWrap}>
            {session?.user.avatarUrl ? (
              <Image source={{ uri: session.user.avatarUrl }} style={styles.profileAvatarImage} />
            ) : (
              <Text style={styles.profileAvatarInitials}>
                {initialsFromName(session?.user.name)}
              </Text>
            )}
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileTitle}>{session?.user.name}</Text>
            <Text style={styles.profileSubtitle}>{session?.user.email}</Text>
            <View style={styles.profileMetaPill}>
              <UserRound color={durianTheme.colors.moss} size={12} />
              <Text style={styles.profileMetaText}>Mở hồ sơ cá nhân</Text>
            </View>
          </View>
        </Pressable>

        {moreItems.map((item) => {
          const Icon = item.icon;
          return (
            <Pressable
              key={item.href}
              onPress={() => navigation.push(item.href)}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <View style={styles.icon}>
                <Icon color={durianTheme.colors.moss} size={24} />
              </View>
              <View style={styles.copy}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{item.title}</Text>
                  {item.title === "Thông báo" && unreadCount !== null ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unreadCount}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function initialsFromName(name?: string | null) {
  if (!name) return "DC";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "DC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 42 },
  copy: { flex: 1, gap: 4 },
  badge: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: durianTheme.radius.pill,
    minHeight: 22,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  badgeText: {
    color: durianTheme.colors.mossDark,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 14,
  },
  description: { color: durianTheme.colors.muted, fontSize: 12, lineHeight: 18 },
  profileAvatarImage: { height: "100%", width: "100%" },
  profileAvatarInitials: {
    color: durianTheme.colors.mossDark,
    fontSize: 20,
    fontWeight: "900",
  },
  profileAvatarWrap: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 22,
    height: 68,
    justifyContent: "center",
    overflow: "hidden",
    width: 68,
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderRadius: durianTheme.radius.md,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  profileCopy: { flex: 1, gap: 5 },
  profileMetaPill: {
    alignItems: "center",
    backgroundColor: "#EEF7EA",
    borderRadius: durianTheme.radius.pill,
    flexDirection: "row",
    gap: 6,
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  profileMetaText: {
    color: durianTheme.colors.moss,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
  },
  profileSubtitle: { color: durianTheme.colors.muted, fontSize: 12, lineHeight: 18 },
  profileTitle: { color: durianTheme.colors.ink, fontSize: 17, fontWeight: "900" },
  icon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  item: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderRadius: durianTheme.radius.md,
    flexDirection: "row",
    gap: 13,
    padding: 16,
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  title: { color: durianTheme.colors.ink, fontSize: 16, fontWeight: "900" },
});
