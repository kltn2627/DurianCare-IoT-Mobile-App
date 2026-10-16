import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { durianTheme } from "@/src/theme/durianTheme";

export function AppCard({ children, onPress, tone = "surface" }: { children: ReactNode; onPress?: () => void; tone?: "surface" | "soft" }) {
  const content = <View style={[styles.card, tone === "soft" && styles.soft]}>{children}</View>;
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>{content}</Pressable> : content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    padding: durianTheme.spacing.md,
    ...durianTheme.shadow.card,
  },
  soft: { backgroundColor: durianTheme.colors.surfaceSecondary, borderColor: "transparent", shadowOpacity: 0, elevation: 0 },
  pressed: { opacity: 0.82 },
});
