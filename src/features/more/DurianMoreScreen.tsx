import {
  Bell,
  ChevronRight,
  Cpu,
  FileSearch,
  GraduationCap,
  MessageCircleMore,
  MoreHorizontal,
  QrCode,
  ShieldCheck,
  TreePine,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { notificationClient } from "@/src/features/notification/notificationApi";
import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { useSession } from "@/src/session/SessionContext";
import { DurianRemoteImage } from "@/src/components/DurianRemoteImage";
import { durianTheme } from "@/src/theme/durianTheme";

type MoreItem = {
  description: string;
  href: string;
  icon: LucideIcon;
  title: string;
};

type MoreGroup = {
  items: MoreItem[];
  title: string;
};

const productionItems: MoreItem[] = [
  {
    description: "Theo dõi dữ liệu và trạng thái thiết bị tại vườn.",
    href: "/(main)/sensors",
    icon: Cpu,
    title: "Cảm biến IoT",
  },
  {
    description: "Quản lý vụ mùa và truy xuất nguồn gốc bằng QR.",
    href: "/(main)/traceability",
    icon: QrCode,
    title: "Vụ mùa & QR",
  },
];

const supportItems: MoreItem[] = [
  {
    description: "Quản lý quyền truy cập các khu canh tác.",
    href: "/(main)/authorization",
    icon: ShieldCheck,
    title: "Ủy quyền",
  },
  {
    description: "Trao đổi với trợ lý AI và kỹ sư nông nghiệp.",
    href: "/(main)/chat",
    icon: MessageCircleMore,
    title: "Chat AI & kỹ sư",
  },
];

const learningItems: MoreItem[] = [
  {
    description: "Tra cứu tài liệu và hướng dẫn chăm sóc sầu riêng.",
    href: "/(main)/knowledge",
    icon: GraduationCap,
    title: "Kiến thức",
  },
  {
    description: "Chia sẻ và trao đổi kinh nghiệm cùng cộng đồng.",
    href: "/(main)/community",
    icon: Users,
    title: "Cộng đồng",
  },
];

export function DurianMoreScreen() {
  const navigation = useDurianSafeNavigation();
  const { session } = useSession();
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  const secondaryGroups = useMemo<MoreGroup[]>(() => {
    const accountItems: MoreItem[] = [
      {
        description: "Xem các thông báo và nhắc việc mới.",
        href: "/(main)/notifications",
        icon: Bell,
        title: "Thông báo",
      },
      {
        description: "Tìm nhanh chức năng, kiến thức và nội dung liên quan.",
        href: "/(main)/search",
        icon: FileSearch,
        title: "Tìm kiếm",
      },
    ];
    if (session?.user.role === "ENGINEER") {
      accountItems.push({
        description: "Xem thông tin hồ sơ dành cho kỹ sư.",
        href: "/engineer-profile",
        icon: UserRound,
        title: "Hồ sơ kỹ sư",
      });
    }
    if (session?.user.backendRole === "ADMIN") {
      accountItems.push({
        description: "Xét duyệt hồ sơ đăng ký kỹ sư.",
        href: "/admin-engineer-approval",
        icon: ShieldCheck,
        title: "Duyệt kỹ sư",
      });
    }
    return [
      { items: productionItems, title: "THIẾT BỊ & SẢN XUẤT" },
      { items: supportItems, title: "KẾT NỐI & HỖ TRỢ" },
      { items: learningItems, title: "CỘNG ĐỒNG & KIẾN THỨC" },
      { items: accountItems, title: "TÀI KHOẢN & CẬP NHẬT" },
    ];
  }, [session?.user.backendRole, session?.user.role]);

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
        eyebrow="DURIANCARE"
        icon={MoreHorizontal}
        subtitle="Khám phá các chức năng khác của DurianCare"
        title="Thêm"
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityLabel="Mở hồ sơ cá nhân"
          onPress={() => navigation.push("/(main)/profile")}
          style={({ pressed }) => [styles.profileCard, pressed && styles.pressed]}
        >
          <View style={styles.profileAvatarWrap}>
            {session?.user.avatarUrl ? (
              <DurianRemoteImage feature="profile-avatar" uri={session.user.avatarUrl} style={styles.profileAvatarImage} />
            ) : (
              <Text style={styles.profileAvatarInitials}>{initialsFromName(session?.user.name)}</Text>
            )}
          </View>
          <View style={styles.profileCopy}>
            <Text numberOfLines={1} style={styles.profileTitle}>{session?.user.name}</Text>
            <Text numberOfLines={1} style={styles.profileSubtitle}>{session?.user.email}</Text>
            <Text style={styles.profileAction}>Mở hồ sơ cá nhân</Text>
          </View>
          <ChevronRight color={durianTheme.colors.muted} size={20} />
        </Pressable>

        {secondaryGroups.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.groupCard}>
              {group.items.map((item, index) => (
                <MoreRow
                  badge={item.title === "Thông báo" ? unreadCount : null}
                  item={item}
                  key={item.href}
                  onPress={() => navigation.push(item.href)}
                  showDivider={index < group.items.length - 1}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function MoreRow({ badge, item, onPress, showDivider }: { badge: number | null; item: MoreItem; onPress: () => void; showDivider: boolean }) {
  const Icon = item.icon;
  return (
    <Pressable accessibilityLabel={item.title} onPress={onPress} style={({ pressed }) => [styles.item, showDivider && styles.itemDivider, pressed && styles.pressed]}>
      <View style={styles.icon}><Icon color={durianTheme.colors.moss} size={21} /></View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{item.title}</Text>
          {badge !== null && badge > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text></View> : null}
        </View>
        <Text numberOfLines={2} style={styles.description}>{item.description}</Text>
      </View>
      <ChevronRight color={durianTheme.colors.mist} size={20} />
    </Pressable>
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
  badge: { alignItems: "center", backgroundColor: durianTheme.colors.durianYellow, borderRadius: durianTheme.radius.pill, justifyContent: "center", minHeight: 19, paddingHorizontal: 6 },
  badgeText: { color: durianTheme.colors.mossDark, fontSize: 10, fontWeight: "900" },
  content: { gap: durianTheme.spacing.lg, padding: durianTheme.spacing.lg, paddingBottom: 28 },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  description: { color: durianTheme.colors.muted, ...durianTheme.typography.caption },
  group: { gap: durianTheme.spacing.sm },
  groupCard: { backgroundColor: durianTheme.colors.surface, borderColor: durianTheme.colors.border, borderRadius: durianTheme.radius.md, borderWidth: 1, overflow: "hidden" },
  groupTitle: { color: durianTheme.colors.moss, ...durianTheme.typography.label, letterSpacing: 0.8, paddingHorizontal: 4 },
  icon: { alignItems: "center", backgroundColor: durianTheme.colors.mossSoft, borderRadius: durianTheme.radius.sm, height: 42, justifyContent: "center", width: 42 },
  item: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 72, paddingHorizontal: 13, paddingVertical: 10 },
  itemDivider: { borderBottomColor: durianTheme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  pressed: { backgroundColor: durianTheme.colors.surfaceSecondary },
  profileAction: { color: durianTheme.colors.moss, ...durianTheme.typography.caption, fontWeight: "800" },
  profileAvatarImage: { height: "100%", width: "100%" },
  profileAvatarInitials: { color: durianTheme.colors.mossDark, fontSize: 18, fontWeight: "900" },
  profileAvatarWrap: { alignItems: "center", backgroundColor: durianTheme.colors.durianYellow, borderRadius: 21, height: 54, justifyContent: "center", overflow: "hidden", width: 54 },
  profileCard: { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderColor: durianTheme.colors.border, borderRadius: durianTheme.radius.md, borderWidth: 1, flexDirection: "row", gap: 12, padding: 14 },
  profileCopy: { flex: 1, gap: 2, minWidth: 0 },
  profileSubtitle: { color: durianTheme.colors.muted, ...durianTheme.typography.caption },
  profileTitle: { color: durianTheme.colors.ink, ...durianTheme.typography.section },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  title: { color: durianTheme.colors.ink, ...durianTheme.typography.bodyStrong },
  titleRow: { alignItems: "center", flexDirection: "row", gap: 7 },
});
