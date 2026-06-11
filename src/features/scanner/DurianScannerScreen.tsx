import { CameraView } from "expo-camera";
import {
  Camera,
  CheckCircle2,
  Focus,
  ImagePlus,
  MessageCircleWarning,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Server,
  ShieldCheck,
  WifiOff,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  LayoutAnimation,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { durianTheme } from "@/src/theme/durianTheme";
import { useWorkspace } from "@/src/workspace/WorkspaceContext";

import { useDurianDiseaseCamera } from "./useDurianDiseaseCamera";

export function DurianScannerScreen() {
  const navigation = useDurianSafeNavigation();
  const { pushScanAlert } = useWorkspace();
  const {
    cameraRef,
    captureAndAnalyze,
    errorMessage,
    hasPermission,
    isBusy,
    permission,
    phase,
    photo,
    prediction,
    requestPermission,
    reset,
    retryAnalysis,
  } = useDurianDiseaseCamera();
  const [wasPushed, setWasPushed] = useState(false);

  useEffect(
    function animateStateChange() {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    },
    [phase],
  );

  function handleReset() {
    setWasPushed(false);
    reset();
  }

  function handlePushToChat() {
    if (!prediction || wasPushed) return;
    pushScanAlert(prediction.disease.name, prediction.confidence);
    setWasPushed(true);
    navigation.push("/(main)/chat");
  }

  const boundingBoxStyle = prediction
    ? {
        height: `${prediction.boundingBox.height}%` as `${number}%`,
        left: `${prediction.boundingBox.left}%` as `${number}%`,
        top: `${prediction.boundingBox.top}%` as `${number}%`,
        width: `${prediction.boundingBox.width}%` as `${number}%`,
      }
    : undefined;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>DURIANCARE VISION</Text>
            <Text style={styles.title}>Chẩn đoán lá bằng AI</Text>
            <Text style={styles.subtitle}>
              Chụp rõ một lá sầu riêng. Ảnh sẽ được mã hóa multipart và gửi đến FastAPI để
              phân tích.
            </Text>
          </View>
          <View style={[styles.statusChip, isBusy && styles.statusChipBusy]}>
            {isBusy ? (
              <ActivityIndicator color={durianTheme.colors.moss} size="small" />
            ) : (
              <Server color={durianTheme.colors.moss} size={16} />
            )}
            <Text style={styles.statusText}>{isBusy ? "Đang gửi" : "FastAPI"}</Text>
          </View>
        </View>

        <View style={styles.cameraCard}>
          {photo ? (
            <Image source={{ uri: photo.uri }} resizeMode="cover" style={styles.camera} />
          ) : hasPermission ? (
            <CameraView ref={cameraRef} facing="back" mode="picture" style={styles.camera} />
          ) : (
            <PermissionState
              canAskAgain={permission?.canAskAgain !== false}
              onRequestPermission={requestPermission}
            />
          )}

          {hasPermission && !photo ? (
            <>
              <View pointerEvents="none" style={styles.focusFrame}>
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
                <Focus color={durianTheme.colors.durianYellow} size={32} />
              </View>
              <View pointerEvents="none" style={styles.cameraHint}>
                <ScanLine color={durianTheme.colors.mossDark} size={18} />
                <Text style={styles.cameraHintText}>Giữ lá nằm trọn trong khung</Text>
              </View>
            </>
          ) : null}

          {photo && prediction && boundingBoxStyle ? (
            <View pointerEvents="none" style={[styles.detectionBox, boundingBoxStyle]}>
              <Text numberOfLines={1} style={styles.detectionLabel}>
                {prediction.disease.code} · {prediction.confidence}%
              </Text>
            </View>
          ) : null}

          {isBusy ? (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingIcon}>
                <ActivityIndicator color={durianTheme.colors.mossDark} size="large" />
              </View>
              <Text style={styles.loadingTitle}>
                {phase === "capturing" ? "Đang xử lý ảnh chụp" : "AI đang đọc tổn thương"}
              </Text>
              <Text style={styles.loadingText}>
                Đang truyền ảnh an toàn đến `/api/v1/predict-disease`
              </Text>
            </View>
          ) : null}

          <View pointerEvents="none" style={styles.securityBadge}>
            <ShieldCheck color={durianTheme.colors.white} size={15} />
            <Text style={styles.securityText}>Ảnh chỉ dùng cho lần chẩn đoán này</Text>
          </View>
        </View>

        {!photo ? (
          <PrimaryButton
            disabled={!hasPermission || isBusy}
            icon={Camera}
            label="Chụp ảnh và phân tích"
            onPress={captureAndAnalyze}
          />
        ) : (
          <View style={styles.actionRow}>
            <SecondaryButton icon={RotateCcw} label="Chụp lại" onPress={handleReset} />
            {phase === "error" ? (
              <PrimaryButton
                compact
                icon={RefreshCw}
                label="Gửi lại"
                onPress={retryAnalysis}
              />
            ) : null}
          </View>
        )}

        {errorMessage ? (
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <WifiOff color={durianTheme.colors.danger} size={22} />
            </View>
            <View style={styles.errorCopy}>
              <Text style={styles.errorTitle}>Chưa kết nối được dịch vụ AI</Text>
              <Text style={styles.errorMessage}>{errorMessage}</Text>
            </View>
          </View>
        ) : null}

        {prediction ? (
          <View style={styles.resultCard}>
            <View style={styles.resultHeading}>
              <View style={styles.resultIcon}>
                <CheckCircle2 color={durianTheme.colors.moss} size={25} />
              </View>
              <View style={styles.resultTitleGroup}>
                <Text style={styles.resultKicker}>KẾT QUẢ NHẬN DIỆN</Text>
                <Text style={styles.resultTitle}>{prediction.disease.name}</Text>
              </View>
              <View style={styles.confidenceChip}>
                <Text style={styles.confidence}>{prediction.confidence}%</Text>
              </View>
            </View>

            <View style={styles.resultDivider} />
            <Text style={styles.code}>{prediction.disease.code}</Text>
            <Text style={styles.resultNote}>{prediction.disease.note}</Text>
            {prediction.inferenceTimeMs !== undefined ? (
              <Text style={styles.inferenceTime}>
                FastAPI xử lý trong {Math.round(prediction.inferenceTimeMs)} ms
              </Text>
            ) : null}

            <Pressable
              disabled={wasPushed}
              hitSlop={6}
              onPress={handlePushToChat}
              style={({ pressed }) => [
                styles.chatButton,
                wasPushed && styles.disabledButton,
                pressed && styles.pressedButton,
              ]}
            >
              <MessageCircleWarning color={durianTheme.colors.white} size={20} />
              <Text style={styles.chatButtonText}>
                {wasPushed ? "Đã gửi cảnh báo" : "Đẩy cảnh báo vào khung chat"}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function PermissionState({
  canAskAgain,
  onRequestPermission,
}: {
  canAskAgain: boolean;
  onRequestPermission: () => Promise<unknown>;
}) {
  return (
    <View style={styles.permissionState}>
      <View style={styles.permissionIcon}>
        <ImagePlus color={durianTheme.colors.durianYellow} size={34} />
      </View>
      <Text style={styles.permissionTitle}>Cần quyền truy cập camera</Text>
      <Text style={styles.permissionCopy}>
        {canAskAgain
          ? "DurianCare cần camera sau để chụp bề mặt lá và gửi ảnh tới dịch vụ chẩn đoán."
          : "Quyền camera đã bị từ chối. Hãy mở Cài đặt hệ thống để cấp lại quyền."}
      </Text>
      {canAskAgain ? (
        <Pressable
          hitSlop={8}
          onPress={onRequestPermission}
          style={({ pressed }) => [
            styles.permissionButton,
            pressed && styles.pressedButton,
          ]}
        >
          <Text style={styles.permissionButtonText}>Cho phép camera</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PrimaryButton({
  compact = false,
  disabled = false,
  icon: Icon,
  label,
  onPress,
}: {
  compact?: boolean;
  disabled?: boolean;
  icon: typeof Camera;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        compact && styles.compactButton,
        disabled && styles.disabledButton,
        pressed && styles.pressedButton,
      ]}
    >
      <Icon color={durianTheme.colors.mossDark} size={21} />
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof Camera;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        pressed && styles.pressedButton,
      ]}
    >
      <Icon color={durianTheme.colors.moss} size={20} />
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: "row", gap: 12 },
  camera: { height: 430, width: "100%" },
  cameraCard: {
    backgroundColor: durianTheme.colors.mossDark,
    borderRadius: 28,
    elevation: 8,
    minHeight: 430,
    overflow: "hidden",
    shadowColor: durianTheme.colors.mossDark,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  cameraHint: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: durianTheme.radius.pill,
    bottom: 52,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    position: "absolute",
  },
  cameraHintText: {
    color: durianTheme.colors.mossDark,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
  },
  chatButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: 16,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 16,
  },
  chatButtonText: {
    color: durianTheme.colors.white,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },
  code: {
    color: durianTheme.colors.moss,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  compactButton: { flex: 1 },
  confidence: {
    color: durianTheme.colors.mossDark,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22,
  },
  confidenceChip: {
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: durianTheme.radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  content: { gap: 16, padding: 18, paddingBottom: 44 },
  corner: {
    borderColor: durianTheme.colors.durianYellow,
    height: 32,
    position: "absolute",
    width: 32,
  },
  cornerBottomLeft: { borderBottomWidth: 4, borderLeftWidth: 4, bottom: -2, left: -2 },
  cornerBottomRight: { borderBottomWidth: 4, borderRightWidth: 4, bottom: -2, right: -2 },
  cornerTopLeft: { borderLeftWidth: 4, borderTopWidth: 4, left: -2, top: -2 },
  cornerTopRight: { borderRightWidth: 4, borderTopWidth: 4, right: -2, top: -2 },
  detectionBox: {
    borderColor: durianTheme.colors.durianYellow,
    borderRadius: 12,
    borderWidth: 3,
    position: "absolute",
  },
  detectionLabel: {
    alignSelf: "flex-start",
    backgroundColor: durianTheme.colors.durianYellow,
    color: durianTheme.colors.mossDark,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 15,
    maxWidth: 220,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  disabledButton: { opacity: 0.45 },
  errorCard: {
    alignItems: "flex-start",
    backgroundColor: "#FFF1EF",
    borderColor: "#F2C2B9",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 15,
  },
  errorCopy: { flex: 1, gap: 3 },
  errorIcon: {
    alignItems: "center",
    backgroundColor: "#FFE0DA",
    borderRadius: 13,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  errorMessage: {
    color: "#7D443A",
    fontSize: 12,
    lineHeight: 18,
  },
  errorTitle: {
    color: durianTheme.colors.danger,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },
  eyebrow: {
    color: durianTheme.colors.moss,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    lineHeight: 15,
  },
  focusFrame: {
    alignItems: "center",
    borderColor: "rgba(238, 210, 105, 0.45)",
    borderRadius: 22,
    borderWidth: 1,
    height: "58%",
    justifyContent: "center",
    left: "12%",
    position: "absolute",
    top: "15%",
    width: "76%",
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  headerCopy: { flex: 1 },
  inferenceTime: {
    color: durianTheme.colors.muted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  loadingIcon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 30,
    height: 60,
    justifyContent: "center",
    width: 60,
  },
  loadingOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(30, 61, 45, 0.88)",
    bottom: 0,
    gap: 9,
    justifyContent: "center",
    left: 0,
    padding: 32,
    position: "absolute",
    right: 0,
    top: 0,
  },
  loadingText: {
    color: durianTheme.colors.mist,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  loadingTitle: {
    color: durianTheme.colors.white,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 23,
  },
  permissionButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 22,
  },
  permissionButtonText: {
    color: durianTheme.colors.mossDark,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },
  permissionCopy: {
    color: durianTheme.colors.mist,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 290,
    textAlign: "center",
  },
  permissionIcon: {
    alignItems: "center",
    backgroundColor: "rgba(238, 210, 105, 0.12)",
    borderRadius: 24,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  permissionState: {
    alignItems: "center",
    gap: 11,
    height: 430,
    justifyContent: "center",
    padding: 34,
  },
  permissionTitle: {
    color: durianTheme.colors.white,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 25,
  },
  pressedButton: { transform: [{ scale: 0.98 }] },
  primaryButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 18,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: durianTheme.colors.mossDark,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 21,
  },
  resultCard: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.durianYellow,
    borderRadius: 22,
    borderWidth: 2,
    gap: 11,
    padding: 18,
  },
  resultDivider: { backgroundColor: durianTheme.colors.mossSoft, height: 1 },
  resultHeading: { alignItems: "center", flexDirection: "row", gap: 10 },
  resultIcon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 14,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  resultKicker: {
    color: durianTheme.colors.muted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
    lineHeight: 14,
  },
  resultNote: {
    color: durianTheme.colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  resultTitle: {
    color: durianTheme.colors.ink,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 26,
  },
  resultTitleGroup: { flex: 1 },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.mossSoft,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: durianTheme.colors.moss,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },
  securityBadge: {
    alignItems: "center",
    backgroundColor: "rgba(30, 61, 45, 0.78)",
    borderRadius: durianTheme.radius.pill,
    flexDirection: "row",
    gap: 6,
    left: 12,
    minHeight: 32,
    paddingHorizontal: 10,
    position: "absolute",
    top: 12,
  },
  securityText: {
    color: durianTheme.colors.white,
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 13,
  },
  statusChip: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: durianTheme.radius.pill,
    flexDirection: "row",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 11,
  },
  statusChipBusy: { backgroundColor: "#F7EAB5" },
  statusText: {
    color: durianTheme.colors.moss,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 14,
  },
  subtitle: {
    color: durianTheme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
  title: {
    color: durianTheme.colors.ink,
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -0.7,
    lineHeight: 34,
    marginTop: 2,
  },
});
