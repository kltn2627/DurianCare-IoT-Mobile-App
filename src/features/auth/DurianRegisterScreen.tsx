import { ArrowLeft, Eye, EyeOff, Mail, Phone, Sprout, UserRound } from "lucide-react-native";
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

import { registerRequest } from "./authApi";
import type { RegisterRequest } from "./authTypes";
import { useAuthRateLimit } from "./useAuthRateLimit";
import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { durianTheme } from "@/src/theme/durianTheme";

const PHONE_PATTERN = /^$|^[0-9+() .-]{8,30}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function DurianRegisterScreen() {
  const navigation = useDurianSafeNavigation();
  const { handleAuthError, isRateLimited, retryAfterSeconds } = useAuthRateLimit();
  const [role, setRole] = useState<"EXPERT" | "FARMER">("FARMER");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function validate() {
    if (!fullName.trim() || !email.trim() || !password) {
      return "Vui lòng nhập họ tên, email và mật khẩu.";
    }
    if (fullName.trim().length > 150) return "Họ tên không được vượt quá 150 ký tự.";
    if (email.trim().length > 320 || !EMAIL_PATTERN.test(email.trim())) {
      return "Email không hợp lệ.";
    }
    if (password.length < 12 || password.length > 72) {
      return "Mật khẩu phải có từ 12 đến 72 ký tự.";
    }
    if (!PHONE_PATTERN.test(phoneNumber.trim())) {
      return "Số điện thoại phải có 8-30 ký tự hợp lệ.";
    }
    return null;
  }

  async function handleRegister() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setIsSubmitting(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      await registerRequest({
        email: normalizedEmail,
        fullName: fullName.trim(),
        password,
        phoneNumber: phoneNumber.trim() || null,
        role,
      });
      navigation.replace(`/verify-otp?email=${encodeURIComponent(normalizedEmail)}`);
    } catch (requestError) {
      setError(handleAuthError(requestError));
    } finally {
      setIsSubmitting(false);
    }
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
          <Pressable
            hitSlop={10}
            onPress={() => navigation.replace("/login")}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <ArrowLeft color={durianTheme.colors.moss} size={22} />
          </Pressable>

          <View style={styles.heading}>
            <View style={styles.headingIcon}>
              <Sprout color={durianTheme.colors.mossDark} size={28} />
            </View>
            <Text style={styles.title}>Tạo tài khoản DurianCare</Text>
            <Text style={styles.subtitle}>
              Sau đăng ký, hệ thống gửi OTP qua email. Tài khoản kỹ sư cần quản trị viên phê duyệt.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Vai trò đăng ký</Text>
            <View style={styles.roleSwitch}>
              {(["FARMER", "EXPERT"] as const).map((item) => {
                const active = item === role;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setRole(item)}
                    style={({ pressed }) => [
                      styles.roleButton,
                      active && styles.roleButtonActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.roleText, active && styles.roleTextActive]}>
                      {item === "FARMER" ? "Chủ vườn" : "Kỹ sư"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <AuthField
              autoComplete="name"
              icon={UserRound}
              label="Họ và tên"
              onChangeText={setFullName}
              placeholder="Nguyễn Văn An"
              value={fullName}
            />
            <AuthField
              autoCapitalize="none"
              autoComplete="email"
              icon={Mail}
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              placeholder="email@duriancare.vn"
              value={email}
            />
            <AuthField
              autoComplete="tel"
              icon={Phone}
              keyboardType="phone-pad"
              label="Số điện thoại (không bắt buộc)"
              onChangeText={setPhoneNumber}
              placeholder="0901 234 567"
              value={phoneNumber}
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={styles.inputShell}>
                <TextInput
                  autoComplete="new-password"
                  onChangeText={setPassword}
                  placeholder="Tối thiểu 12 ký tự"
                  placeholderTextColor={durianTheme.colors.muted}
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  value={password}
                />
                <Pressable
                  hitSlop={12}
                  onPress={() => setShowPassword((current) => !current)}
                  style={styles.iconButton}
                >
                  {showPassword ? (
                    <EyeOff color={durianTheme.colors.muted} size={20} />
                  ) : (
                    <Eye color={durianTheme.colors.muted} size={20} />
                  )}
                </Pressable>
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {isRateLimited ? (
              <Text style={styles.rateLimit}>Thử lại sau {retryAfterSeconds} giây.</Text>
            ) : null}

            <Pressable
              disabled={isSubmitting || isRateLimited}
              onPress={() => void handleRegister()}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                (isSubmitting || isRateLimited) && styles.disabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={durianTheme.colors.mossDark} />
              ) : (
                <Text style={styles.primaryButtonText}>Đăng ký và nhận OTP</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type AuthFieldProps = React.ComponentProps<typeof TextInput> & {
  icon: typeof Mail;
  label: string;
};

function AuthField({ icon: Icon, label, ...inputProps }: AuthFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputShell}>
        <Icon color={durianTheme.colors.muted} size={20} />
        <TextInput
          placeholderTextColor={durianTheme.colors.muted}
          style={styles.input}
          {...inputProps}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  card: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: durianTheme.radius.lg,
    gap: 17,
    padding: 20,
  },
  content: { gap: 22, padding: 20, paddingBottom: 44 },
  disabled: { opacity: 0.65 },
  error: { color: durianTheme.colors.danger, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  fieldGroup: { gap: 8 },
  flex: { flex: 1 },
  heading: { gap: 8 },
  headingIcon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 20,
    height: 52,
    justifyContent: "center",
    marginBottom: 4,
    width: 52,
  },
  iconButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  input: { color: durianTheme.colors.ink, flex: 1, fontSize: 15, lineHeight: 20, paddingVertical: 13 },
  inputShell: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.canvas,
    borderColor: durianTheme.colors.mossSoft,
    borderRadius: durianTheme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  label: { color: durianTheme.colors.ink, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  pressed: { transform: [{ scale: 0.98 }] },
  rateLimit: { color: durianTheme.colors.warning, fontSize: 12, fontWeight: "800", lineHeight: 18 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: durianTheme.radius.md,
    justifyContent: "center",
    minHeight: 54,
  },
  primaryButtonText: { color: durianTheme.colors.mossDark, fontSize: 15, fontWeight: "900", lineHeight: 21 },
  roleButton: { alignItems: "center", borderRadius: 11, flex: 1, minHeight: 46, justifyContent: "center" },
  roleButtonActive: { backgroundColor: durianTheme.colors.moss },
  roleSwitch: { backgroundColor: durianTheme.colors.mossSoft, borderRadius: 14, flexDirection: "row", padding: 4 },
  roleText: { color: durianTheme.colors.moss, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  roleTextActive: { color: durianTheme.colors.white },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  subtitle: { color: durianTheme.colors.muted, fontSize: 14, lineHeight: 21 },
  title: { color: durianTheme.colors.mossDark, fontSize: 28, fontWeight: "900", lineHeight: 34 },
});
