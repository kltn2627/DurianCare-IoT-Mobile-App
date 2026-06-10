import { Activity, QrCode, Users } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { durianTheme } from "@/src/theme/durianTheme";

const moreItems = [
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
    description: "Quản lý hồ sơ vụ mùa và tạo mã QR định danh nông sản.",
    href: "/(main)/profile",
    icon: QrCode,
    title: "Truy xuất",
  },
];

export function DurianMoreScreen() {
  const navigation = useDurianSafeNavigation();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <DurianScreenHeader
        eyebrow="MENU MỞ RỘNG"
        icon={Users}
        title="Tính năng khác"
        subtitle="Các mục ít dùng hơn được gom lại để thanh điều hướng gọn và dễ thao tác."
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 42 },
  copy: { flex: 1, gap: 4 },
  description: { color: durianTheme.colors.muted, fontSize: 12, lineHeight: 18 },
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
  title: { color: durianTheme.colors.ink, fontSize: 16, fontWeight: "900" },
});
