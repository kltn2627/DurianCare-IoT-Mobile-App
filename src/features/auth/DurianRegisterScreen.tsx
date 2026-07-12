import * as DocumentPicker from "expo-document-picker";
import { ArrowLeft, Eye, EyeOff, FilePlus2, Mail, Phone, Sprout, UserRound } from "lucide-react-native";
import { useMemo, useState, type ComponentType, type ComponentProps } from "react";
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

import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { durianTheme } from "@/src/theme/durianTheme";

import { registerEngineerRequest, registerRequest } from "./authApi";
import type { EngineerRegistrationRequest, RegisterRequest } from "./authTypes";
import { useAuthRateLimit } from "./useAuthRateLimit";

const PHONE_PATTERN = /^$|^[0-9+() .-]{8,30}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];

type RegisterRole = "FARMER" | "ENGINEER";
type QualificationFile = {
  name: string;
  type: string;
  uri: string;
  size: number;
};

export function DurianRegisterScreen() {
  const navigation = useDurianSafeNavigation();
  const { handleAuthError, isRateLimited, retryAfterSeconds } = useAuthRateLimit();
  const [role, setRole] = useState<RegisterRole>("FARMER");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [engineerFields, setEngineerFields] = useState({
    biography: "",
    specialization: "",
    workplace: "",
    yearsExperience: "",
  });
  const [qualificationFiles, setQualificationFiles] = useState<QualificationFile[]>([]);

  const validation = useMemo(() => {
    const next: string[] = [];
    if (!fullName.trim() || !email.trim() || !password) {
      next.push("Vui lòng nhập họ tên, email và mật khẩu.");
    }
    if (fullName.trim().length > 150) {
      next.push("Họ và tên không được vượt quá 150 ký tự.");
    }
    if (email.trim().length > 320 || !EMAIL_PATTERN.test(email.trim())) {
      next.push("Email không hợp lệ.");
    }
    if (password.length < 12 || password.length > 72) {
      next.push("Mật khẩu phải có từ 12 đến 72 ký tự.");
    }
    if (password !== confirmPassword) {
      next.push("Xác nhận mật khẩu không khớp.");
    }
    if (!PHONE_PATTERN.test(phoneNumber.trim())) {
      next.push("Số điện thoại phải có 8-30 ký tự hợp lệ.");
    }
    if (role === "ENGINEER") {
      if (!engineerFields.workplace.trim()) next.push("Vui lòng nhập nơi công tác.");
      if (!engineerFields.specialization.trim()) next.push("Vui lòng nhập chuyên môn.");
      const parsedYears = Number(engineerFields.yearsExperience);
      if (!Number.isInteger(parsedYears) || parsedYears < 0 || parsedYears > 60) {
        next.push("Số năm kinh nghiệm phải từ 0 đến 60.");
      }
      if (!engineerFields.biography.trim()) {
        next.push("Vui lòng nhập giới thiệu chuyên môn.");
      }
      if (engineerFields.biography.trim().length > 2000) {
        next.push("Giới thiệu không được vượt quá 2000 ký tự.");
      }
      if (qualificationFiles.length === 0) {
        next.push("Vui lòng tải lên ít nhất một chứng chỉ hoặc bằng cấp.");
      }
      if (qualificationFiles.some((file) => file.size > MAX_FILE_SIZE)) {
        next.push("Mỗi file chứng chỉ không được vượt quá 10MB.");
      } else if (
        qualificationFiles.some(
          (file) =>
            !ALLOWED_FILE_TYPES.includes(file.type) ||
            typeof file.uri !== "string" ||
            !file.uri,
        )
      ) {
        next.push("Chỉ chấp nhận file PDF, JPG hoặc PNG.");
      }
    }
    return next;
  }, [confirmPassword, email, engineerFields, fullName, password, phoneNumber, qualificationFiles, role]);

  async function pickQualificationFiles() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
      type: ["application/pdf", "image/jpeg", "image/png"],
    });

    if (result.canceled || result.assets.length === 0) return;

    const nextFiles = result.assets.map((asset) => ({
      name: asset.name,
      type: asset.mimeType ?? inferMimeType(asset.name),
      uri: asset.uri,
      size: asset.size ?? 0,
    }));

    setQualificationFiles((current) => {
      const merged = [...current];
      nextFiles.forEach((file) => {
        if (!merged.some((item) => item.name === file.name && item.uri === file.uri)) {
          merged.push(file);
        }
      });
      return merged;
    });
    setError("");
  }

  function removeQualificationFile(index: number) {
    setQualificationFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleRegister() {
    if (validation.length > 0) {
      setError(validation[0]);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const basePayload: RegisterRequest = {
      email: normalizedEmail,
      fullName: fullName.trim(),
      password,
      phoneNumber: phoneNumber.trim() || undefined,
      role,
    };

    setError("");
    setIsSubmitting(true);

    try {
      if (role === "ENGINEER") {
        await registerEngineerRequest(
          {
            ...basePayload,
            role: "ENGINEER",
            workplace: engineerFields.workplace.trim(),
            specialization: engineerFields.specialization.trim(),
            yearsExperience: Number(engineerFields.yearsExperience),
            biography: engineerFields.biography.trim(),
          } as EngineerRegistrationRequest,
          qualificationFiles,
        );
      } else {
        await registerRequest(basePayload);
      }
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
              Đăng ký cho chủ vườn hoặc kỹ sư. Kỹ sư cần bổ sung thông tin chuyên môn và chứng chỉ.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Vai trò đăng ký</Text>
            <View style={styles.roleSwitch}>
              {(["FARMER", "ENGINEER"] as const).map((item) => {
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

            <Field
              autoComplete="name"
              icon={UserRound}
              label="Họ và tên"
              onChangeText={setFullName}
              placeholder="Nguyễn Văn An"
              value={fullName}
            />
            <Field
              autoCapitalize="none"
              autoComplete="email"
              icon={Mail}
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              placeholder="email@duriancare.vn"
              value={email}
            />
            <Field
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

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Xác nhận mật khẩu</Text>
              <View style={styles.inputShell}>
                <TextInput
                  autoComplete="new-password"
                  onChangeText={setConfirmPassword}
                  placeholder="Nhập lại mật khẩu"
                  placeholderTextColor={durianTheme.colors.muted}
                  secureTextEntry={!showConfirmPassword}
                  style={styles.input}
                  value={confirmPassword}
                />
                <Pressable
                  hitSlop={12}
                  onPress={() => setShowConfirmPassword((current) => !current)}
                  style={styles.iconButton}
                >
                  {showConfirmPassword ? (
                    <EyeOff color={durianTheme.colors.muted} size={20} />
                  ) : (
                    <Eye color={durianTheme.colors.muted} size={20} />
                  )}
                </Pressable>
              </View>
            </View>

            {role === "ENGINEER" ? (
              <>
                <Field
                  label="Nơi công tác"
                  onChangeText={(value) => setEngineerFields((current) => ({ ...current, workplace: value }))}
                  placeholder="Trung tâm hỗ trợ nông nghiệp"
                  value={engineerFields.workplace}
                />
                <Field
                  label="Chuyên môn"
                  onChangeText={(value) =>
                    setEngineerFields((current) => ({ ...current, specialization: value }))
                  }
                  placeholder="Bệnh học thực vật"
                  value={engineerFields.specialization}
                />
                <Field
                  keyboardType="number-pad"
                  label="Số năm kinh nghiệm"
                  onChangeText={(value) =>
                    setEngineerFields((current) => ({ ...current, yearsExperience: value }))
                  }
                  placeholder="5"
                  value={engineerFields.yearsExperience}
                />
                <TextAreaField
                  label="Giới thiệu chuyên môn"
                  onChangeText={(value) =>
                    setEngineerFields((current) => ({ ...current, biography: value }))
                  }
                  placeholder="Giới thiệu ngắn gọn về kinh nghiệm và khu vực làm việc..."
                  value={engineerFields.biography}
                />

                <View style={styles.fileField}>
                  <Text style={styles.label}>Chứng chỉ / bằng cấp</Text>
                  <Pressable
                    onPress={() => void pickQualificationFiles()}
                    style={({ pressed }) => [styles.filePicker, pressed && styles.pressed]}
                  >
                    <FilePlus2 color={durianTheme.colors.moss} size={20} />
                    <Text style={styles.filePickerText}>Chọn file PDF / JPG / PNG</Text>
                  </Pressable>

                  {qualificationFiles.length > 0 ? (
                    <View style={styles.fileList}>
                      {qualificationFiles.map((file, index) => (
                        <View key={`${file.name}-${index}`} style={styles.fileChip}>
                          <Text style={styles.fileChipText} numberOfLines={1}>
                            {file.name}
                          </Text>
                          <Pressable
                            onPress={() => removeQualificationFile(index)}
                            hitSlop={8}
                            style={styles.fileRemove}
                          >
                            <Text style={styles.fileRemoveText}>×</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}

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

function Field({
  icon: Icon,
  label,
  ...inputProps
}: {
  icon?: ComponentType<{ color: string; size: number }>;
  label: string;
} & ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputShell}>
        {Icon ? <Icon color={durianTheme.colors.muted} size={18} /> : null}
        <TextInput
          placeholderTextColor={durianTheme.colors.muted}
          style={styles.input}
          {...inputProps}
        />
      </View>
    </View>
  );
}

function TextAreaField({
  label,
  ...inputProps
}: {
  label: string;
} & ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, styles.textAreaShell]}>
        <TextInput
          multiline
          placeholderTextColor={durianTheme.colors.muted}
          style={[styles.input, styles.textAreaInput]}
          {...inputProps}
        />
      </View>
    </View>
  );
}

function inferMimeType(filename: string) {
  const normalized = filename.toLowerCase();
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".pdf")) return "application/pdf";
  return "image/jpeg";
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
  fileChip: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.canvas,
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  fileChipText: {
    color: durianTheme.colors.ink,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  fileField: { gap: 10 },
  fileList: { gap: 8 },
  filePicker: {
    alignItems: "center",
    backgroundColor: "#F8F6EB",
    borderColor: "#E6E0C7",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  filePickerText: {
    color: durianTheme.colors.moss,
    fontSize: 13,
    fontWeight: "800",
  },
  fileRemove: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 10,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  fileRemoveText: {
    color: durianTheme.colors.mossDark,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 20,
  },
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
  rateLimit: { color: durianTheme.colors.warning, fontSize: 12, fontWeight: "800", lineHeight: 18 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: durianTheme.radius.md,
    justifyContent: "center",
    minHeight: 54,
  },
  primaryButtonText: { color: durianTheme.colors.mossDark, fontSize: 15, fontWeight: "900", lineHeight: 21 },
  pressed: { transform: [{ scale: 0.98 }] },
  roleButton: { alignItems: "center", borderRadius: 11, flex: 1, minHeight: 46, justifyContent: "center" },
  roleButtonActive: { backgroundColor: durianTheme.colors.moss },
  roleSwitch: { backgroundColor: durianTheme.colors.mossSoft, borderRadius: 14, flexDirection: "row", padding: 4 },
  roleText: { color: durianTheme.colors.moss, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  roleTextActive: { color: durianTheme.colors.white },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  subtitle: { color: durianTheme.colors.muted, fontSize: 14, lineHeight: 21 },
  textAreaInput: {
    minHeight: 110,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  textAreaShell: {
    alignItems: "flex-start",
  },
  title: { color: durianTheme.colors.mossDark, fontSize: 28, fontWeight: "900", lineHeight: 34 },
});
