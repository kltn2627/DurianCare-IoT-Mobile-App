import { CheckCircle2, CircleAlert, X } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { durianTheme } from "@/src/theme/durianTheme";

export type ToastTone = "success" | "error";
export type ToastState = { message: string; tone: ToastTone } | null;

/** Floating result message for a user action; dismisses itself (success 4 s, error 6 s). */
export function ToastBanner({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onClose, toast.tone === "error" ? 6000 : 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);
  if (!toast) return null;
  const error = toast.tone === "error";
  const Icon = error ? CircleAlert : CheckCircle2;
  const color = error ? durianTheme.colors.danger : durianTheme.colors.moss;
  return (
    <View
      accessibilityLiveRegion={error ? "assertive" : "polite"}
      accessibilityRole={error ? "alert" : "text"}
      pointerEvents="box-none"
      style={styles.wrap}
    >
      <View style={[styles.toast, error ? styles.error : styles.success]}>
        <Icon color={color} size={18} />
        <Text style={[styles.text, { color }]}>{toast.message}</Text>
        <Pressable accessibilityLabel="Đóng thông báo" hitSlop={10} onPress={onClose}>
          <X color={color} size={16} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16, bottom: 24, alignItems: "center" },
  toast: { flexDirection: "row", alignItems: "center", gap: 10, maxWidth: 480, width: "100%", borderRadius: durianTheme.radius.md, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: durianTheme.colors.surface, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  success: { borderColor: durianTheme.colors.mossSoft },
  error: { borderColor: durianTheme.colors.dangerSoft },
  text: { flex: 1, fontSize: 14, fontWeight: "600", lineHeight: 19 },
});
