import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { durianTheme } from "@/src/theme/durianTheme";

/**
 * In-app confirmation sheet (same look on Android and iOS). While `busy` both buttons are disabled and
 * the confirm button shows a spinner, so a second tap cannot send the request twice.
 */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  tone = "primary",
  busy = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={() => { if (!busy) onCancel(); }}>
      <Pressable accessibilityLabel="Đóng hộp thoại" style={styles.backdrop} onPress={() => { if (!busy) onCancel(); }}>
        <Pressable accessibilityRole="alert" style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onCancel}
              style={({ pressed }) => [styles.cancel, pressed && styles.pressed, busy && styles.disabled]}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy, disabled: busy }}
              disabled={busy}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.confirm,
                tone === "danger" && styles.confirmDanger,
                pressed && styles.pressed,
                busy && styles.disabled,
              ]}
            >
              {busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)", padding: 24 },
  sheet: { width: "100%", maxWidth: 380, borderRadius: durianTheme.radius.lg, backgroundColor: durianTheme.colors.surface, padding: 20, gap: 10 },
  title: { fontSize: 17, fontWeight: "800", color: durianTheme.colors.ink },
  message: { fontSize: 14, lineHeight: 20, color: durianTheme.colors.muted },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 8 },
  cancel: { minHeight: 44, paddingHorizontal: 18, borderRadius: durianTheme.radius.sm, borderWidth: 1, borderColor: durianTheme.colors.mossSoft, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 14, fontWeight: "700", color: durianTheme.colors.ink },
  confirm: { minHeight: 44, paddingHorizontal: 18, borderRadius: durianTheme.radius.sm, backgroundColor: durianTheme.colors.moss, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  confirmDanger: { backgroundColor: durianTheme.colors.danger },
  confirmText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
});
