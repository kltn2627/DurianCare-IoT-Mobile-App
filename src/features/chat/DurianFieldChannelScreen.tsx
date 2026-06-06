import {
  BellRing,
  CalendarDays,
  Check,
  Circle,
  MessageCircle,
  Plus,
  Send,
  Stethoscope,
  X,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
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

import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";
import { useWorkspace } from "@/src/workspace/WorkspaceContext";
import type { ChatMessage, ProtocolDay } from "@/src/workspace/types";

export function DurianFieldChannelScreen() {
  const { session } = useSession();
  const { messages, publishProtocol, sendMessage, toggleProtocolDay } = useWorkspace();
  const [draft, setDraft] = useState("");
  const [showProtocolForm, setShowProtocolForm] = useState(false);
  const [dayCount, setDayCount] = useState(2);
  const [tasks, setTasks] = useState(["Phun thuốc trị nấm", "Bón phân vi lượng"]);
  const isEngineer = session?.user.role === "ENGINEER";

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
    sendMessage(body, session.user.name, session.user.role);
    setDraft("");
  }

  function changeDayCount(delta: number) {
    const nextCount = Math.min(7, Math.max(1, dayCount + delta));
    setDayCount(nextCount);
    setTasks((current) =>
      Array.from({ length: nextCount }, (_, index) => current[index] ?? ""),
    );
  }

  function updateTask(index: number, task: string) {
    setTasks((current) => current.map((item, taskIndex) => (taskIndex === index ? task : item)));
  }

  function handleSaveProtocol() {
    if (protocolDays.some((item) => !item.task.trim())) return;
    publishProtocol(protocolDays);
    setShowProtocolForm(false);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={76}
        style={styles.flex}
      >
        <View style={styles.header}>
          <View style={styles.avatar}>
            <MessageCircle color={durianTheme.colors.durianYellow} size={24} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Kênh phối hợp Khu A</Text>
            <Text style={styles.headerSubtitle}>Chủ vườn • Kỹ sư thực địa • Bot lịch</Text>
          </View>
          {isEngineer ? (
            <Pressable onPress={() => setShowProtocolForm((value) => !value)} style={styles.protocolToggle}>
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
            onSave={handleSaveProtocol}
            onTaskChange={updateTask}
            tasks={tasks}
          />
        ) : null}

        <ScrollView
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onToggleProtocolDay={toggleProtocolDay}
              ownRole={session?.user.role}
            />
          ))}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            multiline
            onChangeText={setDraft}
            placeholder="Nhập nội dung trao đổi..."
            placeholderTextColor={durianTheme.colors.muted}
            style={styles.composerInput}
            value={draft}
          />
          <Pressable onPress={handleSend} style={styles.sendButton}>
            <Send color={durianTheme.colors.mossDark} size={20} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({
  message,
  onToggleProtocolDay,
  ownRole,
}: {
  message: ChatMessage;
  onToggleProtocolDay: (messageId: string, day: number) => void;
  ownRole?: "OWNER" | "ENGINEER";
}) {
  const isOwn = message.role === ownRole;
  const isSystem = message.role === "BOT";

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
            style={[styles.protocolDay, item.completed && styles.protocolDayCompleted]}
          >
            {item.completed ? (
              <Check color={durianTheme.colors.mossDark} size={17} strokeWidth={3} />
            ) : (
              <Circle color={durianTheme.colors.durianYellow} size={17} />
            )}
            <Text style={styles.protocolDayBadge}>Ngày {item.day}</Text>
            <Text style={[styles.protocolDayTask, item.completed && styles.protocolDayTaskCompleted]}>
              {item.task}
            </Text>
          </Pressable>
        ))}
        <Text style={styles.protocolHint}>Chạm từng ngày để xác nhận đã thực hiện xong.</Text>
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
          {isSystem ? "DurianCare AI" : message.author}
        </Text>
        <Text style={[styles.messageText, isOwn && styles.ownText]}>{message.body}</Text>
        <Text style={[styles.time, isOwn && styles.ownTime]}>{message.createdAt}</Text>
      </View>
    </View>
  );
}

type ProtocolFormProps = {
  dayCount: number;
  onChangeCount: (delta: number) => void;
  onSave: () => void;
  onTaskChange: (index: number, task: string) => void;
  tasks: string[];
};

function ProtocolForm({
  dayCount,
  onChangeCount,
  onSave,
  onTaskChange,
  tasks,
}: ProtocolFormProps) {
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
        <View key={index} style={styles.taskRow}>
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
        <Text style={styles.saveButtonText}>Lưu và gửi vào khung chat</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  author: { color: durianTheme.colors.moss, fontSize: 11, fontWeight: "900" },
  avatar: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossDark,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  botCard: {
    alignItems: "flex-start",
    backgroundColor: "#FBE9E5",
    borderColor: "#F3C2B7",
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    padding: 15,
  },
  botText: { color: durianTheme.colors.ink, fontSize: 13, lineHeight: 19 },
  botTitle: { color: durianTheme.colors.danger, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  bubble: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 18,
    gap: 5,
    maxWidth: "84%",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  composer: {
    alignItems: "flex-end",
    backgroundColor: durianTheme.colors.surface,
    borderTopColor: durianTheme.colors.mossSoft,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  composerInput: {
    backgroundColor: durianTheme.colors.canvas,
    borderRadius: 18,
    color: durianTheme.colors.ink,
    flex: 1,
    fontSize: 14,
    maxHeight: 96,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  countRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  dayCount: { color: durianTheme.colors.ink, fontSize: 16, fontWeight: "900", minWidth: 24, textAlign: "center" },
  flex: { flex: 1 },
  form: {
    backgroundColor: durianTheme.colors.surface,
    borderBottomColor: durianTheme.colors.mossSoft,
    borderBottomWidth: 1,
    gap: 11,
    padding: 16,
  },
  formLabel: { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "800" },
  formTitle: { color: durianTheme.colors.ink, fontSize: 16, fontWeight: "900" },
  header: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    flexDirection: "row",
    gap: 11,
    padding: 16,
  },
  headerCopy: { flex: 1 },
  headerSubtitle: { color: durianTheme.colors.mist, fontSize: 11, marginTop: 3 },
  headerTitle: { color: durianTheme.colors.white, fontSize: 17, fontWeight: "900" },
  messageList: { gap: 12, padding: 14, paddingBottom: 24 },
  messageRow: { alignItems: "flex-start" },
  messageText: { color: durianTheme.colors.ink, fontSize: 14, lineHeight: 20 },
  ownBubble: { backgroundColor: durianTheme.colors.moss },
  ownMessageRow: { alignItems: "flex-end" },
  ownText: { color: durianTheme.colors.white },
  ownTime: { color: durianTheme.colors.mist },
  protocolCard: {
    backgroundColor: durianTheme.colors.mossDark,
    borderRadius: durianTheme.radius.md,
    gap: 10,
    padding: 16,
  },
  protocolCardHeader: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  protocolCardLabel: { color: durianTheme.colors.durianYellow, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  protocolCardTitle: { color: durianTheme.colors.white, fontSize: 13, fontWeight: "800", lineHeight: 19 },
  protocolDay: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: 12,
    flexDirection: "row",
    gap: 10,
    padding: 10,
  },
  protocolDayCompleted: { backgroundColor: durianTheme.colors.durianYellow },
  protocolDayBadge: {
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 8,
    color: durianTheme.colors.mossDark,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  protocolDayTask: { color: durianTheme.colors.white, flex: 1, fontSize: 12, fontWeight: "700" },
  protocolDayTaskCompleted: {
    color: durianTheme.colors.mossDark,
    textDecorationLine: "line-through",
  },
  protocolHint: { color: durianTheme.colors.mist, fontSize: 10, fontStyle: "italic" },
  protocolToggle: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 18,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  saveButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 12,
    paddingVertical: 12,
  },
  saveButtonText: { color: durianTheme.colors.mossDark, fontSize: 13, fontWeight: "900" },
  scanAuthor: { color: durianTheme.colors.danger },
  scanBubble: {
    backgroundColor: "#FBE9E5",
    borderColor: durianTheme.colors.danger,
    borderWidth: 2,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 23,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  stepper: { alignItems: "center", flexDirection: "row", gap: 9 },
  stepperButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  stepperText: { color: durianTheme.colors.mossDark, fontSize: 20, fontWeight: "900" },
  systemCopy: { flex: 1, gap: 4 },
  taskInput: {
    backgroundColor: durianTheme.colors.canvas,
    borderRadius: 10,
    color: durianTheme.colors.ink,
    flex: 1,
    fontSize: 12,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  taskLabel: { color: durianTheme.colors.moss, fontSize: 11, fontWeight: "900", width: 48 },
  taskRow: { alignItems: "center", flexDirection: "row", gap: 9 },
  time: { color: durianTheme.colors.muted, fontSize: 9, textAlign: "right" },
});
