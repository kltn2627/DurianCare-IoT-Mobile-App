import { ArrowLeft, BadgeCheck, MailCheck, RefreshCw } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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

import { resendOtpRequest, verifyOtpRequest } from "./authApi";
import { useAuthRateLimit } from "./useAuthRateLimit";
import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { durianTheme } from "@/src/theme/durianTheme";

export function DurianOtpVerificationScreen() {
  const navigation = useDurianSafeNavigation();
  const { handleAuthError, isRateLimited, retryAfterSeconds } = useAuthRateLimit();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === "string" ? params.email.trim().toLowerCase() : "";
  const [otpCode, setOtpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [error, setError] = useState(email ? "" : "Thiếu email đăng ký. Vui lòng quay lại.");
  const [message, setMessage] = useState("");

  useEffect(
    function countDownOtpResend() {
      if (resendCooldown <= 0) return;
      const timer = setTimeout(
        () => setResendCooldown((current) => Math.max(0, current - 1)),
        1000,
      );
      return () => clearTimeout(timer);
    },
    [resendCooldown],
  );

  async function handleVerify() {
    if (!email || !/^\d{6}$/.test(otpCode)) {
      setError("OTP phải gồm đúng 6 chữ số.");
      return;
    }
    setError("");
    setMessage("");
    setIsSubmitting(true);
    try {
      const response = await verifyOtpRequest({ email, otpCode });
      setMessage(response.message);
      setIsVerified(true);
    } catch (requestError) {
      setError(handleAuthError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!email) return;
    setError("");
    setMessage("");
    setIsResending(true);
    try {
      const response = await resendOtpRequest(email);
      setMessage(response.message);
      setResendCooldown(60);
    } catch (requestError) {
      setError(handleAuthError(requestError));
    } finally {
      setIsResending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable
            hitSlop={10}
            onPress={() => navigation.replace("/register")}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <ArrowLeft color={durianTheme.colors.moss} size={22} />
          </Pressable>

          <View style={styles.card}>
          <View style={styles.iconCircle}>
            {isVerified ? (
              <BadgeCheck color={durianTheme.colors.mossDark} size={36} />
            ) : (
              <MailCheck color={durianTheme.colors.mossDark} size={36} />
            )}
          </View>
          <Text style={styles.title}>Xác minh email</Text>
          <Text style={styles.subtitle}>
            Nhập mã OTP 6 số đã gửi đến {email || "email đăng ký"}. Mã có hiệu lực 5 phút.
          </Text>

          {!isVerified ? (
            <TextInput
              editable={Boolean(email)}
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={(value) => setOtpCode(value.replace(/\D/g, ""))}
              onSubmitEditing={() => void handleVerify()}
              placeholder="000000"
              placeholderTextColor={durianTheme.colors.muted}
              style={styles.otpInput}
              textContentType="oneTimeCode"
              value={otpCode}
            />
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.success}>{message}</Text> : null}
          {isRateLimited ? (
            <Text style={styles.rateLimit}>Thử lại sau {retryAfterSeconds} giây.</Text>
          ) : null}

          {isVerified ? (
            <Pressable
              onPress={() => navigation.replace("/login")}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>Đến trang đăng nhập</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                disabled={isSubmitting || isRateLimited || !email}
                onPress={() => void handleVerify()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                  (isSubmitting || isRateLimited || !email) && styles.disabled,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={durianTheme.colors.mossDark} />
                ) : (
                  <Text style={styles.primaryButtonText}>Xác minh OTP</Text>
                )}
              </Pressable>
              <Pressable
                disabled={isResending || isRateLimited || resendCooldown > 0 || !email}
                onPress={() => void handleResend()}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                {isResending ? (
                  <ActivityIndicator color={durianTheme.colors.moss} />
                ) : (
                  <>
                    <RefreshCw color={durianTheme.colors.moss} size={18} />
                    <Text style={styles.secondaryButtonText}>
                      {resendCooldown > 0
                        ? `Gửi lại sau ${resendCooldown} giây`
                        : "Gửi lại OTP"}
                    </Text>
                  </>
                )}
              </Pressable>
            </>
          )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  card: { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderRadius: durianTheme.radius.lg, gap: 17, padding: 24 },
  content: { flex: 1 },
  scrollContent: { flexGrow: 1, gap: 24, justifyContent: "center", padding: 20 },
  disabled: { opacity: 0.55 },
  error: { color: durianTheme.colors.danger, fontSize: 13, fontWeight: "700", lineHeight: 19, textAlign: "center" },
  iconCircle: { alignItems: "center", backgroundColor: durianTheme.colors.durianYellow, borderRadius: 34, height: 68, justifyContent: "center", width: 68 },
  otpInput: { backgroundColor: durianTheme.colors.canvas, borderColor: durianTheme.colors.mossSoft, borderRadius: 16, borderWidth: 1, color: durianTheme.colors.mossDark, fontSize: 28, fontWeight: "900", letterSpacing: 12, lineHeight: 36, minHeight: 64, paddingHorizontal: 18, textAlign: "center", width: "100%" },
  pressed: { transform: [{ scale: 0.98 }] },
  rateLimit: { color: durianTheme.colors.warning, fontSize: 12, fontWeight: "800", lineHeight: 18, textAlign: "center" },
  primaryButton: { alignItems: "center", backgroundColor: durianTheme.colors.durianYellow, borderRadius: durianTheme.radius.md, justifyContent: "center", minHeight: 54, width: "100%" },
  primaryButtonText: { color: durianTheme.colors.mossDark, fontSize: 15, fontWeight: "900", lineHeight: 21 },
  safeArea: { backgroundColor: durianTheme.colors.moss, flex: 1 },
  secondaryButton: { alignItems: "center", borderColor: durianTheme.colors.mossSoft, borderRadius: durianTheme.radius.md, borderWidth: 1, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 48, width: "100%" },
  secondaryButtonText: { color: durianTheme.colors.moss, fontSize: 14, fontWeight: "800", lineHeight: 20 },
  subtitle: { color: durianTheme.colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center" },
  success: { color: durianTheme.colors.moss, fontSize: 14, fontWeight: "800", lineHeight: 21, textAlign: "center" },
  title: { color: durianTheme.colors.mossDark, fontSize: 26, fontWeight: "900", lineHeight: 32 },
});
