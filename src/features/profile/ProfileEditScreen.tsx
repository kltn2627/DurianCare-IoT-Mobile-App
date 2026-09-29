import { CalendarDays, LoaderCircle, Mail, MapPin, PencilLine, Phone, RefreshCcw, Save, ShieldCheck, UserRound } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { KeyboardAwareScrollView } from "@/src/components/KeyboardAwareScrollView";
import { useSession } from "@/src/session/SessionContext";
import { DurianRemoteImage } from "@/src/components/DurianRemoteImage";
import { durianTheme } from "@/src/theme/durianTheme";

import { profileClient, ProfileApiError } from "./profileApi";
import type { ProfileAccountStatus, ProfileGender, ProfileRecord, ProfileUpdateRequest } from "./profileTypes";

type DraftState = {
  address: string;
  bio: string;
  dateOfBirth: string;
  fullName: string;
  gender: ProfileGender;
  phoneNumber: string;
  provinceCity: string;
};

type ToastState = { kind: "success" | "error"; message: string } | null;

const GENDER_OPTIONS: Array<{ label: string; value: ProfileGender }> = [
  { label: "Nam", value: "MALE" },
  { label: "Nữ", value: "FEMALE" },
  { label: "Khác", value: "OTHER" },
];

function createDraft(profile: ProfileRecord): DraftState {
  return {
    address: profile.address ?? "",
    bio: profile.bio ?? "",
    dateOfBirth: profile.dateOfBirth ?? "",
    fullName: profile.fullName ?? "",
    gender: (profile.gender ?? "") as ProfileGender,
    phoneNumber: profile.phoneNumber ?? "",
    provinceCity: profile.provinceCity ?? "",
  };
}

function validateFullName(value: string) {
  const name = value.trim();
  if (!name) return "Vui lòng nhập họ và tên.";
  if (name.length > 150) return "Họ và tên không được vượt quá 150 ký tự.";
  return "";
}

function validatePhoneNumber(value: string) {
  const phone = value.trim();
  if (!phone) return "";
  if (!/^$|^[0-9+() .-]{8,30}$/.test(phone)) return "Số điện thoại chưa đúng định dạng.";
  return "";
}

function validateDateOfBirth(value: string) {
  const dob = value.trim();
  if (!dob) return "";
  const parsed = new Date(dob);
  if (Number.isNaN(parsed.getTime())) return "Ngày sinh chưa hợp lệ.";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsed >= today) return "Ngày sinh phải nhỏ hơn ngày hiện tại.";
  return "";
}

function validateAddress(value: string) {
  if (value.trim().length > 500) return "Địa chỉ không được vượt quá 500 ký tự.";
  return "";
}

function validateProvinceCity(value: string) {
  if (value.trim().length > 150) return "Tỉnh / thành phố không được vượt quá 150 ký tự.";
  return "";
}

function validateBio(value: string) {
  if (value.trim().length > 500) return "Giới thiệu không được vượt quá 500 ký tự.";
  return "";
}

function formatAccountStatus(status?: ProfileAccountStatus | null) {
  const normalized = (status ?? "").toUpperCase();
  if (normalized.includes("ACTIVE")) return "Đang hoạt động";
  if (normalized.includes("PENDING")) return "Chờ xác minh";
  if (normalized.includes("BLOCK")) return "Bị khoá";
  return status || "Chưa cập nhật";
}

function initialsFromName(name?: string | null) {
  if (!name) return "DC";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "DC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDateTime(value?: string | null) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function friendlyMessage(input: { message?: string; status?: number } | null | undefined, fallback: string) {
  if (input?.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (input?.status === 404) return "Không tìm thấy hồ sơ cá nhân.";
  if (input?.status === 503) return "Dịch vụ hồ sơ đang tạm thời gián đoạn.";
  return input?.message?.trim() || fallback;
}

export function ProfileEditScreen() {
  const { applyProfileSnapshot, refreshProfile, session } = useSession();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentAvatar = profile?.avatarUrl ?? session?.user.avatarUrl ?? null;
  const currentName = draft?.fullName || profile?.fullName || session?.user.name || "Người dùng DurianCare";
  const currentInitials = initialsFromName(currentName);

  const validation = useMemo(() => {
    if (!draft) return {};
    return {
      address: validateAddress(draft.address),
      bio: validateBio(draft.bio),
      dateOfBirth: validateDateOfBirth(draft.dateOfBirth),
      fullName: validateFullName(draft.fullName),
      phoneNumber: validatePhoneNumber(draft.phoneNumber),
      provinceCity: validateProvinceCity(draft.provinceCity),
    };
  }, [draft]);

  const hasValidationError = useMemo(() => Object.values(validation).some(Boolean), [validation]);

  const clearToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback(
    (kind: "error" | "success", message: string) => {
      clearToast();
      setToast({ kind, message });
      toastTimerRef.current = setTimeout(() => {
        setToast(null);
        toastTimerRef.current = null;
      }, 2400);
    },
    [clearToast],
  );

  const loadProfile = useCallback(async () => {
    try {
      const nextProfile = await profileClient.me();
      setProfile(nextProfile);
      setDraft(createDraft(nextProfile));
      setLoadError(null);
      if (session?.user.id === nextProfile.userId) {
        await applyProfileSnapshot(nextProfile);
      }
    } catch (cause) {
      setLoadError(
        friendlyMessage(
          cause instanceof ProfileApiError ? { message: cause.message, status: cause.status } : null,
          "Không thể tải hồ sơ cá nhân.",
        ),
      );
      setProfile(null);
      setDraft(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applyProfileSnapshot, session?.user.id]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => () => clearToast(), [clearToast]);

  const refreshContent = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    await refreshProfile();
  }, [loadProfile, refreshProfile]);

  const updateDraftField = useCallback(
    <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
      setDraft((current) => (current ? { ...current, [key]: value } : current));
    },
    [],
  );

  const saveProfile = useCallback(async () => {
    if (!draft) return;

    const nextErrors = {
      address: validateAddress(draft.address),
      bio: validateBio(draft.bio),
      dateOfBirth: validateDateOfBirth(draft.dateOfBirth),
      fullName: validateFullName(draft.fullName),
      phoneNumber: validatePhoneNumber(draft.phoneNumber),
      provinceCity: validateProvinceCity(draft.provinceCity),
    };

    if (Object.values(nextErrors).some(Boolean)) {
      showToast("error", "Vui lòng kiểm tra lại dữ liệu vừa nhập.");
      return;
    }

    const payload: ProfileUpdateRequest = {
      fullName: draft.fullName.trim(),
    };
    if (draft.phoneNumber.trim()) payload.phoneNumber = draft.phoneNumber.trim();
    if (draft.dateOfBirth.trim()) payload.dateOfBirth = draft.dateOfBirth.trim();
    if (draft.gender) payload.gender = draft.gender;
    if (draft.address.trim()) payload.address = draft.address.trim();
    if (draft.provinceCity.trim()) payload.provinceCity = draft.provinceCity.trim();
    if (draft.bio.trim()) payload.bio = draft.bio.trim();

    setSaving(true);
    try {
      const nextProfile = await profileClient.updateMe(payload);
      setProfile(nextProfile);
      setDraft(createDraft(nextProfile));
      await applyProfileSnapshot(nextProfile);
      showToast("success", "Cập nhật hồ sơ thành công.");
    } catch (cause) {
      showToast(
        "error",
        friendlyMessage(
          cause instanceof ProfileApiError ? { message: cause.message, status: cause.status } : null,
          "Không thể cập nhật hồ sơ.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }, [applyProfileSnapshot, draft, showToast]);

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <DurianScreenHeader
          eyebrow="HỒ SƠ CÁ NHÂN"
          icon={UserRound}
          title="Chỉnh sửa hồ sơ"
          subtitle="Đang tải dữ liệu từ backend..."
        />
      </SafeAreaView>
    );
  }

  if (!profile || !draft) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <DurianScreenHeader
          eyebrow="HỒ SƠ CÁ NHÂN"
          icon={UserRound}
          title="Chỉnh sửa hồ sơ"
          subtitle="Không thể tải dữ liệu hồ sơ."
        />
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Không tải được hồ sơ</Text>
          <Text style={styles.emptyText}>{loadError ?? "Vui lòng thử tải lại."}</Text>
          <Pressable onPress={() => void loadProfile()} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <RefreshCcw color={durianTheme.colors.mossDark} size={16} />
            <Text style={styles.primaryButtonText}>Tải lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <DurianScreenHeader
        eyebrow="HỒ SƠ CÁ NHÂN"
        icon={UserRound}
        title="Chỉnh sửa hồ sơ"
        subtitle="Cập nhật thông tin cá nhân, số điện thoại và địa chỉ của bạn."
      />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[durianTheme.colors.durianYellow]}
            progressBackgroundColor={durianTheme.colors.moss}
            refreshing={refreshing}
            tintColor={durianTheme.colors.durianYellow}
            onRefresh={() => {
              setRefreshing(true);
              void refreshContent();
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {toast ? (
          <View style={[styles.toast, toast.kind === "success" ? styles.toastSuccess : styles.toastError]}>
            <Text style={[styles.toastText, toast.kind === "success" ? styles.toastSuccessText : styles.toastErrorText]}>
              {toast.message}
            </Text>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <View style={styles.avatarWrap}>
            {currentAvatar ? (
              <DurianRemoteImage feature="profile-avatar" uri={currentAvatar} resizeMode="cover" style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarFallback}>{currentInitials}</Text>
            )}
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroName}>{currentName}</Text>
            <Text style={styles.heroEmail}>{profile.email}</Text>
            <View style={styles.heroBadges}>
              <View style={styles.badge}>
                <ShieldCheck color={durianTheme.colors.moss} size={14} />
                <Text style={styles.badgeText}>{profile.role}</Text>
              </View>
              <View style={styles.badge}>
                <CalendarDays color={durianTheme.colors.moss} size={14} />
                <Text style={styles.badgeText}>{formatDateTime(profile.createdAt)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin chỉnh sửa</Text>
          <View style={styles.formGrid}>
            <Field label="Họ và tên" value={draft.fullName} onChangeText={(value) => updateDraftField("fullName", value)} error={validation.fullName} />
            <Field label="Số điện thoại" value={draft.phoneNumber} onChangeText={(value) => updateDraftField("phoneNumber", value)} error={validation.phoneNumber} keyboardType="phone-pad" icon={Phone} />
            <Field label="Ngày sinh" value={draft.dateOfBirth} onChangeText={(value) => updateDraftField("dateOfBirth", value)} error={validation.dateOfBirth} placeholder="YYYY-MM-DD" icon={CalendarDays} />
            <Field label="Địa chỉ" value={draft.address} onChangeText={(value) => updateDraftField("address", value)} error={validation.address} icon={MapPin} />
            <Field label="Tỉnh / thành phố" value={draft.provinceCity} onChangeText={(value) => updateDraftField("provinceCity", value)} error={validation.provinceCity} icon={MapPin} />
            <Field
              label="Giới thiệu"
              value={draft.bio}
              onChangeText={(value) => updateDraftField("bio", value)}
              error={validation.bio}
              multiline
            />
          </View>

          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((option) => {
              const selected = draft.gender === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => updateDraftField("gender", option.value)}
                  style={({ pressed }) => [
                    styles.genderChip,
                    selected && styles.genderChipActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.genderChipText, selected && styles.genderChipTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => void loadProfile()}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <RefreshCcw color={durianTheme.colors.moss} size={16} />
              <Text style={styles.secondaryButtonText}>Khôi phục</Text>
            </Pressable>
            <Pressable
              disabled={saving || hasValidationError}
              onPress={() => void saveProfile()}
              style={({ pressed }) => [
                styles.primaryButton,
                (saving || hasValidationError) && styles.disabled,
                pressed && !saving && !hasValidationError && styles.pressed,
              ]}
            >
              {saving ? <LoaderCircle color={durianTheme.colors.mossDark} size={16} /> : <Save color={durianTheme.colors.mossDark} size={16} />}
              <Text style={styles.primaryButtonText}>{saving ? "Đang lưu..." : "Lưu hồ sơ"}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin chỉ đọc</Text>
          <InfoRow label="Email" value={profile.email} />
          <InfoRow label="Vai trò" value={profile.role} />
          <InfoRow label="Trạng thái" value={formatAccountStatus(profile.accountStatus)} />
          <InfoRow label="Ngày tạo" value={formatDateTime(profile.createdAt)} />
          <InfoRow label="Cập nhật gần nhất" value={formatDateTime(profile.updatedAt)} />
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function Field({
  error,
  icon: Icon,
  label,
  multiline,
  ...props
}: {
  error?: string;
  icon?: typeof Phone;
  label: string;
  multiline?: boolean;
} & Omit<ComponentProps<typeof TextInput>, "editable">) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputShell, multiline && styles.textAreaShell, error && styles.inputError]}>
        {Icon ? <Icon color={durianTheme.colors.moss} size={16} /> : null}
        <TextInput
          {...props}
          multiline={multiline}
          placeholderTextColor={durianTheme.colors.mist}
          style={[styles.input, multiline && styles.textArea]}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: "row", gap: 10 },
  avatarImage: { height: "100%", width: "100%" },
  avatarWrap: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 24,
    height: 88,
    justifyContent: "center",
    overflow: "hidden",
    width: 88,
  },
  avatarFallback: {
    color: durianTheme.colors.mossDark,
    fontSize: 28,
    fontWeight: "900",
  },
  badge: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: durianTheme.radius.pill,
    flexDirection: "row",
    gap: 6,
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: durianTheme.colors.moss,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
  },
  content: { gap: durianTheme.spacing.lg, padding: durianTheme.spacing.xl, paddingBottom: 44 },
  disabled: { opacity: 0.45 },
  emptyState: { alignItems: "center", gap: 10, paddingHorizontal: 24, paddingVertical: 30 },
  emptyText: { color: durianTheme.colors.muted, ...durianTheme.typography.body, textAlign: "center" },
  emptyTitle: { color: durianTheme.colors.ink, ...durianTheme.typography.section },
  errorText: { color: durianTheme.colors.danger, fontSize: 11, lineHeight: 16 },
  fieldBlock: { gap: 8 },
  fieldLabel: {
    color: durianTheme.colors.mossDark,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  formGrid: { gap: 14 },
  genderChip: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surfaceSecondary,
    borderColor: durianTheme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  genderChipActive: { backgroundColor: durianTheme.colors.moss, borderColor: durianTheme.colors.moss },
  genderChipText: { color: durianTheme.colors.moss, fontSize: 11, fontWeight: "900", lineHeight: 16 },
  genderChipTextActive: { color: durianTheme.colors.white },
  genderRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  heroBadges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  heroCard: {
    backgroundColor: durianTheme.colors.moss,
    borderRadius: 28,
    flexDirection: "row",
    gap: 14,
    padding: 18,
  },
  heroCopy: { flex: 1, gap: 7 },
  heroEmail: { color: "#DDE9E1", fontSize: 12, lineHeight: 18 },
  heroName: { color: durianTheme.colors.white, fontSize: 24, fontWeight: "900", lineHeight: 30 },
  infoLabel: { color: durianTheme.colors.muted, flexShrink: 1, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  infoRow: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surfaceSecondary,
    borderColor: durianTheme.colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  infoValue: { color: durianTheme.colors.ink, flex: 1, flexShrink: 1, fontSize: 13, fontWeight: "800", lineHeight: 18, textAlign: "right" },
  input: {
    color: durianTheme.colors.ink,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 22,
    paddingVertical: 0,
  },
  inputError: { borderColor: durianTheme.colors.danger },
  inputShell: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderColor: "#E3DDC5",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 18,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    height: 46,
    justifyContent: "center",
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
    flex: 1,
    flexDirection: "row",
    gap: 8,
    height: 46,
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: durianTheme.colors.moss,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 28,
    gap: 14,
    padding: 18,
  },
  sectionTitle: { color: durianTheme.colors.ink, fontSize: 17, fontWeight: "900", lineHeight: 23 },
  textArea: { minHeight: 96, textAlignVertical: "top" },
  textAreaShell: { alignItems: "flex-start" },
  toast: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toastError: { backgroundColor: durianTheme.colors.dangerSoft, borderColor: durianTheme.colors.danger, borderWidth: 1 },
  toastErrorText: { color: durianTheme.colors.danger },
  toastSuccess: { backgroundColor: durianTheme.colors.successSoft, borderColor: durianTheme.colors.border, borderWidth: 1 },
  toastSuccessText: { color: durianTheme.colors.moss },
  toastText: { flex: 1, fontSize: 12, fontWeight: "800", lineHeight: 17 },
  safeAreaPlaceholder: { flex: 1 },
});
