import type { CameraCapturedPicture } from "expo-camera";
import {
  BellRing,
  CalendarDays,
  Camera,
  Check,
  Circle,
  MapPin,
  Plus,
  Send,
  Stethoscope,
  Wifi,
  WifiOff,
  X,
} from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";
import { useWorkspace } from "@/src/workspace/WorkspaceContext";
import type { ChatMessage, ProtocolDay } from "@/src/workspace/types";

import { ChatCameraSheet } from "./ChatCameraSheet";
import { uploadExpertGardenPhoto } from "./hybridChatApi";
import {
  type ExpertRealtimeStatus,
  useExpertRealtimeChannel,
} from "./useExpertRealtimeChannel";

const gardenZones = ["Khu A", "Khu B", "Vườn ươm", "Khu cây kiến thiết"];

export function DurianExpertChannel() {
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const { session } = useSession();
  const {
    messages,
    publishProtocol,
    receiveExpertMessage,
    sendExpertImage,
    sendGardenLocation,
    sendMessage,
    toggleProtocolDay,
  } = useWorkspace();
  const [draft, setDraft] = useState("");
  const [cameraVisible, setCameraVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState("Khu A");
  const [showZones, setShowZones] = useState(false);
  const [showProtocolForm, setShowProtocolForm] = useState(false);
  const [dayCount, setDayCount] = useState(2);
  const [tasks, setTasks] = useState(["Phun thuốc trị nấm", "Bón phân vi lượng"]);
  const isEngineer = session?.user.role === "ENGINEER";
  const realtime = useExpertRealtimeChannel({
    onMessage: receiveExpertMessage,
    token: session?.token,
  });

  const protocolDays = useMemo(
    () =>
      Array.from({ length: dayCount }, (_, index) => ({
        completed: false,
        day: index + 1,
        task: tasks[index] ?? "",
      })),
    [dayCount, tasks],
  );

  function handleSend() {
    const body = draft.trim();
    if (!body || !session) return;
    const message = sendMessage(body, session.user.name, session.user.role);
    realtime.send(message);
    setDraft("");
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }

  function sendLocation() {
    if (!session) return;
    const message = sendGardenLocation(
      selectedZone,
      session.user.name,
      session.user.role,
    );
    realtime.send(message);
    setShowZones(false);
  }

  async function sendCapturedPhoto(photo: CameraCapturedPicture) {
    if (!session) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const uploadedUri = await uploadExpertGardenPhoto(
        photo,
        selectedZone,
        draft.trim() || "Ảnh hiện trạng lá cần kỹ sư kiểm tra.",
      );
      const message = sendExpertImage(
        uploadedUri,
        draft,
        session.user.name,
        session.user.role,
        selectedZone,
      );
      realtime.send(message);
      setDraft("");
      setCameraVisible(false);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Không thể gửi ảnh đến phòng chuyên gia.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  function changeDayCount(delta: number) {
    const nextCount = Math.min(7, Math.max(1, dayCount + delta));
    setDayCount(nextCount);
    setTasks((current) =>
      Array.from({ length: nextCount }, (_, index) => current[index] ?? ""),
    );
  }

  function updateTask(index: number, task: string) {
    setTasks((current) =>
      current.map((item, taskIndex) => (taskIndex === index ? task : item)),
    );
  }

  function saveProtocol() {
    if (protocolDays.some((item) => !item.task.trim())) return;
    const message = publishProtocol(protocolDays);
    realtime.send(message);
    setShowProtocolForm(false);
  }

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <ExpertMessageBubble
        message={item}
        onToggleProtocolDay={toggleProtocolDay}
        ownRole={session?.user.role}
      />
    ),
    [session?.user.role, toggleProtocolDay],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={84}
      style={styles.flex}
    >
      <View style={styles.roomHeader}>
        <View style={styles.roomCopy}>
          <Text style={styles.roomTitle}>Phòng hỗ trợ Khu A</Text>
          <RealtimeStatus status={realtime.status} />
        </View>
        {isEngineer ? (
          <Pressable
            accessibilityLabel="Thiết lập phác đồ"
            hitSlop={8}
            onPress={() => setShowProtocolForm((current) => !current)}
            style={({ pressed }) => [styles.protocolToggle, pressed && styles.pressed]}
          >
            {showProtocolForm ? (
              <X color={durianTheme.colors.mossDark} size={20} />
            ) : (
              <Stethoscope color={durianTheme.colors.mossDark} size={20} />
            )}
          </Pressable>
        ) : null}
      </View>

      {isEngineer && showProtocolForm ? (
        <ProtocolForm
          dayCount={dayCount}
          onChangeCount={changeDayCount}
          onSave={saveProtocol}
          onTaskChange={updateTask}
          tasks={tasks}
        />
      ) : null}

      <FlatList
        ref={listRef}
        contentContainerStyle={styles.messageList}
        data={messages}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={renderMessage}
        showsVerticalScrollIndicator={false}
      />

      {showZones ? (
        <View style={styles.zoneTray}>
          <Text style={styles.zoneTrayTitle}>Chọn phân khu đang gặp sự cố</Text>
          <FlatList
            contentContainerStyle={styles.zoneList}
            data={gardenZones}
            horizontal
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setSelectedZone(item)}
                style={({ pressed }) => [
                  styles.zoneChip,
                  item === selectedZone && styles.activeZoneChip,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.zoneChipText,
                    item === selectedZone && styles.activeZoneChipText,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            )}
            showsHorizontalScrollIndicator={false}
          />
          <Pressable
            onPress={sendLocation}
            style={({ pressed }) => [styles.sendLocationButton, pressed && styles.pressed]}
          >
            <MapPin color={durianTheme.colors.mossDark} size={18} />
            <Text style={styles.sendLocationText}>Gửi vị trí {selectedZone}</Text>
          </Pressable>
        </View>
      ) : null}

      {uploadError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{uploadError}</Text>
        </View>
      ) : null}

      <View style={styles.composer}>
        <View style={styles.mediaActions}>
          <Pressable
            accessibilityLabel="Chụp ảnh gửi kỹ sư"
            hitSlop={8}
            onPress={() => setCameraVisible(true)}
            style={({ pressed }) => [styles.mediaButton, pressed && styles.pressed]}
          >
            <Camera color={durianTheme.colors.moss} size={21} />
          </Pressable>
          <Pressable
            accessibilityLabel="Gửi vị trí phân khu"
            hitSlop={8}
            onPress={() => setShowZones((current) => !current)}
            style={({ pressed }) => [
              styles.mediaButton,
              showZones && styles.activeMediaButton,
              pressed && styles.pressed,
            ]}
          >
            <MapPin color={durianTheme.colors.moss} size={21} />
          </Pressable>
        </View>
        <TextInput
          multiline
          onChangeText={setDraft}
          placeholder="Trao đổi với kỹ sư..."
          placeholderTextColor={durianTheme.colors.muted}
          style={styles.composerInput}
          value={draft}
        />
        <Pressable
          accessibilityLabel="Gửi tin nhắn"
          disabled={!draft.trim()}
          hitSlop={6}
          onPress={handleSend}
          style={({ pressed }) => [
            styles.sendButton,
            !draft.trim() && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Send color={durianTheme.colors.mossDark} size={20} />
        </Pressable>
      </View>

      <ChatCameraSheet
        busy={isUploading}
        onClose={() => {
          setCameraVisible(false);
          setUploadError(null);
        }}
        onUsePhoto={sendCapturedPhoto}
        visible={cameraVisible}
      />
    </KeyboardAvoidingView>
  );
}

function RealtimeStatus({ status }: { status: ExpertRealtimeStatus }) {
  const connected = status === "connected";
  const label = {
    connected: "Realtime · đã kết nối kỹ sư",
    connecting: "Đang kết nối phòng chuyên gia...",
    "not-configured": "Chế độ cục bộ · chưa cấu hình WebSocket",
    offline: "Mất kết nối · tin nhắn vẫn lưu trên máy",
    reconnecting: "Đang kết nối lại...",
  }[status];

  return (
    <View style={styles.realtimeStatus}>
      {connected ? (
        <Wifi color={durianTheme.colors.moss} size={13} />
      ) : (
        <WifiOff color={durianTheme.colors.muted} size={13} />
      )}
      <Text style={[styles.roomSubtitle, connected && styles.connectedText]}>{label}</Text>
    </View>
  );
}

function ExpertMessageBubble({
  message,
  onToggleProtocolDay,
  ownRole,
}: {
  message: ChatMessage;
  onToggleProtocolDay: (messageId: string, day: number) => void;
  ownRole?: "OWNER" | "ENGINEER";
}) {
  const isOwn = message.role === ownRole;

  if (message.kind === "bot") {
    return (
      <View style={styles.botCard}>
        <BellRing color={durianTheme.colors.danger} size={21} />
        <View style={styles.systemCopy}>
          <Text style={styles.botTitle}>BOT NHẮC LỊCH</Text>
          <Text style={styles.botText}>{message.body}</Text>
        </View>
      </View>
    );
  }

  if (message.kind === "protocol") {
    return (
      <View style={styles.protocolCard}>
        <View style={styles.protocolCardHeader}>
          <CalendarDays color={durianTheme.colors.durianYellow} size={22} />
          <View style={styles.systemCopy}>
            <Text style={styles.protocolCardLabel}>PHÁC ĐỒ SỐ</Text>
            <Text style={styles.protocolCardTitle}>{message.body}</Text>
          </View>
        </View>
        {message.protocol?.map((item) => (
          <Pressable
            key={item.day}
            onPress={() => onToggleProtocolDay(message.id, item.day)}
            style={({ pressed }) => [
              styles.protocolDay,
              item.completed && styles.protocolDayCompleted,
              pressed && styles.pressed,
            ]}
          >
            {item.completed ? (
              <Check color={durianTheme.colors.mossDark} size={17} strokeWidth={3} />
            ) : (
              <Circle color={durianTheme.colors.durianYellow} size={17} />
            )}
            <Text style={styles.protocolDayBadge}>Ngày {item.day}</Text>
            <Text
              style={[
                styles.protocolDayTask,
                item.completed && styles.protocolDayTaskCompleted,
              ]}
            >
              {item.task}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.messageRow, isOwn && styles.ownMessageRow]}>
      <View
        style={[
          styles.bubble,
          isOwn && styles.ownBubble,
          message.kind === "scan-alert" && styles.scanBubble,
        ]}
      >
        <Text
          style={[
            styles.author,
            isOwn && styles.ownText,
            message.kind === "scan-alert" && styles.scanAuthor,
          ]}
        >
          {message.author}
        </Text>
        {message.imageUri ? (
          <Image source={{ uri: message.imageUri }} resizeMode="cover" style={styles.messageImage} />
        ) : null}
        {message.zoneLabel ? (
          <View style={styles.locationBadge}>
            <MapPin color={durianTheme.colors.mossDark} size={15} />
            <Text style={styles.locationText}>{message.zoneLabel}</Text>
          </View>
        ) : null}
        <Text style={[styles.messageText, isOwn && styles.ownText]}>{message.body}</Text>
        <Text style={[styles.time, isOwn && styles.ownTime]}>{message.createdAt}</Text>
      </View>
    </View>
  );
}

function ProtocolForm({
  dayCount,
  onChangeCount,
  onSave,
  onTaskChange,
  tasks,
}: {
  dayCount: number;
  onChangeCount: (delta: number) => void;
  onSave: () => void;
  onTaskChange: (index: number, task: string) => void;
  tasks: string[];
}) {
  return (
    <View style={styles.form}>
      <Text style={styles.formTitle}>Thiết lập phác đồ điều trị</Text>
      <View style={styles.countRow}>
        <Text style={styles.formLabel}>Số ngày điều trị</Text>
        <View style={styles.stepper}>
          <Pressable onPress={() => onChangeCount(-1)} style={styles.stepperButton}>
            <Text style={styles.stepperText}>−</Text>
          </Pressable>
          <Text style={styles.dayCount}>{dayCount}</Text>
          <Pressable onPress={() => onChangeCount(1)} style={styles.stepperButton}>
            <Plus color={durianTheme.colors.mossDark} size={17} />
          </Pressable>
        </View>
      </View>
      {tasks.map((task, index) => (
        <View key={`protocol-task-${index + 1}`} style={styles.taskRow}>
          <Text style={styles.taskLabel}>Ngày {index + 1}</Text>
          <TextInput
            onChangeText={(value) => onTaskChange(index, value)}
            placeholder={`Nhiệm vụ ngày ${index + 1}`}
            placeholderTextColor={durianTheme.colors.muted}
            style={styles.taskInput}
            value={task}
          />
        </View>
      ))}
      <Pressable onPress={onSave} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Lưu và gửi vào phòng chat</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  activeMediaButton: { backgroundColor: durianTheme.colors.durianYellow },
  activeZoneChip: {
    backgroundColor: durianTheme.colors.moss,
    borderColor: durianTheme.colors.moss,
  },
  activeZoneChipText: { color: durianTheme.colors.white },
  author: {
    color: durianTheme.colors.moss,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 16,
  },
  botCard: {
    alignItems: "flex-start",
    backgroundColor: "#FBE9E5",
    borderColor: "#F3C2B7",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    padding: 14,
  },
  botText: { color: durianTheme.colors.ink, fontSize: 13, lineHeight: 19 },
  botTitle: {
    color: durianTheme.colors.danger,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    lineHeight: 14,
  },
  bubble: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 18,
    gap: 6,
    maxWidth: "84%",
    overflow: "hidden",
    padding: 12,
  },
  composer: {
    alignItems: "flex-end",
    backgroundColor: durianTheme.colors.surface,
    borderTopColor: durianTheme.colors.mossSoft,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  composerInput: {
    backgroundColor: durianTheme.colors.canvas,
    borderRadius: 18,
    color: durianTheme.colors.ink,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    maxHeight: 96,
    minHeight: 46,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  countRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  dayCount: {
    color: durianTheme.colors.ink,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21,
    minWidth: 24,
    textAlign: "center",
  },
  disabled: { opacity: 0.42 },
  errorBanner: { backgroundColor: "#FBE9E5", paddingHorizontal: 14, paddingVertical: 8 },
  errorText: {
    color: durianTheme.colors.danger,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  flex: { flex: 1 },
  form: {
    backgroundColor: durianTheme.colors.surface,
    borderBottomColor: durianTheme.colors.mossSoft,
    borderBottomWidth: 1,
    gap: 10,
    padding: 14,
  },
  formLabel: {
    color: durianTheme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  formTitle: {
    color: durianTheme.colors.ink,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 21,
  },
  locationBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 12,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  locationText: {
    color: durianTheme.colors.mossDark,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 14,
  },
  mediaActions: { flexDirection: "row", gap: 6 },
  mediaButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 20,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  messageImage: { borderRadius: 12, height: 185, width: 235 },
  messageList: { gap: 11, padding: 13, paddingBottom: 20 },
  messageRow: { alignItems: "flex-start" },
  messageText: { color: durianTheme.colors.ink, fontSize: 14, lineHeight: 20 },
  ownBubble: { backgroundColor: durianTheme.colors.moss },
  ownMessageRow: { alignItems: "flex-end" },
  ownText: { color: durianTheme.colors.white },
  ownTime: { color: durianTheme.colors.mist },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  protocolCard: {
    backgroundColor: durianTheme.colors.mossDark,
    borderRadius: 18,
    gap: 9,
    padding: 15,
  },
  protocolCardHeader: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  protocolCardLabel: {
    color: durianTheme.colors.durianYellow,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    lineHeight: 14,
  },
  protocolCardTitle: {
    color: durianTheme.colors.white,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
  },
  protocolDay: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: 12,
    flexDirection: "row",
    gap: 9,
    minHeight: 44,
    padding: 9,
  },
  protocolDayBadge: {
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 8,
    color: durianTheme.colors.mossDark,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 14,
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  protocolDayCompleted: { backgroundColor: durianTheme.colors.durianYellow },
  protocolDayTask: {
    color: durianTheme.colors.white,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  protocolDayTaskCompleted: {
    color: durianTheme.colors.mossDark,
    textDecorationLine: "line-through",
  },
  protocolToggle: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 19,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  roomCopy: { flex: 1 },
  roomHeader: {
    alignItems: "center",
    backgroundColor: "#E7EFE9",
    flexDirection: "row",
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  roomSubtitle: {
    color: durianTheme.colors.moss,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  connectedText: { color: durianTheme.colors.moss },
  realtimeStatus: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginTop: 2,
  },
  roomTitle: {
    color: durianTheme.colors.ink,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 13,
    justifyContent: "center",
    minHeight: 46,
  },
  saveButtonText: {
    color: durianTheme.colors.mossDark,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
  },
  scanAuthor: { color: durianTheme.colors.danger },
  scanBubble: {
    backgroundColor: "#FBE9E5",
    borderColor: durianTheme.colors.danger,
    borderWidth: 2,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 22,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  sendLocationButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 14,
    flexDirection: "row",
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 13,
  },
  sendLocationText: {
    color: durianTheme.colors.mossDark,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 16,
  },
  stepper: { alignItems: "center", flexDirection: "row", gap: 9 },
  stepperButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 17,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  stepperText: {
    color: durianTheme.colors.mossDark,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  systemCopy: { flex: 1, gap: 4 },
  taskInput: {
    backgroundColor: durianTheme.colors.canvas,
    borderRadius: 10,
    color: durianTheme.colors.ink,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  taskLabel: {
    color: durianTheme.colors.moss,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 16,
    width: 48,
  },
  taskRow: { alignItems: "center", flexDirection: "row", gap: 9 },
  time: {
    color: durianTheme.colors.muted,
    fontSize: 9,
    lineHeight: 13,
    textAlign: "right",
  },
  zoneChip: {
    alignItems: "center",
    borderColor: durianTheme.colors.mossSoft,
    borderRadius: durianTheme.radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 12,
  },
  zoneChipText: {
    color: durianTheme.colors.moss,
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 14,
  },
  zoneList: { gap: 8 },
  zoneTray: {
    backgroundColor: "#F1F4E8",
    borderTopColor: durianTheme.colors.mossSoft,
    borderTopWidth: 1,
    gap: 9,
    padding: 11,
  },
  zoneTrayTitle: {
    color: durianTheme.colors.ink,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 16,
  },
});
