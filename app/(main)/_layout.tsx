import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import {
  CalendarDays,
  Camera,
  LayoutDashboard,
  MapPinned,
  MoreHorizontal,
  ScanSearch,
  type LucideIcon,
} from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

type PrimaryTab = "index" | "farm" | "calendar" | "scanner" | "more";
type DurianBottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const tabItems: Array<{
  accessibilityLabel: string;
  icon: LucideIcon;
  label: string;
  route: PrimaryTab;
}> = [
  { accessibilityLabel: "Tổng quan", icon: LayoutDashboard, label: "Tổng quan", route: "index" },
  { accessibilityLabel: "Khu canh tác", icon: MapPinned, label: "Khu vườn", route: "farm" },
  { accessibilityLabel: "Lịch chăm sóc", icon: CalendarDays, label: "Chăm sóc", route: "calendar" },
  { accessibilityLabel: "Phân tích AI", icon: ScanSearch, label: "AI", route: "scanner" },
  { accessibilityLabel: "Thêm", icon: MoreHorizontal, label: "Thêm", route: "more" },
];

function activePrimaryTab(routeName: string | undefined): PrimaryTab {
  if (routeName === "index" || routeName === "farm" || routeName === "calendar" || routeName === "scanner") {
    return routeName;
  }
  return "more";
}

function DurianBottomTabBar({ navigateToTab, state }: DurianBottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const routeName = state.routes[state.index]?.name;
  const activeTab = activePrimaryTab(routeName);

  return (
    <View style={[styles.tabBar, { minHeight: 58 + Math.max(insets.bottom, 8), paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabItems.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.route;
        return (
          <Pressable
            accessibilityLabel={item.accessibilityLabel}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={item.route}
            onPress={() => {
              // SDK 58 tab bars switch tabs by route key, not by name.
              const target = state.routes.find((route) => route.name === item.route);
              if (target) navigateToTab(target.key);
            }}
            style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}
          >
            <View style={[styles.tabIcon, active && styles.tabIconActive]}>
              <Icon color={active ? durianTheme.colors.moss : durianTheme.colors.muted} size={21} strokeWidth={active ? 2.6 : 2} />
            </View>
            <Text numberOfLines={1} style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function DurianCareMainTabs() {
  const { isRestoring, session } = useSession();

  if (isRestoring || !session) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={durianTheme.colors.durianYellow} size="large" />
      </View>
    );
  }

  return (
    <Tabs backBehavior="history" screenOptions={{ headerShown: false }} tabBar={(props) => <DurianBottomTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: "Tổng quan" }} />
      <Tabs.Screen name="farm" options={{ title: "Khu canh tác" }} />
      <Tabs.Screen name="calendar" options={{ title: "Lịch chăm sóc" }} />
      <Tabs.Screen name="scanner" options={{ title: "Phân tích AI" }} />
      <Tabs.Screen name="more" options={{ title: "Thêm" }} />

      {/* Secondary screens: the custom tab bar shows only the five primary tabs, so these need no hiding option.
          SDK 58 maps a null href to hidden:true, which redirects away and made these screens unreachable. */}
      <Tabs.Screen name="authorization" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="community" />
      <Tabs.Screen name="camera" />
      <Tabs.Screen name="device-setup" />
      <Tabs.Screen name="export-compliance" />
      <Tabs.Screen name="knowledge" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="qr-scan" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="sensors" />
      <Tabs.Screen name="traceability" />
      <Tabs.Screen name="tree-scan" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: "center", backgroundColor: durianTheme.colors.canvas, flex: 1, justifyContent: "center" },
  tabBar: {
    alignItems: "flex-start",
    backgroundColor: durianTheme.colors.surface,
    borderTopColor: durianTheme.colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    paddingTop: 6,
  },
  tabIcon: {
    alignItems: "center",
    borderRadius: durianTheme.radius.pill,
    height: 25,
    justifyContent: "center",
    width: 38,
  },
  tabIconActive: { backgroundColor: durianTheme.colors.mossSoft },
  tabItem: {
    alignItems: "center",
    flex: 1,
    gap: 2,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 2,
  },
  tabItemPressed: { opacity: 0.7 },
  tabLabel: { color: durianTheme.colors.muted, fontSize: 10, fontWeight: "700", lineHeight: 14, maxWidth: "100%" },
  tabLabelActive: { color: durianTheme.colors.mossDark, fontWeight: "900" },
});
