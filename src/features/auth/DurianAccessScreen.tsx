import { Eye, EyeOff, Leaf, LockKeyhole, Mail, ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/src/session/SessionContext";
import type { UserRole } from "@/src/session/types";
import { durianTheme } from "@/src/theme/durianTheme";

export function DurianAccessScreen() {
  const { isRestoring, login } = useSession();
  const [email, setEmail] = useState("owner@duriancare.vn");
  const [password, setPassword] = useState("12345678");
  const [role, setRole] = useState<UserRole>("OWNER");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (isRestoring) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={durianTheme.colors.durianYellow} size="large" />
      </View>
    );
  }

  function handleRoleChange(nextRole: UserRole) {
    setRole(nextRole);
    setEmail(nextRole === "OWNER" ? "owner@duriancare.vn" : "engineer@duriancare.vn");
  }

  async function handleLogin() {
    if (!email.trim() || password.length < 6) {
      setError("Vui lòng nhập email và mật khẩu tối thiểu 6 ký tự.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 650));
    await login(email.trim(), role);
    setIsSubmitting(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandBlock}>
            <View style={styles.logo}>
              <Leaf color={durianTheme.colors.mossDark} fill={durianTheme.colors.mossDark} size={38} />
            </View>
            <Text style={styles.brand}>DurianCare</Text>
            <Text style={styles.tagline}>SmartFarm Disease Operations</Text>
            <Text style={styles.description}>
              Không gian làm việc dành cho chủ vườn và kỹ sư nông nghiệp thực địa.
            </Text>
          </View>

          <View style={styles.formCard}>
            <View>
              <Text style={styles.formTitle}>Đăng nhập hệ thống</Text>
              <Text style={styles.formSubtitle}>Chọn vai trò để xem đúng luồng nghiệp vụ mock.</Text>
            </View>

            <View style={styles.roleSwitch}>
              {(["OWNER", "ENGINEER"] as UserRole[]).map((item) => {
                const isActive = role === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => handleRoleChange(item)}
                    style={[styles.roleButton, isActive && styles.roleButtonActive]}
                  >
                    <Text style={[styles.roleText, isActive && styles.roleTextActive]}>
                      {item === "OWNER" ? "Chủ vườn" : "Kỹ sư"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputShell}>
                <Mail color={durianTheme.colors.muted} size={20} />
                <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="email@duriancare.vn"
                  placeholderTextColor={durianTheme.colors.muted}
                  style={styles.input}
                  value={email}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={styles.inputShell}>
                <LockKeyhole color={durianTheme.colors.muted} size={20} />
                <TextInput
                  onChangeText={setPassword}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor={durianTheme.colors.muted}
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  value={password}
                />
                <Pressable hitSlop={12} onPress={() => setShowPassword((value) => !value)}>
                  {showPassword ? (
                    <EyeOff color={durianTheme.colors.muted} size={20} />
                  ) : (
                    <Eye color={durianTheme.colors.muted} size={20} />
                  )}
                </Pressable>
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              disabled={isSubmitting}
              onPress={handleLogin}
              style={({ pressed }) => [
                styles.loginButton,
                pressed && styles.pressed,
                isSubmitting && styles.disabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={durianTheme.colors.mossDark} />
              ) : (
                <>
                  <ShieldCheck color={durianTheme.colors.mossDark} size={21} />
                  <Text style={styles.loginButtonText}>Đăng nhập</Text>
                </>
              )}
            </Pressable>

            <Text style={styles.mockNote}>
              Demo offline: hệ thống chỉ lưu JWT giả trên thiết bị, không gửi dữ liệu ra ngoài.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  brand: { color: durianTheme.colors.white, fontSize: 34, fontWeight: "900", letterSpacing: -1 },
  brandBlock: { alignItems: "center", gap: 7, paddingHorizontal: 22, paddingVertical: 34 },
  content: { flexGrow: 1, justifyContent: "center", padding: 20 },
  description: {
    color: durianTheme.colors.mist,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5,
    maxWidth: 330,
    textAlign: "center",
  },
  disabled: { opacity: 0.65 },
  error: { color: durianTheme.colors.danger, fontSize: 13, fontWeight: "700" },
  fieldGroup: { gap: 8 },
  flex: { flex: 1 },
  formCard: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: durianTheme.radius.lg,
    gap: 18,
    padding: 22,
  },
  formSubtitle: { color: durianTheme.colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  formTitle: { color: durianTheme.colors.ink, fontSize: 22, fontWeight: "900" },
  input: { color: durianTheme.colors.ink, flex: 1, fontSize: 15, paddingVertical: 13 },
  inputShell: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.canvas,
    borderColor: durianTheme.colors.mossSoft,
    borderRadius: durianTheme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
  },
  label: { color: durianTheme.colors.ink, fontSize: 13, fontWeight: "800" },
  loadingScreen: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    flex: 1,
    justifyContent: "center",
  },
  loginButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: durianTheme.radius.md,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 54,
  },
  loginButtonText: { color: durianTheme.colors.mossDark, fontSize: 16, fontWeight: "900" },
  logo: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  mockNote: { color: durianTheme.colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center" },
  pressed: { transform: [{ scale: 0.985 }] },
  roleButton: { alignItems: "center", borderRadius: 10, flex: 1, paddingVertical: 11 },
  roleButtonActive: { backgroundColor: durianTheme.colors.moss },
  roleSwitch: {
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: durianTheme.radius.sm,
    flexDirection: "row",
    padding: 4,
  },
  roleText: { color: durianTheme.colors.moss, fontSize: 13, fontWeight: "800" },
  roleTextActive: { color: durianTheme.colors.white },
  safeArea: { backgroundColor: durianTheme.colors.moss, flex: 1 },
  tagline: { color: durianTheme.colors.durianYellow, fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
});
