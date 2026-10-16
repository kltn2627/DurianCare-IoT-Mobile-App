import type { LucideIcon } from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { durianTheme } from "@/src/theme/durianTheme";

type AppButtonProps = { label: string; onPress: () => void; variant?: "primary" | "secondary" | "outline" | "ghost" | "danger"; icon?: LucideIcon; loading?: boolean; disabled?: boolean };

export function AppButton({ label, onPress, variant = "primary", icon: Icon, loading = false, disabled = false }: AppButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable disabled={isDisabled} onPress={onPress} style={({ pressed }) => [styles.base, styles[variant], isDisabled && styles.disabled, pressed && !isDisabled && styles.pressed]}>
      {loading ? <ActivityIndicator color={variant === "primary" || variant === "danger" ? durianTheme.colors.white : durianTheme.colors.moss} size="small" /> : Icon ? <Icon color={variant === "primary" || variant === "danger" ? durianTheme.colors.white : durianTheme.colors.moss} size={18} /> : null}
      <Text style={[styles.text, styles[`${variant}Text` as keyof typeof styles]]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", borderRadius: durianTheme.radius.sm, flexDirection: "row", flexShrink: 1, gap: durianTheme.spacing.sm, justifyContent: "center", minHeight: durianTheme.control.minHeight, paddingHorizontal: durianTheme.spacing.lg },
  primary: { backgroundColor: durianTheme.colors.moss },
  secondary: { backgroundColor: durianTheme.colors.mossSoft },
  outline: { backgroundColor: durianTheme.colors.surface, borderColor: durianTheme.colors.border, borderWidth: 1 },
  ghost: { backgroundColor: "transparent" },
  danger: { backgroundColor: durianTheme.colors.danger },
  text: { flexShrink: 1, fontSize: 14, fontWeight: "800", textAlign: "center" },
  primaryText: { color: durianTheme.colors.white },
  secondaryText: { color: durianTheme.colors.mossDark },
  outlineText: { color: durianTheme.colors.moss },
  ghostText: { color: durianTheme.colors.moss },
  dangerText: { color: durianTheme.colors.white },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.98 }] },
});
