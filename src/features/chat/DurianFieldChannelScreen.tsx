import { Bot, MessageCircle, Sparkles, UsersRound } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { durianTheme } from "@/src/theme/durianTheme";

import { DurianAiAssistantChannel } from "./DurianAiAssistantChannel";
import { DurianExpertChannel } from "./DurianExpertChannel";

type ChatChannel = "ai" | "expert";

export function DurianFieldChannelScreen() {
  const [channel, setChannel] = useState<ChatChannel>("ai");

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MessageCircle color={durianTheme.colors.durianYellow} size={24} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>TRẠM TƯ VẤN DURIANCARE</Text>
          <Text style={styles.headerTitle}>AI và Kỹ sư đồng hành</Text>
        </View>
        <View style={styles.onlineBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>24/7</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <ChannelTab
          active={channel === "ai"}
          icon={Bot}
          label="Trợ lý AI"
          onPress={() => setChannel("ai")}
        />
        <ChannelTab
          active={channel === "expert"}
          icon={UsersRound}
          label="Kết nối Kỹ sư"
          onPress={() => setChannel("expert")}
        />
      </View>

      <View style={styles.channel}>
        {channel === "ai" ? <DurianAiAssistantChannel /> : <DurianExpertChannel />}
      </View>
    </SafeAreaView>
  );
}

function ChannelTab({
  active,
  icon: Icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: typeof Bot;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        active && styles.activeTab,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.tabIcon, active && styles.activeTabIcon]}>
        <Icon
          color={active ? durianTheme.colors.mossDark : durianTheme.colors.muted}
          size={19}
        />
      </View>
      <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
      {active ? <Sparkles color={durianTheme.colors.moss} size={14} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  activeTab: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.durianYellow,
  },
  activeTabIcon: { backgroundColor: durianTheme.colors.durianYellow },
  activeTabText: { color: durianTheme.colors.mossDark },
  channel: { flex: 1 },
  eyebrow: {
    color: durianTheme.colors.durianYellow,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    lineHeight: 13,
  },
  header: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    flexDirection: "row",
    gap: 11,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  headerCopy: { flex: 1 },
  headerIcon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossDark,
    borderRadius: 17,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  headerTitle: {
    color: durianTheme.colors.white,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 23,
    marginTop: 1,
  },
  onlineBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: durianTheme.radius.pill,
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  onlineDot: { backgroundColor: "#71D19A", borderRadius: 5, height: 8, width: 8 },
  onlineText: {
    color: durianTheme.colors.white,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 14,
  },
  pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  tab: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: 17,
    borderWidth: 2,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 9,
  },
  tabIcon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  tabText: {
    color: durianTheme.colors.muted,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
  },
  tabs: {
    backgroundColor: "#EEEBDD",
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
});
