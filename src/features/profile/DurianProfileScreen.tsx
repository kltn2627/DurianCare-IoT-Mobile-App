import * as ImagePicker from "expo-image-picker";
import {
  BadgeCheck,
  CalendarDays,
  Camera,
  Check,
  Image as ImageIcon,
  LoaderCircle,
  Mail,
  MapPin,
  PencilLine,
  Phone,
  RefreshCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps, ComponentType } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { useSession } from "@/src/session/SessionContext";
import { DurianRemoteImage } from "@/src/components/DurianRemoteImage";
import { durianTheme } from "@/src/theme/durianTheme";

import { profileClient, ProfileApiError } from "./profileApi";
import type {
  AvatarUploadFile,
  ProfileAccountStatus,
  ProfileGender,
  ProfileRecord,
  ProfileUpdateRequest,
} from "./profileTypes";

type ProfileFormState = {
  address: string;
  bio: string;
  dateOfBirth: string;
  fullName: string;
  gender: ProfileGender;
  phoneNumber: string;
  provinceCity: string;
};

type ToastState = {
  kind: "error" | "success";
  message: string;
} | null;

type AvatarSelection = {
  name: string;
  type: string;
  uri: string;
};

const GENDER_OPTIONS: Array<{ label: string; value: ProfileGender }> = [
  { label: "Nam", value: "MALE" },
  { label: "Nữ", value: "FEMALE" },
  { label: "Khác", value: "OTHER" },
];

function createDraft(profile: ProfileRecord): ProfileFormState {
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

function formatDate(value?: string | null) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
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

function emptyValue(value?: string | null) {
  return value?.trim() ? value : "Chưa cập nhật";
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
  if (!/^$|^[0-9+() .-]{8,30}$/.test(phone)) {
    return "Số điện thoại chưa đúng định dạng.";
  }
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
  if (value.trim().length > 500) {
    return "Địa chỉ không được vượt quá 500 ký tự.";
  }
  return "";
}

function validateProvinceCity(value: string) {
  if (value.trim().length > 150) {
    return "Tỉnh / thành phố không được vượt quá 150 ký tự.";
  }
  return "";
}

function validateBio(value: string) {
  if (value.trim().length > 500) {
    return "Giới thiệu không được vượt quá 500 ký tự.";
  }
  return "";
}

function friendlyProfileErrorMessage(
  input: {
    message?: string;
    status?: number;
  } | null | undefined,
  fallback: string,
) {
  const status = input?.status;
  if (status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (status === 404) return "Không tìm thấy hồ sơ cá nhân.";
  if (status === 503) return "Dịch vụ lưu ảnh đại diện đang tạm thời gián đoạn.";
  return input?.message?.trim() || fallback;
}

function isAvatarSelectionValid(file: AvatarUploadFile) {
  return ["image/jpeg", "image/png"].includes(file.type);
}

function buildAvatarSelection(asset: ImagePicker.ImagePickerAsset): AvatarSelection {
  const mimeType = asset.mimeType ?? inferMimeType(asset.uri);
  return {
    name:
      asset.fileName ??
      `avatar-${Date.now()}.${mimeType === "image/png" ? "png" : "jpg"}`,
    type: mimeType,
    uri: asset.uri,
  };
}

function inferMimeType(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  return "image/jpeg";
}

function ProfileLoadingState() {
  return (
    <View style={styles.skeletonWrap}>
      <View style={styles.skeletonHero}>
        <View style={styles.skeletonHeroTop}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonHeroCopy}>
            <View style={styles.skeletonLineShort} />
            <View style={styles.skeletonLineLong} />
            <View style={styles.skeletonLineMedium} />
          </View>
        </View>
        <View style={styles.skeletonStatsRow}>
          <View style={styles.skeletonStatCard} />
          <View style={styles.skeletonStatCard} />
          <View style={styles.skeletonStatCard} />
        </View>
      </View>
      <View style={styles.skeletonCard}>
        <View style={styles.skeletonSectionHeader} />
        <View style={styles.skeletonFieldsGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View key={index} style={styles.skeletonField} />
          ))}
        </View>
      </View>
      <View style={styles.skeletonCard}>
        <View style={styles.skeletonSectionHeader} />
        <View style={styles.skeletonAvatar} />
      </View>
    </View>
  );
}

export function DurianProfileScreen() {
  const { applyProfileSnapshot, refreshProfile: syncSessionProfile, session } = useSession();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [draft, setDraft] = useState<ProfileFormState | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarSelection, setAvatarSelection] = useState<AvatarSelection | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProfileFormState, string>>>(
    {},
  );
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentAvatar = avatarPreview ?? profile?.avatarUrl ?? session?.user.avatarUrl ?? null;
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
    } satisfies Partial<Record<keyof ProfileFormState, string>>;
  }, [draft]);

  const hasValidationError = useMemo(
    () => Object.values(validation).some(Boolean),
    [validation],
  );

  const clearToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
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

  const syncDraftFromProfile = useCallback((nextProfile: ProfileRecord) => {
    setProfile(nextProfile);
    setDraft(createDraft(nextProfile));
    setFieldErrors({});
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const nextProfile = await profileClient.me();
      syncDraftFromProfile(nextProfile);
      setLoadError(null);
      if (session?.user.id === nextProfile.userId) {
        await applyProfileSnapshot(nextProfile);
      }
    } catch (cause) {
      setLoadError(
        friendlyProfileErrorMessage(
          cause instanceof ProfileApiError
            ? { message: cause.message, status: cause.status }
            : null,
          "Không thể tải hồ sơ cá nhân.",
        ),
      );
      setProfile(null);
      setDraft(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applyProfileSnapshot, session?.user.id, syncDraftFromProfile]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    return () => {
      clearToast();
    };
  }, [clearToast]);

  const refreshContent = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
  }, [loadProfile]);

  const updateDraftField = useCallback(
    <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => {
      setDraft((current) => (current ? { ...current, [key]: value } : current));
      setFieldErrors((current) => {
        if (!current[key]) return current;
        const next = { ...current };
        delete next[key];
        return next;
      });
    },
    [],
  );

  const resetDraft = useCallback(() => {
    if (!profile) return;
    setDraft(createDraft(profile));
    setFieldErrors({});
    setEditing(false);
  }, [profile]);

  const saveProfile = useCallback(async () => {
    if (!draft) return;

    const nextErrors = {
      address: validateAddress(draft.address),
      bio: validateBio(draft.bio),
      dateOfBirth: validateDateOfBirth(draft.dateOfBirth),
      fullName: validateFullName(draft.fullName),
      phoneNumber: validatePhoneNumber(draft.phoneNumber),
      provinceCity: validateProvinceCity(draft.provinceCity),
    } satisfies Partial<Record<keyof ProfileFormState, string>>;
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      showToast("error", "Vui lòng kiểm tra lại thông tin vừa nhập.");
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
      syncDraftFromProfile(nextProfile);
      setEditing(false);
      await applyProfileSnapshot(nextProfile);
      showToast("success", "Cập nhật hồ sơ thành công.");
    } catch (cause) {
      showToast(
        "error",
        friendlyProfileErrorMessage(
          cause instanceof ProfileApiError
            ? { message: cause.message, status: cause.status }
            : null,
          "Không thể cập nhật hồ sơ lúc này.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }, [applyProfileSnapshot, draft, showToast, syncDraftFromProfile]);

  const pickAvatar = useCallback(
    async (mode: "camera" | "library") => {
      const permission =
        mode === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showToast(
          "error",
          mode === "camera"
            ? "Vui lòng cấp quyền camera để chụp ảnh đại diện."
            : "Vui lòng cấp quyền thư viện ảnh để chọn ảnh đại diện.",
        );
        return;
      }

      const result =
        mode === "camera"
          ? await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.92,
            })
          : await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.92,
            });

      if (result.canceled || result.assets.length === 0) return;
      const selection = buildAvatarSelection(result.assets[0]);
      if (!isAvatarSelectionValid(selection)) {
        showToast("error", "Chỉ hỗ trợ ảnh JPEG hoặc PNG.");
        return;
      }

      setAvatarSelection(selection);
      setAvatarPreview(selection.uri);
    },
    [showToast],
  );

  const uploadAvatar = useCallback(async () => {
    if (!avatarSelection || !profile) return;

    setAvatarSaving(true);
    try {
      const result = await profileClient.uploadAvatar(avatarSelection);
      const nextProfile = {
        ...profile,
        avatarUrl: result.avatarUrl,
      };
      syncDraftFromProfile(nextProfile);
      setAvatarSelection(null);
      setAvatarPreview(null);
      await applyProfileSnapshot(nextProfile);
      showToast("success", "Ảnh đại diện đã được cập nhật.");
    } catch (cause) {
      showToast(
        "error",
        friendlyProfileErrorMessage(
          cause instanceof ProfileApiError
            ? { message: cause.message, status: cause.status }
            : null,
          "Không thể tải ảnh đại diện.",
        ),
      );
    } finally {
      setAvatarSaving(false);
    }
  }, [applyProfileSnapshot, avatarSelection, profile, showToast, syncDraftFromProfile]);

  const removeAvatar = useCallback(() => {
    if (!profile?.avatarUrl) return;
    Alert.alert(
      "Xoá ảnh đại diện",
      "Bạn có muốn xoá ảnh đại diện hiện tại không?",
      [
        { text: "Huỷ", style: "cancel" },
        {
          text: "Xoá",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setAvatarSaving(true);
              try {
                await profileClient.deleteAvatar();
                const nextProfile = { ...profile, avatarUrl: null };
                syncDraftFromProfile(nextProfile);
                setAvatarSelection(null);
                setAvatarPreview(null);
                await applyProfileSnapshot(nextProfile);
                showToast("success", "Ảnh đại diện đã được xoá.");
              } catch (cause) {
                showToast(
                  "error",
                  friendlyProfileErrorMessage(
                    cause instanceof ProfileApiError
                      ? { message: cause.message, status: cause.status }
                      : null,
                    "Không thể xoá ảnh đại diện.",
                  ),
                );
              } finally {
                setAvatarSaving(false);
              }
            })();
          },
        },
      ],
      { cancelable: true },
    );
  }, [applyProfileSnapshot, profile, showToast, syncDraftFromProfile]);

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <DurianScreenHeader
          eyebrow="HỒ SƠ CÁ NHÂN"
          icon={UserRound}
          subtitle="Quản lý thông tin tài khoản, ảnh đại diện và dữ liệu định danh của bạn."
          title="Profile"
        />
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              colors={[durianTheme.colors.durianYellow]}
              progressBackgroundColor={durianTheme.colors.moss}
              refreshing={refreshing}
              tintColor={durianTheme.colors.durianYellow}
              onRefresh={refreshContent}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <ProfileLoadingState />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!profile || !draft) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <DurianScreenHeader
          eyebrow="HỒ SƠ CÁ NHÂN"
          icon={UserRound}
          subtitle="Quản lý thông tin tài khoản, ảnh đại diện và dữ liệu định danh của bạn."
          title="Profile"
        />
        <View style={styles.emptyStateWrap}>
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyStateIcon}>
              <Sparkles color={durianTheme.colors.moss} size={26} />
            </View>
            <Text style={styles.emptyStateTitle}>Không tải được hồ sơ cá nhân</Text>
            <Text style={styles.emptyStateMessage}>
              {loadError ?? "Vui lòng thử tải lại để lấy dữ liệu hồ sơ mới nhất."}
            </Text>
            <Pressable
              onPress={() => void loadProfile()}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <RefreshCcw color={durianTheme.colors.mossDark} size={18} />
              <Text style={styles.primaryButtonText}>Tải lại hồ sơ</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <DurianScreenHeader
        eyebrow="HỒ SƠ CÁ NHÂN"
        icon={UserRound}
        subtitle="Quản lý thông tin tài khoản, ảnh đại diện và dữ liệu định danh của bạn."
        title="Profile"
      />

      {toast ? (
        <View
          style={[
            styles.toast,
            toast.kind === "success" ? styles.toastSuccess : styles.toastError,
          ]}
        >
          <Check color={toast.kind === "success" ? durianTheme.colors.mossDark : "#A53C2F"} size={16} />
          <Text
            style={[
              styles.toastText,
              toast.kind === "success" ? styles.toastSuccessText : styles.toastErrorText,
            ]}
          >
            {toast.message}
          </Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[durianTheme.colors.durianYellow]}
            progressBackgroundColor={durianTheme.colors.moss}
            refreshing={refreshing}
            tintColor={durianTheme.colors.durianYellow}
            onRefresh={refreshContent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loadError ? (
          <View style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>{loadError}</Text>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarFrame}>
                {currentAvatar ? (
                  <DurianRemoteImage feature="profile-avatar" uri={currentAvatar} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarInitials}>{currentInitials}</Text>
                )}
              </View>
              <View style={styles.avatarBadge}>
                <BadgeCheck color={durianTheme.colors.mossDark} size={14} />
              </View>
            </View>

            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>TÀI KHOẢN ĐÃ ĐỒNG BỘ</Text>
              <Text style={styles.heroName}>{profile.fullName}</Text>
              <Text style={styles.heroEmail}>{profile.email}</Text>
              <View style={styles.heroBadgesRow}>
                <View style={styles.statusPill}>
                  <ShieldCheck color={durianTheme.colors.durianYellow} size={12} />
                  <Text style={styles.statusPillText}>{profile.role}</Text>
                </View>
                <View style={styles.statusPillSoft}>
                  <Text style={styles.statusPillSoftText}>
                    {formatAccountStatus(profile.accountStatus)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.statGrid}>
            <StatCard label="Số điện thoại" value={emptyValue(profile.phoneNumber)} icon={Phone} />
            <StatCard label="Ngày sinh" value={formatDate(profile.dateOfBirth)} icon={CalendarDays} />
            <StatCard label="Tỉnh / thành" value={emptyValue(profile.provinceCity)} icon={MapPin} />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <PencilLine color={durianTheme.colors.moss} size={20} />
            </View>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>Thông tin hồ sơ</Text>
              <Text style={styles.sectionSubtitle}>
                Chỉ các trường cho phép mới có thể chỉnh sửa trực tiếp trên thiết bị.
              </Text>
            </View>
            <Pressable
              onPress={() => {
                if (editing) {
                  resetDraft();
                  return;
                }
                setEditing(true);
              }}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <PencilLine color={durianTheme.colors.moss} size={16} />
              <Text style={styles.secondaryButtonText}>
                {editing ? "Huỷ chỉnh sửa" : "Chỉnh sửa"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.fieldsGrid}>
            <ProfileField
              editable={editing}
              error={fieldErrors.fullName ?? validation.fullName}
              label="Họ và tên"
              maxLength={150}
              onChangeText={(value) => updateDraftField("fullName", value)}
              value={draft.fullName}
            />

            <ProfileField
              editable={editing}
              error={fieldErrors.phoneNumber ?? validation.phoneNumber}
              label="Số điện thoại"
              maxLength={30}
              onChangeText={(value) => updateDraftField("phoneNumber", value)}
              value={draft.phoneNumber}
              keyboardType="phone-pad"
            />

            <ProfileField
              editable={editing}
              error={fieldErrors.dateOfBirth ?? validation.dateOfBirth}
              label="Ngày sinh"
              onChangeText={(value) => updateDraftField("dateOfBirth", value)}
              placeholder="YYYY-MM-DD"
              value={draft.dateOfBirth}
              maxLength={10}
            />

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Giới tính</Text>
              {editing ? (
                <View style={styles.segmentRow}>
                  {GENDER_OPTIONS.map((option) => {
                    const active = draft.gender === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => updateDraftField("gender", option.value)}
                        style={({ pressed }) => [
                          styles.segmentButton,
                          active && styles.segmentButtonActive,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentButtonText,
                            active && styles.segmentButtonTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.readOnlyBox}>
                  <Text style={styles.readOnlyText}>
                    {GENDER_OPTIONS.find((item) => item.value === draft.gender)?.label ??
                      "Chưa cập nhật"}
                  </Text>
                </View>
              )}
            </View>

            <ProfileField
              editable={editing}
              error={fieldErrors.address ?? validation.address}
              label="Địa chỉ"
              maxLength={500}
              onChangeText={(value) => updateDraftField("address", value)}
              value={draft.address}
            />

            <ProfileField
              editable={editing}
              error={fieldErrors.provinceCity ?? validation.provinceCity}
              label="Tỉnh / thành phố"
              maxLength={150}
              onChangeText={(value) => updateDraftField("provinceCity", value)}
              value={draft.provinceCity}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Giới thiệu</Text>
            {editing ? (
              <TextInput
                multiline
                onChangeText={(value) => updateDraftField("bio", value)}
                placeholder="Giới thiệu ngắn về bạn..."
                placeholderTextColor={durianTheme.colors.mist}
                style={[
                  styles.textArea,
                  Boolean(fieldErrors.bio ?? validation.bio) && styles.inputErrorBorder,
                ]}
                textAlignVertical="top"
                value={draft.bio}
                maxLength={500}
              />
            ) : (
              <View style={styles.bioBox}>
                <Text style={styles.bioText}>{emptyValue(profile.bio)}</Text>
              </View>
            )}
            <Text style={styles.helperText}>Tối đa 500 ký tự.</Text>
            {fieldErrors.bio || validation.bio ? (
              <Text style={styles.errorText}>{fieldErrors.bio || validation.bio}</Text>
            ) : null}
          </View>

          {editing ? (
            <View style={styles.actionRow}>
              <Text style={styles.actionNote}>
                Dữ liệu sẽ được kiểm tra trước khi gửi lên backend.
              </Text>
              <View style={styles.actionButtons}>
                <Pressable
                  onPress={resetDraft}
                  style={({ pressed }) => [styles.ghostButton, pressed && styles.pressed]}
                >
                  <Text style={styles.ghostButtonText}>Huỷ</Text>
                </Pressable>
                <Pressable
                  disabled={saving || hasValidationError}
                  onPress={() => void saveProfile()}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    (pressed || saving || hasValidationError) && styles.pressed,
                    (saving || hasValidationError) && styles.primaryButtonDisabled,
                  ]}
                >
                  {saving ? (
                    <LoaderCircle color={durianTheme.colors.mossDark} size={18} />
                  ) : (
                    <Save color={durianTheme.colors.mossDark} size={18} />
                  )}
                  <Text style={styles.primaryButtonText}>
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIconSoft}>
              <Sparkles color={durianTheme.colors.moss} size={20} />
            </View>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>Ảnh đại diện</Text>
              <Text style={styles.sectionSubtitle}>
                Chụp ảnh trực tiếp hoặc chọn từ thư viện, sau đó tải lên để đồng bộ ngay.
              </Text>
            </View>
          </View>

          <View style={styles.avatarEditor}>
            <View style={styles.avatarPreviewCard}>
              <View style={styles.avatarPreviewFrame}>
                {currentAvatar ? (
                  <DurianRemoteImage feature="profile-avatar" uri={currentAvatar} style={styles.avatarPreviewImage} />
                ) : (
                  <Text style={styles.avatarPreviewInitials}>{currentInitials}</Text>
                )}
              </View>

              <View style={styles.avatarPreviewCopy}>
                <Text style={styles.avatarPreviewTitle}>
                  {avatarSelection ? avatarSelection.name : "Chưa chọn ảnh mới"}
                </Text>
                <Text style={styles.avatarPreviewSubtitle}>
                  {avatarSelection
                    ? "Ảnh đã sẵn sàng để tải lên. Hệ thống hỗ trợ JPEG và PNG."
                    : "Ảnh hiện tại sẽ được hiển thị trên menu và các màn hình khác sau khi đồng bộ."}
                </Text>
                {avatarSaving ? (
                  <View style={styles.uploadingRow}>
                    <LoaderCircle color={durianTheme.colors.moss} size={16} />
                    <Text style={styles.uploadingText}>Đang cập nhật avatar...</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.avatarActionsGrid}>
              <Pressable
                onPress={() => void pickAvatar("camera")}
                style={({ pressed }) => [styles.avatarActionButton, pressed && styles.pressed]}
              >
                <Camera color={durianTheme.colors.moss} size={18} />
                <Text style={styles.avatarActionButtonText}>Chụp ảnh</Text>
              </Pressable>

              <Pressable
                onPress={() => void pickAvatar("library")}
                style={({ pressed }) => [styles.avatarActionButton, pressed && styles.pressed]}
              >
                <ImageIcon color={durianTheme.colors.moss} size={18} />
                <Text style={styles.avatarActionButtonText}>Chọn từ thư viện</Text>
              </Pressable>

              <Pressable
                disabled={!avatarSelection || avatarSaving}
                onPress={() => void uploadAvatar()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.avatarPrimaryButton,
                  (pressed || avatarSaving || !avatarSelection) && styles.pressed,
                  (!avatarSelection || avatarSaving) && styles.primaryButtonDisabled,
                ]}
              >
                {avatarSaving ? (
                  <LoaderCircle color={durianTheme.colors.mossDark} size={18} />
                ) : (
                  <Save color={durianTheme.colors.mossDark} size={18} />
                )}
                <Text style={styles.primaryButtonText}>
                  {avatarSaving ? "Đang tải lên..." : "Tải ảnh lên"}
                </Text>
              </Pressable>

              <Pressable
                disabled={!profile.avatarUrl || avatarSaving}
                onPress={removeAvatar}
                style={({ pressed }) => [
                  styles.dangerButton,
                  (pressed || avatarSaving || !profile.avatarUrl) && styles.pressed,
                  (!profile.avatarUrl || avatarSaving) && styles.dangerButtonDisabled,
                ]}
              >
                <Trash2 color={durianTheme.colors.danger} size={18} />
                <Text style={styles.dangerButtonText}>Xoá ảnh</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <ShieldCheck color={durianTheme.colors.moss} size={20} />
            </View>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>Thông tin chỉ đọc</Text>
              <Text style={styles.sectionSubtitle}>
                Những trường này lấy trực tiếp từ backend và không thể chỉnh sửa tại đây.
              </Text>
            </View>
          </View>

          <View style={styles.readOnlyList}>
            <InfoRow label="Email" value={profile.email} icon={Mail} />
            <InfoRow label="Vai trò" value={profile.role} icon={ShieldCheck} />
            <InfoRow
              label="Trạng thái"
              value={formatAccountStatus(profile.accountStatus)}
              icon={BadgeCheck}
            />
            <InfoRow label="Ngày tạo" value={formatDateTime(profile.createdAt)} icon={CalendarDays} />
            <InfoRow label="Cập nhật gần nhất" value={formatDateTime(profile.updatedAt)} icon={RefreshCcw} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileField({
  editable,
  error,
  label,
  ...props
}: {
  editable: boolean;
  error?: string;
  label: string;
} & Omit<ComponentProps<typeof TextInput>, "editable">) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {editable ? (
        <TextInput
          {...props}
          editable
          placeholderTextColor={durianTheme.colors.mist}
          style={[styles.input, error ? styles.inputErrorBorder : null]}
        />
      ) : (
        <View style={styles.readOnlyBox}>
          <Text style={styles.readOnlyText}>{emptyValue(String(props.value ?? ""))}</Text>
        </View>
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ color: string; size: number }>;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Icon color={durianTheme.colors.moss} size={18} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.statValue}>
        {value}
      </Text>
    </View>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ color: string; size: number }>;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowLeft}>
        <View style={styles.infoIcon}>
          <Icon color={durianTheme.colors.moss} size={16} />
        </View>
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionNote: {
    color: durianTheme.colors.muted,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  actionRow: {
    alignItems: "flex-start",
    borderTopColor: durianTheme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
    marginTop: 8,
    paddingTop: 16,
  },
  avatarActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surfaceSecondary,
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: durianTheme.colors.moss,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
  },
  avatarActionButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surfaceSecondary,
    borderRadius: durianTheme.radius.sm,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatarActionButtonText: {
    color: durianTheme.colors.moss,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  avatarBadge: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderColor: durianTheme.colors.surface,
    borderRadius: 999,
    borderWidth: 2,
    bottom: 1,
    height: 30,
    justifyContent: "center",
    position: "absolute",
    right: 1,
    width: 30,
  },
  avatarEditor: {
    gap: 16,
  },
  avatarFrame: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 28,
    height: 86,
    justifyContent: "center",
    overflow: "hidden",
    width: 86,
  },
  avatarImage: { height: "100%", width: "100%" },
  avatarInitials: {
    color: durianTheme.colors.mossDark,
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  avatarPreviewCard: {
    alignItems: "center",
    backgroundColor: "#F8F6EB",
    borderRadius: 24,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  avatarPreviewCopy: { flex: 1, gap: 6 },
  avatarPreviewFrame: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 24,
    height: 88,
    justifyContent: "center",
    overflow: "hidden",
    width: 88,
  },
  avatarPreviewImage: { height: "100%", width: "100%" },
  avatarPreviewInitials: {
    color: durianTheme.colors.moss,
    fontSize: 28,
    fontWeight: "900",
  },
  avatarPreviewSubtitle: {
    color: durianTheme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  avatarPreviewTitle: {
    color: durianTheme.colors.ink,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 21,
  },
  avatarPrimaryButton: {
    flexGrow: 1,
  },
  avatarWrap: { alignItems: "center", justifyContent: "center" },
  bioBox: {
    backgroundColor: "#F8F6EB",
    borderColor: "#E6E0C7",
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 104,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bioText: {
    color: durianTheme.colors.ink,
    fontSize: 13,
    lineHeight: 20,
  },
  content: {
    gap: 14,
    paddingBottom: 36,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  dangerButton: {
    alignItems: "center",
    backgroundColor: "#FFF5F3",
    borderColor: "#F0C2BA",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dangerButtonDisabled: {
    opacity: 0.55,
  },
  dangerButtonText: {
    color: durianTheme.colors.danger,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  emptyStateCard: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 28,
    gap: 12,
    maxWidth: 480,
    padding: 22,
    width: "100%",
  },
  emptyStateIcon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 20,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  emptyStateMessage: {
    color: durianTheme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  emptyStateTitle: {
    color: durianTheme.colors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
    textAlign: "center",
  },
  emptyStateWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  errorText: {
    color: durianTheme.colors.danger,
    fontSize: 11,
    lineHeight: 16,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    color: durianTheme.colors.mossDark,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  fieldsGrid: {
    gap: 14,
    marginTop: 18,
  },
  ghostButton: {
    alignItems: "center",
    backgroundColor: "#FFFDF7",
    borderColor: "#E3DDC5",
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  ghostButtonText: {
    color: durianTheme.colors.moss,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  heroBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  heroCard: {
    backgroundColor: durianTheme.colors.moss,
    borderRadius: 28,
    gap: 18,
    padding: 18,
  },
  heroCopy: { flex: 1, gap: 6 },
  heroEmail: {
    color: "#DDE9E1",
    fontSize: 12,
    lineHeight: 18,
  },
  heroEyebrow: {
    color: durianTheme.colors.durianYellow,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  heroName: {
    color: durianTheme.colors.white,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  heroTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  inlineError: {
    backgroundColor: "#FFF5F3",
    borderColor: "#F0C2BA",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inlineErrorText: {
    color: durianTheme.colors.danger,
    fontSize: 12,
    lineHeight: 18,
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
  inputErrorBorder: {
    borderColor: durianTheme.colors.danger,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: durianTheme.colors.mossDark,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  readOnlyBox: {
    backgroundColor: "#FAF8EF",
    borderColor: "#E7E1CF",
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyList: {
    gap: 10,
  },
  infoRow: {
    alignItems: "center",
    backgroundColor: "#F8F6EB",
    borderColor: "#E7E1CF",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoRowLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    flexShrink: 1,
  },
  infoIcon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 12,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  infoLabel: {
    color: durianTheme.colors.muted,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    textTransform: "uppercase",
  },
  infoValue: {
    color: durianTheme.colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    textAlign: "right",
  },
  readOnlyText: {
    color: durianTheme.colors.ink,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  safeArea: {
    backgroundColor: durianTheme.colors.canvas,
    flex: 1,
  },
  sectionCard: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 28,
    padding: 18,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  sectionHeaderCopy: { flex: 1, gap: 4 },
  sectionHeaderIcon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 18,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  sectionHeaderIconSoft: {
    alignItems: "center",
    backgroundColor: "#FBF0CD",
    borderRadius: 18,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  sectionSubtitle: {
    color: durianTheme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionTitle: {
    color: durianTheme.colors.ink,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 23,
  },
  segmentButton: {
    alignItems: "center",
    backgroundColor: "#FAF8EF",
    borderColor: "#E3DDC5",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  segmentButtonActive: {
    backgroundColor: durianTheme.colors.moss,
    borderColor: durianTheme.colors.moss,
  },
  segmentButtonText: {
    color: durianTheme.colors.moss,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  segmentButtonTextActive: {
    color: durianTheme.colors.white,
  },
  segmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skeletonAvatar: {
    backgroundColor: "#DCD7C1",
    borderRadius: 28,
    height: 92,
    width: 92,
  },
  skeletonCard: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 28,
    gap: 16,
    padding: 18,
  },
  skeletonField: {
    backgroundColor: "#EEE8D4",
    borderRadius: 18,
    height: 94,
  },
  skeletonFieldsGrid: {
    gap: 12,
  },
  skeletonHero: {
    backgroundColor: durianTheme.colors.moss,
    borderRadius: 28,
    gap: 18,
    padding: 18,
  },
  skeletonHeroCopy: {
    flex: 1,
    gap: 10,
  },
  skeletonHeroTop: {
    flexDirection: "row",
    gap: 14,
  },
  skeletonLineLong: {
    backgroundColor: "#597865",
    borderRadius: 999,
    height: 18,
    width: "76%",
  },
  skeletonLineMedium: {
    backgroundColor: "#5C7A66",
    borderRadius: 999,
    height: 14,
    width: "62%",
  },
  skeletonLineShort: {
    backgroundColor: "#688575",
    borderRadius: 999,
    height: 12,
    width: "42%",
  },
  skeletonSectionHeader: {
    backgroundColor: "#EEE8D4",
    borderRadius: 18,
    height: 24,
    width: "60%",
  },
  skeletonStatCard: {
    backgroundColor: "#4D735E",
    borderRadius: 20,
    flex: 1,
    minHeight: 80,
  },
  skeletonStatsRow: {
    flexDirection: "row",
    gap: 10,
  },
  skeletonWrap: {
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statCard: {
    backgroundColor: "#F8F6EB",
    borderColor: "#E7E1CF",
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    minWidth: 100,
    padding: 14,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statIcon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 14,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  statLabel: {
    color: durianTheme.colors.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  statValue: {
    color: durianTheme.colors.ink,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  statusPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusPillSoft: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 999,
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusPillSoftText: {
    color: durianTheme.colors.mossDark,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
  },
  statusPillText: {
    color: durianTheme.colors.white,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
  },
  toast: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toastError: {
    backgroundColor: "#FFF5F3",
    borderColor: "#F0C2BA",
    borderWidth: 1,
  },
  toastErrorText: {
    color: "#A53C2F",
  },
  toastSuccess: {
    backgroundColor: "#EEF7E9",
    borderColor: "#CDE3C2",
    borderWidth: 1,
  },
  toastSuccessText: {
    color: durianTheme.colors.moss,
  },
  toastText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  uploadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  uploadingText: {
    color: durianTheme.colors.moss,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  helperText: {
    color: durianTheme.colors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  textArea: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: "#E3DDC5",
    borderRadius: 18,
    borderWidth: 1,
    color: durianTheme.colors.ink,
    fontSize: 14,
    minHeight: 118,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
