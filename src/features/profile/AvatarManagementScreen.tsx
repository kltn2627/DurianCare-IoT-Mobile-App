import * as ImagePicker from "expo-image-picker";
import { Camera, Image as ImageIcon, LoaderCircle, RefreshCcw, Save, Trash2, UserRound } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

import { profileClient, ProfileApiError } from "./profileApi";
import type { AvatarUploadFile, ProfileRecord } from "./profileTypes";

type AvatarSelection = {
  name: string;
  type: string;
  uri: string;
};

type ToastState = { kind: "success" | "error"; message: string } | null;

function buildAvatarSelection(asset: ImagePicker.ImagePickerAsset): AvatarSelection {
  const mimeType = asset.mimeType ?? inferMimeType(asset.uri);
  return {
    name: asset.fileName ?? `avatar-${Date.now()}.${mimeType === "image/png" ? "png" : "jpg"}`,
    type: mimeType,
    uri: asset.uri,
  };
}

function inferMimeType(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  return "image/jpeg";
}

function isAvatarSelectionValid(file: AvatarUploadFile) {
  return ["image/jpeg", "image/png"].includes(file.type);
}

function friendlyMessage(input: { message?: string; status?: number } | null | undefined, fallback: string) {
  if (input?.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (input?.status === 404) return "Không tìm thấy hồ sơ cá nhân.";
  if (input?.status === 503) return "Dịch vụ lưu ảnh đang tạm thời gián đoạn.";
  return input?.message?.trim() || fallback;
}

export function AvatarManagementScreen() {
  const { applyProfileSnapshot, refreshProfile, session } = useSession();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarSelection, setAvatarSelection] = useState<AvatarSelection | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentAvatar = avatarPreview ?? profile?.avatarUrl ?? session?.user.avatarUrl ?? null;
  const currentInitials = useMemo(() => {
    const source = profile?.fullName || session?.user.name || "DC";
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "DC";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [profile?.fullName, session?.user.name]);

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
      if (session?.user.id === nextProfile.userId) {
        await applyProfileSnapshot(nextProfile);
      }
    } catch (cause) {
      showToast(
        "error",
        friendlyMessage(
          cause instanceof ProfileApiError ? { message: cause.message, status: cause.status } : null,
          "Không thể tải hồ sơ cá nhân.",
        ),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applyProfileSnapshot, session?.user.id, showToast]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => () => clearToast(), [clearToast]);

  const refreshContent = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    await refreshProfile();
  }, [loadProfile, refreshProfile]);

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

    setSaving(true);
    try {
      const result = await profileClient.uploadAvatar(avatarSelection);
      const nextProfile = {
        ...profile,
        avatarUrl: result.avatarUrl,
      };
      setProfile(nextProfile);
      setAvatarSelection(null);
      setAvatarPreview(null);
      await applyProfileSnapshot(nextProfile);
      showToast("success", "Ảnh đại diện đã được cập nhật.");
    } catch (cause) {
      showToast(
        "error",
        friendlyMessage(
          cause instanceof ProfileApiError ? { message: cause.message, status: cause.status } : null,
          "Không thể tải ảnh đại diện.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }, [applyProfileSnapshot, avatarSelection, profile, showToast]);

  const removeAvatar = useCallback(() => {
    if (!profile?.avatarUrl) return;
    void (async () => {
      setSaving(true);
      try {
        await profileClient.deleteAvatar();
        const nextProfile = { ...profile, avatarUrl: null };
        setProfile(nextProfile);
        setAvatarSelection(null);
        setAvatarPreview(null);
        await applyProfileSnapshot(nextProfile);
        showToast("success", "Ảnh đại diện đã được xóa.");
      } catch (cause) {
        showToast(
          "error",
          friendlyMessage(
            cause instanceof ProfileApiError ? { message: cause.message, status: cause.status } : null,
            "Không thể xóa ảnh đại diện.",
          ),
        );
      } finally {
        setSaving(false);
      }
    })();
  }, [applyProfileSnapshot, profile, showToast]);

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <DurianScreenHeader
          eyebrow="HỒ SƠ CÁ NHÂN"
          icon={UserRound}
          title="Quản lý avatar"
          subtitle="Đang tải dữ liệu từ backend..."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <DurianScreenHeader
        eyebrow="HỒ SƠ CÁ NHÂN"
        icon={UserRound}
        title="Quản lý avatar"
        subtitle="Chụp ảnh, chọn từ thư viện, xem trước và tải ảnh đại diện lên."
      />

      <ScrollView
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

        <View style={styles.previewCard}>
          <View style={styles.previewFrame}>
            {currentAvatar ? (
              <Image source={{ uri: currentAvatar }} resizeMode="cover" style={styles.previewImage} />
            ) : (
              <Text style={styles.previewInitials}>{currentInitials}</Text>
            )}
          </View>
          <View style={styles.previewCopy}>
            <Text style={styles.previewTitle}>{profile?.fullName || session?.user.name}</Text>
            <Text style={styles.previewSubtitle}>
              {avatarSelection ? "Ảnh đã sẵn sàng để tải lên." : "Ảnh hiện tại sẽ hiển thị trên menu và profile."}
            </Text>
            {saving ? (
              <View style={styles.loadingRow}>
                <LoaderCircle color={durianTheme.colors.moss} size={16} />
                <Text style={styles.loadingText}>Đang cập nhật avatar...</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.actionsCard}>
          <Pressable
            onPress={() => void pickAvatar("camera")}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          >
            <Camera color={durianTheme.colors.moss} size={18} />
            <Text style={styles.actionButtonText}>Chụp ảnh</Text>
          </Pressable>

          <Pressable
            onPress={() => void pickAvatar("library")}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          >
            <ImageIcon color={durianTheme.colors.moss} size={18} />
            <Text style={styles.actionButtonText}>Chọn từ thư viện</Text>
          </Pressable>

          <Pressable
            disabled={!avatarSelection || saving}
            onPress={() => void uploadAvatar()}
            style={({ pressed }) => [
              styles.primaryButton,
              (!avatarSelection || saving) && styles.disabled,
              pressed && avatarSelection && !saving && styles.pressed,
            ]}
          >
            {saving ? <LoaderCircle color={durianTheme.colors.mossDark} size={18} /> : <Save color={durianTheme.colors.mossDark} size={18} />}
            <Text style={styles.primaryButtonText}>{saving ? "Đang tải lên..." : "Tải lên avatar"}</Text>
          </Pressable>

          <Pressable
            disabled={!profile?.avatarUrl || saving}
            onPress={removeAvatar}
            style={({ pressed }) => [
              styles.dangerButton,
              (!profile?.avatarUrl || saving) && styles.disabled,
              pressed && profile?.avatarUrl && !saving && styles.pressed,
            ]}
          >
            <Trash2 color={durianTheme.colors.danger} size={18} />
            <Text style={styles.dangerButtonText}>Xóa avatar</Text>
          </Pressable>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Lưu ý</Text>
          <Text style={styles.noteText}>
            Ứng dụng chỉ chấp nhận ảnh JPEG hoặc PNG. Sau khi upload thành công, hồ sơ sẽ được đồng bộ lại ngay.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    backgroundColor: "#F7F9F4",
    borderColor: "#D9E3DB",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  actionButtonText: {
    color: durianTheme.colors.moss,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 18,
  },
  actionsCard: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 24,
    gap: 10,
    padding: 16,
  },
  content: { gap: 14, padding: 18, paddingBottom: 44 },
  dangerButton: {
    alignItems: "center",
    backgroundColor: "#FCE8E5",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F0C2BA",
    flexDirection: "row",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  dangerButtonText: {
    color: durianTheme.colors.danger,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 18,
  },
  disabled: { opacity: 0.45 },
  loadingRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  loadingText: {
    color: durianTheme.colors.moss,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  noteCard: {
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 20,
    gap: 6,
    padding: 16,
  },
  noteText: {
    color: durianTheme.colors.moss,
    fontSize: 12,
    lineHeight: 18,
  },
  noteTitle: {
    color: durianTheme.colors.mossDark,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  previewCard: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 24,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  previewCopy: { flex: 1, gap: 6 },
  previewFrame: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 24,
    height: 88,
    justifyContent: "center",
    overflow: "hidden",
    width: 88,
  },
  previewImage: { height: "100%", width: "100%" },
  previewInitials: {
    color: durianTheme.colors.moss,
    fontSize: 28,
    fontWeight: "900",
  },
  previewSubtitle: {
    color: durianTheme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  previewTitle: {
    color: durianTheme.colors.ink,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 46,
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
  toast: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toastError: { backgroundColor: "#FFF5F3", borderColor: "#F0C2BA", borderWidth: 1 },
  toastErrorText: { color: "#A53C2F" },
  toastSuccess: { backgroundColor: "#EEF7E9", borderColor: "#CDE3C2", borderWidth: 1 },
  toastSuccessText: { color: durianTheme.colors.moss },
  toastText: { flex: 1, fontSize: 12, fontWeight: "800", lineHeight: 17 },
});
