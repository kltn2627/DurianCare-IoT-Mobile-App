import { StyleSheet, Text, View } from "react-native";

import { durianTheme } from "@/src/theme/durianTheme";

type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: StatusTone }) {
  const badgeTone = { success: styles.successBadge, warning: styles.warningBadge, danger: styles.dangerBadge, info: styles.infoBadge, neutral: styles.neutralBadge }[tone];
  const textTone = { success: styles.successText, warning: styles.warningText, danger: styles.dangerText, info: styles.infoText, neutral: styles.neutralText }[tone];
  return <View style={[styles.badge, badgeTone]}><Text style={[styles.text, textTone]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  badge: { alignSelf: "flex-start", borderRadius: durianTheme.radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  successBadge: { backgroundColor: durianTheme.colors.successSoft },
  warningBadge: { backgroundColor: durianTheme.colors.warningSoft },
  dangerBadge: { backgroundColor: durianTheme.colors.dangerSoft },
  infoBadge: { backgroundColor: durianTheme.colors.infoSoft },
  neutralBadge: { backgroundColor: durianTheme.colors.surfaceSecondary },
  text: { fontSize: 11, fontWeight: "800" },
  successText: { color: durianTheme.colors.success },
  warningText: { color: durianTheme.colors.warning },
  dangerText: { color: durianTheme.colors.danger },
  infoText: { color: durianTheme.colors.info },
  neutralText: { color: durianTheme.colors.muted },
});
