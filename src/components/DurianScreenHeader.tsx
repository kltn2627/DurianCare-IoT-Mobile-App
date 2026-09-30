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
        <Icon color={durianTheme.colors.moss} size={24} />
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
  copy: { flex: 1, flexShrink: 1, gap: 4, minWidth: 0 },
  eyebrow: {
    color: durianTheme.colors.moss,
    ...durianTheme.typography.label,
    letterSpacing: 1.3,
  },
  header: {
    alignItems: "flex-start",
    backgroundColor: durianTheme.colors.surface,
    borderBottomColor: durianTheme.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: durianTheme.spacing.lg,
    paddingBottom: durianTheme.spacing.lg,
  },
  icon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: durianTheme.radius.sm,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  subtitle: { color: durianTheme.colors.muted, flexShrink: 1, ...durianTheme.typography.body },
  title: { color: durianTheme.colors.ink, ...durianTheme.typography.title, letterSpacing: -0.3 },
});
