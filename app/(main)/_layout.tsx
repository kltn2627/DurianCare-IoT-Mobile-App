import { type Href, Tabs } from "expo-router";
import { Activity, Camera, LayoutDashboard, MessageCircle, QrCode, Users } from "lucide-react-native";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

export default function DurianCareMainTabs() {
  const { isRestoring, session } = useSession();
  const isOwner = session?.user.role === "OWNER";

  if (isRestoring || !session) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={durianTheme.colors.durianYellow} size="large" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: durianTheme.colors.durianYellow,
        tabBarInactiveTintColor: durianTheme.colors.mist,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "800", marginBottom: 7 },
        tabBarStyle: {
          backgroundColor: durianTheme.colors.moss,
          borderTopWidth: 0,
          height: 72,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tổng quan",
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "AI Scanner",
          tabBarIcon: ({ color, size }) => <Camera color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Kênh chat",
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Cộng đồng",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="sensors"
        options={{
          href: isOwner ? ("/(main)/sensors" as Href) : null,
          title: "Cảm biến",
          tabBarIcon: ({ color, size }) => <Activity color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="authorization"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Truy xuất",
          tabBarIcon: ({ color, size }) => <QrCode color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    flex: 1,
    justifyContent: "center",
  },
});
