import { CameraView, useCameraPermissions } from "expo-camera";
import {
  Camera,
  CheckCircle2,
  Focus,
  ImagePlus,
  MessageCircleWarning,
  RotateCcw,
  ScanLine,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { durianTheme } from "@/src/theme/durianTheme";
import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { useWorkspace } from "@/src/workspace/WorkspaceContext";

import { durianDiseaseCatalog, type DurianDisease } from "./diseaseCatalog";

type DetectionBox = {
  height: `${number}%`;
  left: `${number}%`;
  top: `${number}%`;
  width: `${number}%`;
};

type ScanResult = {
  confidence: number;
  disease: DurianDisease;
};

const detectionBoxes: DetectionBox[] = [
  { height: "31%", left: "14%", top: "21%", width: "42%" },
  { height: "28%", left: "45%", top: "37%", width: "38%" },
  { height: "35%", left: "27%", top: "14%", width: "46%" },
  { height: "26%", left: "19%", top: "49%", width: "35%" },
];

export function DurianScannerScreen() {
  const navigation = useDurianSafeNavigation();
  const { pushScanAlert } = useWorkspace();
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [detectionBox, setDetectionBox] = useState<DetectionBox>(detectionBoxes[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [wasPushed, setWasPushed] = useState(false);

  useEffect(function clearScanTimerOnUnmount() {
    return function clearTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleCaptureAndScan() {
    if (isScanning || !permission?.granted) return;

    setIsScanning(true);
    setResult(null);
    setWasPushed(false);

    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.75 });
      if (photo?.uri) setPhotoUri(photo.uri);
    } finally {
      timerRef.current = setTimeout(function finishMockInference() {
        const randomIndex = Math.floor(Math.random() * durianDiseaseCatalog.length);
        setResult({
          confidence: Math.floor(Math.random() * 15) + 82,
          disease: durianDiseaseCatalog[randomIndex],
        });
        setDetectionBox(detectionBoxes[randomIndex]);
        setIsScanning(false);
      }, 1200);
    }
  }

  function handleResetScan() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhotoUri(null);
    setResult(null);
    setIsScanning(false);
    setWasPushed(false);
  }

  function handlePushToChat() {
    if (!result || wasPushed) return;
    pushScanAlert(result.disease.name, result.confidence);
    setWasPushed(true);
    navigation.push("/(main)/chat");
  }

  const hasCameraPermission = permission?.granted === true;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>AI INFERENCE SERVICE • MOCK</Text>
            <Text style={styles.title}>Quét bệnh sầu riêng</Text>
          </View>
          <View style={styles.statusChip}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Offline</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Đặt lá trong vùng lấy nét. Ảnh và kết quả hiện chỉ được xử lý bằng state cục bộ.
        </Text>

        <View style={styles.cameraCard}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} resizeMode="cover" style={styles.camera} />
          ) : hasCameraPermission ? (
            <CameraView ref={cameraRef} facing="back" style={styles.camera} />
          ) : (
            <View style={styles.permissionState}>
              <ImagePlus color={durianTheme.colors.durianYellow} size={42} />
              <Text style={styles.permissionTitle}>Cần quyền truy cập camera</Text>
              <Text style={styles.permissionCopy}>
                DurianCare dùng camera để chụp lá, không tải ảnh lên máy chủ.
              </Text>
              <Pressable onPress={requestPermission} style={styles.permissionButton}>
                <Text style={styles.permissionButtonText}>Cho phép camera</Text>
              </Pressable>
            </View>
          )}

          {hasCameraPermission && !photoUri ? (
            <>
              <View pointerEvents="none" style={styles.focusFrame}>
                <Focus color={durianTheme.colors.durianYellow} size={36} />
              </View>
              <View style={styles.cameraHint}>
                <ScanLine color={durianTheme.colors.mossDark} size={18} />
                <Text style={styles.cameraHintText}>Giữ lá nằm trọn trong khung</Text>
              </View>
            </>
          ) : null}

          {photoUri && (isScanning || result) ? (
            <View pointerEvents="none" style={[styles.detectionBox, detectionBox]}>
              <Text style={styles.detectionLabel}>
                {isScanning ? "Đang định vị tổn thương..." : `${result?.disease.code} • ${result?.confidence}%`}
              </Text>
            </View>
          ) : null}

          {isScanning ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={durianTheme.colors.durianYellow} size="large" />
              <Text style={styles.loadingTitle}>AI đang phân tích ảnh lá</Text>
              <Text style={styles.loadingText}>Mô phỏng inference trong 1,2 giây...</Text>
            </View>
          ) : null}
        </View>

        <Pressable
          disabled={!hasCameraPermission || isScanning}
          onPress={photoUri ? handleResetScan : handleCaptureAndScan}
          style={({ pressed }) => [
            styles.scanButton,
            (!hasCameraPermission || isScanning) && styles.disabledButton,
            pressed && styles.pressedButton,
          ]}
        >
          {photoUri ? (
            <RotateCcw color={durianTheme.colors.mossDark} size={22} />
          ) : (
            <Camera color={durianTheme.colors.mossDark} size={22} />
          )}
          <Text style={styles.scanButtonText}>
            {photoUri ? "Chụp lại ảnh khác" : "Chụp ảnh phân tích"}
          </Text>
        </Pressable>

        {result ? (
          <View style={styles.resultCard}>
            <View style={styles.resultHeading}>
              <CheckCircle2 color={durianTheme.colors.moss} size={26} />
              <View style={styles.resultTitleGroup}>
                <Text style={styles.resultKicker}>KẾT QUẢ AI MÔ PHỎNG</Text>
                <Text style={styles.resultTitle}>{result.disease.name}</Text>
              </View>
              <Text style={styles.confidence}>{result.confidence}%</Text>
            </View>
            <Text style={styles.code}>{result.disease.code}</Text>
            <Text style={styles.resultNote}>{result.disease.note}</Text>
            <Pressable
              disabled={wasPushed}
              onPress={handlePushToChat}
              style={[styles.chatButton, wasPushed && styles.disabledButton]}
            >
              <MessageCircleWarning color={durianTheme.colors.white} size={19} />
              <Text style={styles.chatButtonText}>
                {wasPushed ? "Đã đẩy cảnh báo" : "Đẩy cảnh báo vào khung chat"}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  camera: { height: 390, width: "100%" },
  cameraCard: {
    backgroundColor: durianTheme.colors.mossDark,
    borderRadius: durianTheme.radius.lg,
    elevation: 7,
    minHeight: 390,
    overflow: "hidden",
  },
  cameraHint: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: durianTheme.radius.pill,
    bottom: 18,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    position: "absolute",
  },
  cameraHintText: { color: durianTheme.colors.mossDark, fontSize: 12, fontWeight: "900" },
  chatButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 4,
    paddingVertical: 13,
  },
  chatButtonText: { color: durianTheme.colors.white, fontSize: 13, fontWeight: "900" },
  code: { color: durianTheme.colors.moss, fontSize: 13, fontWeight: "800" },
  confidence: { color: durianTheme.colors.moss, fontSize: 20, fontWeight: "900" },
  content: { gap: durianTheme.spacing.lg, padding: durianTheme.spacing.lg, paddingBottom: 42 },
  detectionBox: {
    borderColor: durianTheme.colors.durianYellow,
    borderRadius: durianTheme.radius.sm,
    borderWidth: 3,
    position: "absolute",
  },
  detectionLabel: {
    alignSelf: "flex-start",
    backgroundColor: durianTheme.colors.durianYellow,
    color: durianTheme.colors.mossDark,
    fontSize: 10,
    fontWeight: "900",
    maxWidth: 230,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  disabledButton: { opacity: 0.48 },
  eyebrow: { color: durianTheme.colors.moss, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  focusFrame: {
    alignItems: "center",
    borderColor: durianTheme.colors.durianYellow,
    borderRadius: durianTheme.radius.md,
    borderWidth: 2,
    height: "58%",
    justifyContent: "center",
    left: "12%",
    position: "absolute",
    top: "16%",
    width: "76%",
  },
  header: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  loadingOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(30, 61, 45, 0.84)",
    bottom: 0,
    gap: 8,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  loadingText: { color: durianTheme.colors.mist, fontSize: 12 },
  loadingTitle: { color: durianTheme.colors.white, fontSize: 16, fontWeight: "900" },
  permissionButton: {
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: durianTheme.radius.pill,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  permissionButtonText: { color: durianTheme.colors.mossDark, fontSize: 14, fontWeight: "900" },
  permissionCopy: { color: durianTheme.colors.mist, fontSize: 13, lineHeight: 20, textAlign: "center" },
  permissionState: { alignItems: "center", gap: 10, height: 390, justifyContent: "center", padding: 34 },
  permissionTitle: { color: durianTheme.colors.white, fontSize: 19, fontWeight: "900" },
  pressedButton: { transform: [{ scale: 0.98 }] },
  resultCard: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.durianYellow,
    borderRadius: durianTheme.radius.md,
    borderWidth: 2,
    gap: 10,
    padding: durianTheme.spacing.lg,
  },
  resultHeading: { alignItems: "center", flexDirection: "row", gap: 10 },
  resultKicker: { color: durianTheme.colors.muted, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  resultNote: { color: durianTheme.colors.muted, fontSize: 14, lineHeight: 21 },
  resultTitle: { color: durianTheme.colors.ink, fontSize: 20, fontWeight: "900" },
  resultTitleGroup: { flex: 1 },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  scanButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: durianTheme.radius.md,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 17,
  },
  scanButtonText: { color: durianTheme.colors.mossDark, fontSize: 16, fontWeight: "900" },
  statusChip: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: durianTheme.radius.pill,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  statusDot: { backgroundColor: durianTheme.colors.moss, borderRadius: 5, height: 8, width: 8 },
  statusText: { color: durianTheme.colors.moss, fontSize: 11, fontWeight: "900" },
  subtitle: { color: durianTheme.colors.muted, fontSize: 14, lineHeight: 21, marginTop: -10 },
  title: { color: durianTheme.colors.ink, fontSize: 28, fontWeight: "900", letterSpacing: -0.7, marginTop: 4 },
});
