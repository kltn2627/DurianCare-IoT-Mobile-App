import { CameraView, type CameraCapturedPicture, useCameraPermissions } from "expo-camera";
import { Camera, Check, RotateCcw, X } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { durianTheme } from "@/src/theme/durianTheme";

export function ChatCameraSheet({
  busy,
  onClose,
  onUsePhoto,
  visible,
}: {
  busy: boolean;
  onClose: () => void;
  onUsePhoto: (photo: CameraCapturedPicture) => Promise<void> | void;
  visible: boolean;
}) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<CameraCapturedPicture | null>(null);
  const [capturing, setCapturing] = useState(false);

  async function capture() {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const nextPhoto = await cameraRef.current.takePictureAsync({
        quality: 0.78,
        skipProcessing: false,
      });
      setPhoto(nextPhoto);
    } finally {
      setCapturing(false);
    }
  }

  function close() {
    if (busy) return;
    setPhoto(null);
    onClose();
  }

  async function usePhoto() {
    if (!photo || busy) return;
    await onUsePhoto(photo);
    setPhoto(null);
  }

  return (
    <Modal animationType="slide" onRequestClose={close} visible={visible}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Đóng camera"
            disabled={busy}
            hitSlop={10}
            onPress={close}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          >
            <X color={durianTheme.colors.white} size={23} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Ảnh hiện trạng lá</Text>
            <Text style={styles.subtitle}>Chụp rõ bề mặt lá và vùng tổn thương</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.preview}>
          {photo ? (
            <Image source={{ uri: photo.uri }} resizeMode="cover" style={styles.camera} />
          ) : permission?.granted ? (
            <CameraView ref={cameraRef} facing="back" mode="picture" style={styles.camera} />
          ) : (
            <View style={styles.permissionState}>
              <Camera color={durianTheme.colors.durianYellow} size={42} />
              <Text style={styles.permissionTitle}>Cần quyền camera</Text>
              <Text style={styles.permissionText}>
                Camera chỉ được mở khi bạn chủ động gửi ảnh vào kênh tư vấn.
              </Text>
              {permission?.canAskAgain !== false ? (
                <Pressable
                  onPress={requestPermission}
                  style={({ pressed }) => [styles.permissionButton, pressed && styles.pressed]}
                >
                  <Text style={styles.permissionButtonText}>Cấp quyền camera</Text>
                </Pressable>
              ) : null}
            </View>
          )}
          {busy ? (
            <View style={styles.busyOverlay}>
              <ActivityIndicator color={durianTheme.colors.durianYellow} size="large" />
              <Text style={styles.busyText}>Đang truyền ảnh...</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.controls}>
          {photo ? (
            <>
              <Pressable
                disabled={busy}
                onPress={() => setPhoto(null)}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <RotateCcw color={durianTheme.colors.moss} size={21} />
                <Text style={styles.secondaryText}>Chụp lại</Text>
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={usePhoto}
                style={({ pressed }) => [
                  styles.primaryButton,
                  busy && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Check color={durianTheme.colors.mossDark} size={21} />
                <Text style={styles.primaryText}>Dùng ảnh này</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              disabled={!permission?.granted || capturing}
              onPress={capture}
              style={({ pressed }) => [
                styles.captureButton,
                (!permission?.granted || capturing) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              {capturing ? (
                <ActivityIndicator color={durianTheme.colors.mossDark} />
              ) : (
                <Camera color={durianTheme.colors.mossDark} size={26} />
              )}
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  busyOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(30, 61, 45, 0.84)",
    bottom: 0,
    gap: 10,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  busyText: {
    color: durianTheme.colors.white,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },
  camera: { flex: 1, width: "100%" },
  captureButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderColor: durianTheme.colors.white,
    borderRadius: 34,
    borderWidth: 5,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  controls: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossDark,
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    minHeight: 100,
    padding: 16,
  },
  disabled: { opacity: 0.45 },
  header: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    flexDirection: "row",
    minHeight: 70,
    paddingHorizontal: 14,
  },
  headerButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 15,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerCopy: { flex: 1, paddingHorizontal: 10 },
  headerSpacer: { width: 44 },
  permissionButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 20,
  },
  permissionButtonText: {
    color: durianTheme.colors.mossDark,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },
  permissionState: {
    alignItems: "center",
    flex: 1,
    gap: 11,
    justifyContent: "center",
    padding: 30,
  },
  permissionText: {
    color: durianTheme.colors.mist,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  permissionTitle: {
    color: durianTheme.colors.white,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 25,
  },
  pressed: { opacity: 0.84, transform: [{ scale: 0.97 }] },
  preview: { backgroundColor: "#07140E", flex: 1, overflow: "hidden" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 17,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
  },
  primaryText: {
    color: durianTheme.colors.mossDark,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },
  safeArea: { backgroundColor: durianTheme.colors.moss, flex: 1 },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 17,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
  },
  secondaryText: {
    color: durianTheme.colors.moss,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },
  subtitle: {
    color: durianTheme.colors.mist,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
    textAlign: "center",
  },
  title: {
    color: durianTheme.colors.white,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
    textAlign: "center",
  },
});
