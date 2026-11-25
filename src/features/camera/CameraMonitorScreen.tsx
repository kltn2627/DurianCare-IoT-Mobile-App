import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Settings,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Href, useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { durianTheme } from "@/src/theme/durianTheme";
import {
  captureImageSource,
  captureNow,
  fetchCameraHistory,
  getCameraSchedule,
  listCameraDevices,
  updateCameraSchedule,
  cameraSnapshotSource,
  startCameraLive,
  waitForCameraCommand,
  type CameraCapture,
  type CameraDevice,
} from "@/src/lib/iotApi";
import { CAMERA_TONE_COLORS, cameraStatusView } from "./cameraStatus";

// ── Config ────────────────────────────────────────────────────────────────────

const PREVIEW_POLL = 8_000;
// Live view: the camera streams while the session is renewed; the newest frame is fetched this often.
const LIVE_FRAME_POLL = 350;
const LIVE_LOAD_TIMEOUT = 5_000;  // a frame request that never settles must not freeze the live view

// Auto-capture slots: same fixed daily times as the Web camera page.
const TIME_SLOTS = [
  { cron: "0 6 * * *",  label: "06:00" },
  { cron: "0 8 * * *",  label: "08:00" },
  { cron: "0 10 * * *", label: "10:00" },
  { cron: "0 12 * * *", label: "12:00" },
  { cron: "0 14 * * *", label: "14:00" },
  { cron: "0 16 * * *", label: "16:00" },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PhotoModal({ capture, onClose }: { capture: CameraCapture | null; onClose: () => void }) {
  if (!capture) return null;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{formatTime(capture.captured_at)}</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Đóng ảnh">
              <X color={durianTheme.colors.muted} size={20} />
            </Pressable>
          </View>
          <Image source={captureImageSource(capture.image_url)} style={styles.modalImage} resizeMode="contain" />
        </View>
      </View>
    </Modal>
  );
}

// Auto-capture schedule (no AI diagnosis on mobile): pick daily slots, save to the gateway.
function ScheduleCard({ deviceId }: { deviceId: string }) {
  const [enabled, setEnabled]   = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  // Saving replaces the whole schedule, so it stays blocked until the current one has been read.
  const [loaded, setLoaded]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const res = await getCameraSchedule(deviceId);
      const active = new Set(res.schedules.filter(s => s.enabled).map(s => s.cron_expression));
      setSelected(active);
      setEnabled(active.size > 0);
      setLoaded(true);
      setError(null);
    } catch {
      setError("Không tải được lịch chụp.");
    } finally {
      setLoading(false);
    }
  }, [deviceId]);
  useEffect(() => { void load(); }, [load]);

  const toggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    // First time on with nothing picked: pre-select every slot, like the Web page.
    if (next && selected.size === 0) setSelected(new Set(TIME_SLOTS.map(t => t.cron)));
  };
  const toggleSlot = (cron: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(cron)) next.delete(cron); else next.add(cron);
    return next;
  });

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = enabled
        ? TIME_SLOTS.filter(t => selected.has(t.cron)).map(t => ({ cron_expression: t.cron, label: t.label, enabled: true }))
        : [];
      await updateCameraSchedule(deviceId, payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3_000);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu lịch thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const chosen = TIME_SLOTS.filter(t => selected.has(t.cron)).map(t => t.label);
  return (
    <View style={styles.previewCard}>
      <View style={styles.scheduleHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <Clock color={durianTheme.colors.moss} size={18} />
          <Text style={styles.historyTitle}>Lịch chụp tự động</Text>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: enabled }}
          accessibilityLabel="Bật lịch chụp tự động"
          disabled={loading || !loaded}
          onPress={toggleEnabled}
          style={[styles.switchTrack, enabled && styles.switchTrackOn]}
        >
          <View style={[styles.switchThumb, enabled && styles.switchThumbOn]} />
        </Pressable>
      </View>
      {loading ? <ActivityIndicator color={durianTheme.colors.moss} /> : !loaded ? (
        <Pressable onPress={() => void load()} accessibilityRole="button" style={styles.errorBanner}>
          <AlertCircle color="#dc2626" size={14} />
          <Text style={styles.errorText}>{error ?? "Không tải được lịch chụp."} Bấm để thử lại.</Text>
        </Pressable>
      ) : (
        <>
          <Text style={styles.scheduleHint}>
            {enabled ? "Chọn giờ camera tự chụp mỗi ngày:" : "Đang tắt — camera chỉ chụp khi bạn bấm “Chụp hình ngay”."}
          </Text>
          {enabled && (
            <View style={styles.slotGrid}>
              {TIME_SLOTS.map(t => {
                const active = selected.has(t.cron);
                return (
                  <Pressable key={t.cron} onPress={() => toggleSlot(t.cron)}
                    accessibilityRole="checkbox" accessibilityState={{ checked: active }}
                    style={[styles.slot, active && styles.slotActive]}>
                    <Text style={[styles.slotText, active && styles.slotTextActive]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          {enabled && selected.size === 0 && <Text style={styles.errorText}>Chọn ít nhất một khung giờ.</Text>}
          <Pressable
            onPress={save}
            disabled={saving || !deviceId || (enabled && selected.size === 0)}
            style={({ pressed }) => [styles.captureBtn, pressed && styles.pressed,
              (saving || (enabled && selected.size === 0)) && styles.disabled]}
          >
            {saving
              ? <><Loader2 color="#fff" size={16} /><Text style={styles.captureBtnText}>Đang lưu...</Text></>
              : saved
                ? <><CheckCircle2 color="#fff" size={16} /><Text style={styles.captureBtnText}>Đã lưu lịch</Text></>
                : <Text style={styles.captureBtnText}>Lưu lịch chụp</Text>}
          </Pressable>
          {enabled && chosen.length > 0 && (
            <Text style={styles.scheduleHint}>Tự chụp lúc {chosen.join(" · ")} hằng ngày.</Text>
          )}
          {error && (
            <View style={styles.errorBanner}>
              <AlertCircle color="#dc2626" size={14} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function CameraMonitorScreen() {
  const [deviceId, setDeviceId] = useState("");
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const requestGeneration = useRef(0);
  // Two image slots: the next frame loads hidden and replaces the visible one only once it has loaded,
  // so fast refreshes never flash an empty box.
  const [slots, setSlots] = useState<{ a: number; b: number; front: "a" | "b" }>({ a: Date.now(), b: 0, front: "a" });
  const loadingSince = useRef<number | null>(null);
  const [snapshotError, setSnapshotError] = useState(false);
  const [liveOn, setLiveOn] = useState(false);
  const [liveFrameAt, setLiveFrameAt] = useState<number | null>(null);

  // Device status from camera registry (online/offline indicator)
  const [deviceInfo, setDeviceInfo] = useState<CameraDevice | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true, busy = false;
    const poll = async () => {
      if (busy) return;
      busy = true;
      try {
        const r = await listCameraDevices();
        if (!active) return;
        setDevices(r.devices);
        setRegistryError(null);
        setDeviceId(current => r.devices.some(row => row.device_id === current) ? current : r.devices[0]?.device_id ?? "");
      } catch { if (active) setRegistryError("Không tải được trạng thái camera."); }
      finally { busy = false; }
    };
    void poll();
    const timer = setInterval(poll, PREVIEW_POLL);
    return () => { active = false; clearInterval(timer); };
  }, []));
  useEffect(() => { setDeviceInfo(devices.find(row => row.device_id === deviceId) ?? null); }, [deviceId, devices]);
  const statusView = cameraStatusView(deviceInfo);

  const router = useRouter();

  const [captureStep, setCaptureStep]     = useState<"idle" | "capturing">("idle");
  const [captureError, setCaptureError]   = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    setCaptureStep("idle");
  }, [deviceId]));

  const [history, setHistory]       = useState<CameraCapture[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [enlarged, setEnlarged]     = useState<CameraCapture | null>(null);

  const endpointVersion = deviceInfo?.endpointVersion ?? "";

  // Load the next frame into the hidden slot (skipped while one is still loading).
  const nextFrame = useCallback(() => {
    const started = loadingSince.current;
    if (started !== null && Date.now() - started < LIVE_LOAD_TIMEOUT) return;
    loadingSince.current = Date.now();
    setSlots(s => s.front === "a" ? { ...s, b: Date.now() } : { ...s, a: Date.now() });
  }, []);
  const onSlotLoad = (slot: "a" | "b") => {
    loadingSince.current = null;
    setSnapshotError(false);
    setLiveFrameAt(Date.now());
    setSlots(s => s.front === slot ? s : { ...s, front: slot });
  };
  const onSlotError = (slot: "a" | "b") => {
    loadingSince.current = null;
    // A failed refresh keeps the last good frame; only an empty box shows the error.
    if (slot === slots.front) setSnapshotError(true);
  };

  // Live session (firmware >= 3.1.0): renewed while this screen is focused, so the camera stops streaming
  // shortly after the user leaves. Older firmware keeps the 8 s refresh.
  const liveCapable = deviceInfo?.deliveryMode === "PUSH" && (deviceInfo?.capabilities ?? []).includes("live")
    && statusView.canPreview && captureStep === "idle";
  useFocusEffect(useCallback(() => {
    if (!liveCapable || !deviceId) { setLiveOn(false); return; }
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const renew = async () => {
      try {
        const live = await startCameraLive(deviceId);
        if (!active) return;
        setLiveOn(live.supported);
        if (live.supported) timer = setTimeout(() => void renew(), live.renewAfterMs);
      } catch {
        if (!active) return;
        setLiveOn(false);
        timer = setTimeout(() => void renew(), 10_000);
      }
    };
    void renew();
    return () => { active = false; if (timer) clearTimeout(timer); setLiveOn(false); };
  }, [liveCapable, deviceId]));

  // Poll snapshots only while the screen is focused: fast during a live session, every 8 s otherwise.
  useFocusEffect(useCallback(() => {
    setSnapshotError(false);
    requestGeneration.current += 1;
    loadingSince.current = null;
    nextFrame();
    const timer = setInterval(nextFrame, liveOn ? LIVE_FRAME_POLL : PREVIEW_POLL);
    return () => { requestGeneration.current += 1; clearInterval(timer); };
  }, [deviceId, endpointVersion, liveOn, nextFrame]));
  const liveFresh = liveOn && liveFrameAt !== null && Date.now() - liveFrameAt < 5_000;

  const loadHistory = useCallback(async () => {
    const generation = requestGeneration.current;
    setHistLoading(true);
    try {
      if (!deviceId) { setHistory([]); return; }
      const res = await fetchCameraHistory({ device_id: deviceId, limit: 12 });
      if (generation !== requestGeneration.current) return;
      setHistory(res.data);
    } catch { /* non-critical */ }
    finally { setHistLoading(false); }
  }, [deviceId]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const handleCapture = async () => {
    const generation = requestGeneration.current;
    setCaptureStep("capturing");
    setCaptureError(null);
    try {
      const result = await captureNow(deviceId);
      let cap = result.kind === "capture" ? result.capture : null;
      if (result.kind === "queued") {
        // The camera picks the command up within ~5 s and uploads the photo; follow it until it arrives.
        const command = await waitForCameraCommand(deviceId, result.command.id,
          { isCancelled: () => generation !== requestGeneration.current });
        if (generation !== requestGeneration.current) return;
        if (command.status !== "COMPLETED" || !command.capture) {
          setCaptureError(command.status === "FAILED"
            ? `Camera không chụp được ảnh (${command.error ?? "lỗi không rõ"}).`
            : "Camera chưa gửi ảnh trong thời gian chờ (Wi-Fi yếu hoặc camera bận). Thử lại sau.");
          return;
        }
        cap = command.capture;
        nextFrame();
      }
      if (generation !== requestGeneration.current || !cap) return;
      setEnlarged(cap);
      void loadHistory();
    } catch (err) {
      setCaptureError(err instanceof Error ? err.message : "Chụp hình thất bại.");
    } finally {
      setCaptureStep("idle");
    }
  };

  const isCapturing = captureStep !== "idle";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DurianScreenHeader
          eyebrow="ESP32-CAM"
          icon={Camera}
          title="Camera IoT"
          subtitle="Xem camera trực tiếp và đặt lịch chụp tự động."
        />

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {devices.map(row => <Pressable key={row.device_id} onPress={() => setDeviceId(row.device_id)}
            accessibilityRole="button" accessibilityState={{ selected: row.device_id === deviceId }}>
            <Text>{row.device_id}</Text>
          </Pressable>)}
        </View>
        {registryError ? <Text accessibilityRole="alert">{registryError}</Text> : null}
        {/* Snapshot preview */}
        <View style={styles.previewCard}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={styles.cardLabel}>
              {liveFresh ? "Camera trực tiếp" : "Ảnh camera định kỳ"} · {deviceId || "Chưa có camera"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {liveFresh && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Trực tiếp</Text>
                </View>
              )}
              {deviceInfo != null && (
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 5,
                  paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99,
                  backgroundColor: CAMERA_TONE_COLORS[statusView.tone].bg,
                }}>
                  <View style={{
                    width: 6, height: 6, borderRadius: 3,
                    backgroundColor: CAMERA_TONE_COLORS[statusView.tone].dot,
                  }} />
                  <Text style={{ fontSize: 10, fontWeight: "700", color: CAMERA_TONE_COLORS[statusView.tone].text }}>
                    {statusView.label}
                  </Text>
                </View>
              )}
              <Pressable onPress={() => router.push("/device-setup" as Href)} hitSlop={8} style={styles.gearBtn}
                accessibilityLabel="Hướng dẫn kết nối thiết bị">
                <Settings color={durianTheme.colors.muted} size={16} />
              </Pressable>
            </View>
          </View>
          <View style={styles.previewBox}>
            {!statusView.canPreview ? <Text style={styles.previewErrorText}>
              {`Camera ${statusView.label.toLowerCase()}. ${statusView.message ?? ""}`}
              {deviceInfo?.lastSeenAt ? `\nTín hiệu cuối: ${new Date(deviceInfo.lastSeenAt).toLocaleString("vi-VN")}` : ""}
            </Text> : null}
            {isCapturing && (
              <View style={styles.captureOverlay}>
                <ActivityIndicator color={durianTheme.colors.durianYellow} size="large" />
                <Text style={styles.captureLabel}>
                  Đang chụp ảnh...
                </Text>
              </View>
            )}
            {!isCapturing && deviceId && statusView.canPreview && (["a", "b"] as const).map(slot => {
              const previewKey = slots[slot];
              if (!previewKey) return null;
              return (
                <Image
                  key={`${slot}:${deviceId}:${endpointVersion}:${previewKey}`}
                  source={cameraSnapshotSource(deviceId, endpointVersion, previewKey, deviceInfo?.snapshotUrl)}
                  style={[styles.previewImg, styles.previewSlot, { opacity: slots.front === slot ? 1 : 0 }]}
                  resizeMode="cover"
                  fadeDuration={0}
                  onError={() => onSlotError(slot)}
                  onLoad={() => onSlotLoad(slot)}
                />
              );
            })}
            {snapshotError && !isCapturing && (
              <View style={styles.previewError}>
                <Camera color={durianTheme.colors.mist} size={36} />
                <Text style={styles.previewErrorText}>Chưa có ảnh mới từ camera. Bấm “Chụp hình ngay” hoặc chờ lịch chụp.</Text>
              </View>
            )}
          </View>

          {/* Capture button */}
          <Pressable
            onPress={handleCapture}
            disabled={isCapturing || !deviceId || !statusView.canCapture}
            style={({ pressed }) => [styles.captureBtn, pressed && styles.pressed, isCapturing && styles.disabled]}
          >
            {isCapturing
              ? <><Loader2 color="#fff" size={16} /><Text style={styles.captureBtnText}>Đang chụp...</Text></>
              : <><Camera color="#fff" size={16} /><Text style={styles.captureBtnText}>Chụp hình ngay</Text></>
            }
          </Pressable>

          {captureError && (
            <View style={styles.errorBanner}>
              <AlertCircle color="#dc2626" size={14} />
              <Text style={styles.errorText}>{captureError}</Text>
            </View>
          )}
        </View>

        {deviceId ? <ScheduleCard key={deviceId} deviceId={deviceId} /> : null}

        {/* History gallery */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Thư viện ảnh gần đây</Text>
            <Pressable onPress={loadHistory} hitSlop={8}>
              <RefreshCw color={durianTheme.colors.muted} size={16} />
            </Pressable>
          </View>

          {histLoading ? (
            <ActivityIndicator color={durianTheme.colors.moss} style={{ marginTop: 24 }} />
          ) : history.length === 0 ? (
            <View style={styles.empty}>
              <Camera color={durianTheme.colors.mist} size={32} />
              <Text style={styles.emptyText}>Chưa có ảnh nào. Nhấn "Chụp hình ngay" để bắt đầu.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {history.map((cap) => (
                <Pressable
                  key={cap.id}
                  style={styles.thumb}
                  onPress={() => setEnlarged(cap)}
                >
                  <Image source={captureImageSource(cap.image_url)} style={styles.thumbImg} resizeMode="cover" />
                  <Text style={styles.thumbTime} numberOfLines={1}>{formatTime(cap.captured_at)}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <PhotoModal capture={enlarged} onClose={() => setEnlarged(null)} />

    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea:        { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  content:         { gap: 16, paddingBottom: 40, paddingHorizontal: 18 },
  cardLabel:       { color: durianTheme.colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginBottom: 10, textTransform: "uppercase" },

  previewCard:     { backgroundColor: durianTheme.colors.surface, borderColor: "#ECE8D8", borderRadius: 22, borderWidth: 1, gap: 12, padding: 16 },
  previewBox:      { aspectRatio: 1.4, backgroundColor: "#000", borderRadius: 16, overflow: "hidden", position: "relative" },
  previewImg:      { height: "100%", width: "100%" },
  previewSlot:     { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  liveBadge:       { alignItems: "center", backgroundColor: "#fdecec", borderRadius: 99, flexDirection: "row", gap: 5,
                     paddingHorizontal: 8, paddingVertical: 3 },
  liveDot:         { backgroundColor: "#d64545", borderRadius: 3, height: 6, width: 6 },
  liveText:        { color: "#b33a3a", fontSize: 10, fontWeight: "700" },
  previewError:    { alignItems: "center", flex: 1, gap: 10, justifyContent: "center" },
  previewErrorText:{ color: durianTheme.colors.mist, fontSize: 12, textAlign: "center" },

  captureOverlay:  { alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)", bottom: 0, gap: 10, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0 },
  captureLabel:    { color: "#fff", fontSize: 14, fontWeight: "700" },

  captureBtn:      { alignItems: "center", backgroundColor: durianTheme.colors.moss, borderRadius: 16, flexDirection: "row", gap: 8, justifyContent: "center", paddingVertical: 12 },
  captureBtnText:  { color: "#fff", fontSize: 14, fontWeight: "800" },
  pressed:         { opacity: 0.8, transform: [{ scale: 0.97 }] },
  disabled:        { opacity: 0.6 },

  errorBanner:     { alignItems: "center", backgroundColor: "#fef2f2", borderRadius: 12, flexDirection: "row", gap: 8, padding: 10 },
  errorText:       { color: "#dc2626", fontSize: 12, flex: 1 },

  historySection:  { gap: 12 },
  historyHeader:   { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  historyTitle:    { color: durianTheme.colors.ink, fontSize: 16, fontWeight: "900" },
  empty:           { alignItems: "center", gap: 10, paddingVertical: 32 },
  emptyText:       { color: durianTheme.colors.muted, fontSize: 12, textAlign: "center" },

  grid:            { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  thumb:           { backgroundColor: durianTheme.colors.surface, borderColor: "#ECE8D8", borderRadius: 14, borderWidth: 1, overflow: "hidden", width: "47%" },
  thumbImg:        { aspectRatio: 1.3, width: "100%" },
  thumbTime:       { color: durianTheme.colors.muted, fontSize: 9, padding: 6 },
  // Modal
  modalOverlay:    { backgroundColor: "rgba(0,0,0,0.7)", flex: 1, justifyContent: "flex-end" },
  modalSheet:      { backgroundColor: durianTheme.colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%", paddingBottom: 32 },
  modalHeader:     { alignItems: "center", borderBottomColor: "#ECE8D8", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
  modalTitle:      { color: durianTheme.colors.ink, fontSize: 14, fontWeight: "800" },
  modalImage:      { aspectRatio: 1.6, width: "100%" },

  // Auto-capture schedule
  scheduleHeader:  { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  scheduleHint:    { color: durianTheme.colors.muted, fontSize: 12 },
  slotGrid:        { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot:            { borderColor: "#ECE8D8", borderRadius: 12, borderWidth: 1, minWidth: "30%", paddingVertical: 10, alignItems: "center", flexGrow: 1 },
  slotActive:      { backgroundColor: durianTheme.colors.moss, borderColor: durianTheme.colors.moss },
  slotText:        { color: durianTheme.colors.ink, fontSize: 13, fontWeight: "800" },
  slotTextActive:  { color: "#fff" },
  switchTrack:     { backgroundColor: "#d6d3c4", borderRadius: 14, height: 28, justifyContent: "center", padding: 3, width: 50 },
  switchTrackOn:   { backgroundColor: durianTheme.colors.moss },
  switchThumb:     { backgroundColor: "#fff", borderRadius: 11, height: 22, width: 22 },
  switchThumbOn:   { alignSelf: "flex-end" },

  // Camera config modal
  gearBtn:         { padding: 4 },
});
