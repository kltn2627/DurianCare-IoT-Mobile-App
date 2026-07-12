import { KeyRound, LogOut, ShieldAlert } from "lucide-react-native";
import { useState, type ComponentProps } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

export function ChangePasswordScreen() {
  const navigation = useDurianSafeNavigation();
  const { logout } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const mismatch = newPassword && confirmPassword && newPassword !== confirmPassword;
  const canSubmit = false;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <DurianScreenHeader
        eyebrow="HỒ SƠ CÁ NHÂN"
        icon={KeyRound}
        title="Đổi mật khẩu"
        subtitle="Màn hình này được tạo để parity với Web, nhưng contract backend hiện tại chưa có endpoint đổi mật khẩu."
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.noteCard}>
          <ShieldAlert color={durianTheme.colors.danger} size={20} />
          <View style={styles.noteCopy}>
            <Text style={styles.noteTitle}>Chưa có API backend</Text>
            <Text style={styles.noteText}>
              Để tránh fake API, nút đổi mật khẩu đang được tắt. Khi backend bổ sung contract, màn này có thể được nối vào ngay.
            </Text>
          </View>
        </View>

        <Field label="Mật khẩu hiện tại" value={currentPassword} onChangeText={setCurrentPassword} />
        <Field label="Mật khẩu mới" value={newPassword} onChangeText={setNewPassword} />
        <Field label="Nhập lại mật khẩu mới" value={confirmPassword} onChangeText={setConfirmPassword} error={mismatch ? "Mật khẩu nhập lại chưa khớp." : ""} />

        <Pressable
          disabled={!canSubmit}
          onPress={() => undefined}
          style={({ pressed }) => [
            styles.primaryButton,
            !canSubmit && styles.disabled,
            pressed && canSubmit && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>Đổi mật khẩu</Text>
        </Pressable>

        <Pressable
          onPress={async () => {
            await logout();
            navigation.replace("/login");
          }}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <LogOut color={durianTheme.colors.moss} size={16} />
          <Text style={styles.secondaryButtonText}>Đăng xuất và đổi tài khoản</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  error,
  label,
  ...props
}: {
  error?: string;
  label: string;
} & Omit<ComponentProps<typeof TextInput>, "editable">) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        secureTextEntry
        placeholderTextColor={durianTheme.colors.mist}
        style={[styles.input, error ? styles.inputError : null]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 18, paddingBottom: 42 },
  disabled: { opacity: 0.5 },
  errorText: { color: durianTheme.colors.danger, fontSize: 11, lineHeight: 16 },
  fieldBlock: { gap: 8 },
  fieldLabel: {
    color: durianTheme.colors.mossDark,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: "#E3DDC5",
    borderRadius: 18,
    borderWidth: 1,
    color: durianTheme.colors.ink,
    fontSize: 14,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputError: { borderColor: durianTheme.colors.danger },
  noteCard: {
    alignItems: "flex-start",
    backgroundColor: "#FFF5F3",
    borderColor: "#F0C2BA",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 16,
  },
  noteCopy: { flex: 1, gap: 4 },
  noteText: { color: "#7D443A", fontSize: 12, lineHeight: 18 },
  noteTitle: { color: durianTheme.colors.danger, fontSize: 13, fontWeight: "900", lineHeight: 18 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 18,
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: durianTheme.colors.mossDark,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#F7F9F4",
    borderColor: "#D9E3DB",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: durianTheme.colors.moss,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
});
