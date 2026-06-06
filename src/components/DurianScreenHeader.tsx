import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { durianTheme } from "@/src/theme/durianTheme";

type DurianScreenHeaderProps = {
  eyebrow: string;
  icon: LucideIcon;
  subtitle: string;
  title: string;
};

export function DurianScreenHeader({
  eyebrow,
  icon: Icon,
  subtitle,
  title,
}: DurianScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.icon}>
        <Icon color={durianTheme.colors.durianYellow} size={27} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  copy: { flex: 1, gap: 4 },
  eyebrow: {
    color: durianTheme.colors.durianYellow,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  header: {
    alignItems: "flex-start",
    backgroundColor: durianTheme.colors.moss,
    borderBottomLeftRadius: durianTheme.radius.lg,
    borderBottomRightRadius: durianTheme.radius.lg,
    flexDirection: "row",
    gap: 14,
    padding: durianTheme.spacing.lg,
    paddingBottom: durianTheme.spacing.xl,
  },
  icon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossDark,
    borderRadius: durianTheme.radius.md,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  subtitle: { color: durianTheme.colors.mist, fontSize: 13, lineHeight: 19 },
  title: { color: durianTheme.colors.white, fontSize: 25, fontWeight: "900", letterSpacing: -0.5 },
});
