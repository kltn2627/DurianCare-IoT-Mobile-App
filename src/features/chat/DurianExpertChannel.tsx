import * as ImagePicker from "expo-image-picker";
import {
  Camera,
  Check,
  Circle,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Stethoscope,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { connectionApi, type UserConnection } from "@/src/features/community/connectionApi";
import { DurianRemoteImage } from "@/src/components/DurianRemoteImage";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

import { chatApi } from "./chatApi";
import type {
  ChatConversation,
  ChatConversationStatus,
  ChatMessage,
  TreatmentRegimenStep,
} from "./chatTypes";
import { type ChatRealtimeStatus, useChatRealtime } from "./useChatRealtime";

type PendingImage = { dataUrl: string; name?: string; uri: string };

export function DurianExpertChannel({
  initialConversationId,
  initialShareText,
}: {
  initialConversationId?: string;
  initialShareText?: string;
}) {
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const { session } = useSession();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [pendingShareText, setPendingShareText] = useState(initialShareText ?? "");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regimenOpen, setRegimenOpen] = useState(false);
  const [regimenTitle, setRegimenTitle] = useState("Checklist điều trị");
  const [regimenSteps, setRegimenSteps] = useState<TreatmentRegimenStep[]>([
    { completed: false, day: 1, task: "Cắt tỉa và vệ sinh vườn" },
    { completed: false, day: 2, task: "Phun thuốc theo khuyến nghị kỹ sư" },
    { completed: false, day: 3, task: "Theo dõi lá non và độ lan bệnh" },
  ]);

  const user = session?.user;
  const chatRole =
    user?.backendRole === "FARMER" ? "FARMER" : user?.backendRole === "ENGINEER" ? "ENGINEER" : null;
  const isEngineer = chatRole === "ENGINEER";
  const activeConversation = conversations.find((item) => item.id === activeId) ?? null;

  const mergeConversation = useCallback((conversation: ChatConversation) => {
    setConversations((current) => {
      const next = current.filter((item) => item.id !== conversation.id);
      next.unshift(conversation);
      return next.sort(
        (a, b) =>
          new Date(b.lastMessageAt ?? b.updatedAt).getTime() -
          new Date(a.lastMessageAt ?? a.updatedAt).getTime(),
      );
    });
  }, []);

  const removeConversation = useCallback((conversationId: string) => {
    setConversations((current) => current.filter((item) => item.id !== conversationId));
    setActiveId((current) => (current === conversationId ? null : current));
  }, []);

  const realtime = useChatRealtime({
    activeConversationId: activeId,
    enabled: Boolean(chatRole && session?.token),
    onConversationDeleted: removeConversation,
    onConversationUpdated: mergeConversation,
    token: session?.token,
  });

  const load = useCallback(
    async function loadChat() {
      if (!chatRole) {
        setLoading(false);
        return;
      }

      setError(null);
      try {
        const [chatResult, connectionResult] = await Promise.all([
          chatApi.listConversations(),
          connectionApi.connections(),
        ]);
        const nextConversations = chatResult.conversations ?? [];
        setConversations(nextConversations);
        setConnections((connectionResult.items ?? []).filter((item) => item.status === "ACCEPTED"));
        setActiveId((current) => {
          if (initialConversationId && nextConversations.some((item) => item.id === initialConversationId)) {
            return initialConversationId;
          }
          return current ?? nextConversations[0]?.id ?? null;
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Không tải được phòng chat.");
      } finally {
        setLoading(false);
      }
    },
    [chatRole, initialConversationId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPendingShareText(initialShareText ?? "");
  }, [initialShareText]);

  useEffect(() => {
    if (!activeId) return;
    void chatApi
      .markRead(activeId)
      .then(({ conversation }) => mergeConversation(conversation))
      .catch(() => undefined);
  }, [activeId, mergeConversation]);

  const connectedPeerIds = useMemo(() => {
    const ids = new Set<string>();
    conversations.forEach((conversation) => {
      const peer =
        conversation.farmer.userId === user?.id ? conversation.engineer : conversation.farmer;
      ids.add(peer.userId);
    });
    return ids;
  }, [conversations, user?.id]);

  const availableConnections = connections.filter(
    (connection) =>
      !connectedPeerIds.has(connection.user.id) &&
      (user?.backendRole === "FARMER"
        ? connection.user.role === "ENGINEER"
        : connection.user.role === "FARMER"),
  );

  async function openConnection(connection: UserConnection) {
    setBusy(true);
    setError(null);
    try {
      const { conversation } = await chatApi.createConversation({
        cropContext: pendingShareText ? "Chia sẻ báo cáo AI Diagnosis" : undefined,
        initialMessage: pendingShareText || undefined,
        peerUserId: connection.user.id,
      });
      mergeConversation(conversation);
      setActiveId(conversation.id);
      if (pendingShareText) setPendingShareText("");
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Không mở được cuộc trò chuyện.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage(contentOverride?: string) {
    if (!activeConversation) return;
    const content = contentOverride ?? draft.trim();
    if (!content && !pendingImage) return;
    setBusy(true);
    setError(null);
    try {
      const { conversation } = await chatApi.sendMessage(activeConversation.id, {
        content,
        image: pendingImage?.dataUrl ?? null,
      });
      mergeConversation(conversation);
      setDraft("");
      setPendingImage(null);
      if (contentOverride) setPendingShareText("");
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Không gửi được tin nhắn.");
    } finally {
      setBusy(false);
    }
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Ứng dụng cần quyền thư viện ảnh để gửi ảnh cho kỹ sư.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      base64: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.72,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      setError("Thiết bị chưa trả dữ liệu ảnh để gửi qua Chat API hiện tại.");
      return;
    }
    const mimeType = asset.mimeType ?? "image/jpeg";
    setPendingImage({
      dataUrl: `data:${mimeType};base64,${asset.base64}`,
      name: asset.fileName ?? "Ảnh vườn",
      uri: asset.uri,
    });
  }

  async function publishRegimen() {
    if (!activeConversation || !isEngineer) return;
    const steps = regimenSteps.filter((item) => item.task.trim());
    if (!steps.length) return;
    setBusy(true);
    setError(null);
    try {
      const { conversation } = await chatApi.publishRegimen(activeConversation.id, {
        regimen: { steps, title: regimenTitle.trim() || "Checklist điều trị" },
      });
      mergeConversation(conversation);
      setRegimenOpen(false);
    } catch (regimenError) {
      setError(regimenError instanceof Error ? regimenError.message : "Không gửi được phác đồ.");
    } finally {
      setBusy(false);
    }
  }

  async function updateStep(message: ChatMessage, step: TreatmentRegimenStep) {
    if (!activeConversation) return;
    setBusy(true);
    try {
      const { conversation } = await chatApi.updateRegimenStep(
        activeConversation.id,
        message.id,
        step.day,
        !step.completed,
      );
      mergeConversation(conversation);
    } catch (stepError) {
      setError(stepError instanceof Error ? stepError.message : "Không cập nhật được checklist.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: ChatConversationStatus) {
    if (!activeConversation || !isEngineer) return;
    setBusy(true);
    try {
      const { conversation } = await chatApi.setStatus(activeConversation.id, status);
      mergeConversation(conversation);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Không cập nhật được trạng thái.");
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    if (!activeConversation) return;
    Alert.alert("Xóa hội thoại?", "Hội thoại sẽ được xóa trên hệ thống chat.", [
      { style: "cancel", text: "Hủy" },
      {
        onPress: async () => {
          setBusy(true);
          try {
            await chatApi.deleteConversation(activeConversation.id);
            removeConversation(activeConversation.id);
          } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : "Không xóa được hội thoại.");
          } finally {
            setBusy(false);
          }
        },
        style: "destructive",
        text: "Xóa",
      },
    ]);
  }

  if (!chatRole) {
    return (
      <View style={styles.centerState}>
        <ShieldCheck color={durianTheme.colors.moss} size={34} />
        <Text style={styles.emptyTitle}>Chat chỉ dành cho nông hộ và kỹ sư</Text>
        <Text style={styles.emptyText}>Backend Chat hiện chỉ chấp nhận vai trò FARMER/ENGINEER.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={durianTheme.colors.moss} />
        <Text style={styles.emptyText}>Đang tải hội thoại thật từ DurianCare...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
      style={styles.flex}
    >
      <View style={styles.roomHeader}>
        <View style={styles.roomCopy}>
          <Text style={styles.roomTitle}>
            {activeConversation ? peerName(activeConversation, user?.id) : "Chọn người để trò chuyện"}
          </Text>
          <RealtimeStatus status={realtime.status} />
        </View>
        <Pressable onPress={() => void load()} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <RefreshCw color={durianTheme.colors.mossDark} size={18} />
        </Pressable>
        {activeConversation ? (
          <Pressable onPress={confirmDelete} style={({ pressed }) => [styles.iconButton, styles.dangerButton, pressed && styles.pressed]}>
            <Trash2 color={durianTheme.colors.danger} size={18} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.conversationRail}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railContent}>
          {conversations.map((conversation) => (
            <Pressable
              key={conversation.id}
              onPress={() => setActiveId(conversation.id)}
              style={({ pressed }) => [
                styles.peerChip,
                conversation.id === activeId && styles.activePeerChip,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.peerName, conversation.id === activeId && styles.activePeerName]} numberOfLines={1}>
                {peerName(conversation, user?.id)}
              </Text>
              {conversation.unreadCount > 0 ? <Text style={styles.unreadBadge}>{conversation.unreadCount}</Text> : null}
            </Pressable>
          ))}
          {availableConnections.map((connection) => (
            <Pressable
              key={connection.id}
              disabled={busy}
              onPress={() => void openConnection(connection)}
              style={({ pressed }) => [styles.peerChip, styles.newPeerChip, pressed && styles.pressed]}
            >
              <Text style={styles.peerName} numberOfLines={1}>{connection.user.fullName}</Text>
              <Text style={styles.newPeerText}>Mở chat</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {pendingShareText ? (
        <View style={styles.shareBanner}>
          <MessageCircle color={durianTheme.colors.moss} size={18} />
          <View style={styles.shareCopy}>
            <Text style={styles.shareTitle}>Báo cáo AI đang chờ gửi</Text>
            <Text numberOfLines={2} style={styles.shareText}>{pendingShareText}</Text>
          </View>
          {activeConversation ? (
            <Pressable disabled={busy} onPress={() => void sendMessage(pendingShareText)} style={styles.shareButton}>
              <Text style={styles.shareButtonText}>Gửi</Text>
            </Pressable>
          ) : null}
          <Pressable hitSlop={8} onPress={() => setPendingShareText("")}>
            <X color={durianTheme.colors.muted} size={18} />
          </Pressable>
        </View>
      ) : null}

      {isEngineer && activeConversation ? (
        <View style={styles.engineerTools}>
          {(["WAITING", "IN_PROGRESS", "RESOLVED"] as const).map((status) => (
            <Pressable key={status} onPress={() => void setStatus(status)} style={[styles.statusChip, activeConversation.status === status && styles.activeStatusChip]}>
              <Text style={[styles.statusText, activeConversation.status === status && styles.activeStatusText]}>{statusLabel(status)}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setRegimenOpen((current) => !current)} style={styles.regimenToggle}>
            <Stethoscope color={durianTheme.colors.mossDark} size={16} />
          </Pressable>
        </View>
      ) : null}

      {isEngineer && regimenOpen ? (
        <RegimenForm
          busy={busy}
          onPublish={publishRegimen}
          onStepChange={(day, task) =>
            setRegimenSteps((current) => current.map((item) => (item.day === day ? { ...item, task } : item)))
          }
          onTitleChange={setRegimenTitle}
          steps={regimenSteps}
          title={regimenTitle}
        />
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {activeConversation ? (
        <FlatList
          ref={listRef}
          contentContainerStyle={styles.messageList}
          data={activeConversation.messages ?? []}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <MessageBubble message={item} onToggleStep={updateStep} ownUserId={user?.id} />
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.centerState}>
          <MessageCircle color={durianTheme.colors.moss} size={34} />
          <Text style={styles.emptyTitle}>Chưa có hội thoại</Text>
          <Text style={styles.emptyText}>Hãy kết nối với kỹ sư hoặc nông hộ trước, sau đó mở chat từ danh sách.</Text>
        </View>
      )}

      {pendingImage ? (
        <View style={styles.previewBar}>
          <Image source={{ uri: pendingImage.uri }} style={styles.previewImage} />
          <Text numberOfLines={1} style={styles.previewText}>{pendingImage.name ?? "Ảnh đính kèm"}</Text>
          <Pressable onPress={() => setPendingImage(null)}>
            <X color={durianTheme.colors.muted} size={20} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.composer}>
        <Pressable disabled={!activeConversation || busy} onPress={pickImage} style={({ pressed }) => [styles.mediaButton, pressed && styles.pressed]}>
          <Camera color={durianTheme.colors.moss} size={21} />
        </Pressable>
        <TextInput
          editable={Boolean(activeConversation) && !busy}
          multiline
          onChangeText={setDraft}
          placeholder="Nhập câu hỏi cho kỹ sư..."
          placeholderTextColor={durianTheme.colors.muted}
          style={styles.composerInput}
          value={draft}
        />
        <Pressable
          disabled={busy || !activeConversation || (!draft.trim() && !pendingImage)}
          onPress={() => void sendMessage()}
          style={({ pressed }) => [
            styles.sendButton,
            (busy || !activeConversation || (!draft.trim() && !pendingImage)) && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {busy ? <ActivityIndicator color={durianTheme.colors.mossDark} size="small" /> : <Send color={durianTheme.colors.mossDark} size={20} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function peerName(conversation: ChatConversation, ownUserId?: string) {
  const peer = conversation.farmer.userId === ownUserId ? conversation.engineer : conversation.farmer;
  return peer.name || peer.phoneNumber || "Người dùng DurianCare";
}

function formatTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function statusLabel(status: string) {
  if (status === "WAITING") return "Chờ xử lý";
  if (status === "IN_PROGRESS") return "Đang xử lý";
  if (status === "RESOLVED") return "Đã xong";
  return status;
}

function RealtimeStatus({ status }: { status: ChatRealtimeStatus }) {
  const connected = status === "connected";
  return (
    <View style={styles.realtimeStatus}>
      {connected ? <Wifi color={durianTheme.colors.moss} size={13} /> : <WifiOff color={durianTheme.colors.muted} size={13} />}
      <Text style={[styles.roomSubtitle, connected && styles.connectedText]}>
        {connected ? "Realtime đang nhận cập nhật" : "REST vẫn hoạt động, realtime chưa sẵn sàng"}
      </Text>
    </View>
  );
}

function MessageBubble({
  message,
  onToggleStep,
  ownUserId,
}: {
  message: ChatMessage;
  onToggleStep: (message: ChatMessage, step: TreatmentRegimenStep) => void;
  ownUserId?: string;
}) {
  const isOwn = message.sender.userId === ownUserId;
  if (message.type === "TREATMENT_REGIMEN") {
    const steps = message.regimen?.steps ?? message.regimen?.days ?? [];
    return (
      <View style={styles.regimenCard}>
        <Text style={styles.regimenLabel}>CHECKLIST ĐIỀU TRỊ</Text>
        <Text style={styles.regimenTitle}>{message.regimen?.title ?? message.regimen?.name ?? message.content}</Text>
        {message.regimen?.description ? <Text style={styles.regimenDescription}>{message.regimen.description}</Text> : null}
        {steps.map((step) => (
          <Pressable key={`${message.id}-${step.day}`} onPress={() => onToggleStep(message, step)} style={styles.protocolDay}>
            {step.completed ? <Check color={durianTheme.colors.mossDark} size={17} strokeWidth={3} /> : <Circle color={durianTheme.colors.durianYellow} size={17} />}
            <Text style={styles.protocolDayBadge}>Bước {step.day}</Text>
            <Text style={[styles.protocolDayTask, step.completed && styles.protocolDayTaskCompleted]}>{step.task}</Text>
          </Pressable>
        ))}
        <Text style={styles.regimenTime}>{formatTime(message.sentAt)}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.messageRow, isOwn && styles.ownMessageRow]}>
      <View style={[styles.bubble, isOwn && styles.ownBubble]}>
        <Text style={[styles.author, isOwn && styles.ownText]}>{message.sender.name}</Text>
        {message.image ? <DurianRemoteImage feature="chat-message-image" uri={message.image} resizeMode="cover" style={styles.messageImage} /> : null}
        {message.content ? <Text style={[styles.messageText, isOwn && styles.ownText]}>{message.content}</Text> : null}
        <Text style={[styles.time, isOwn && styles.ownTime]}>{formatTime(message.sentAt)}</Text>
      </View>
    </View>
  );
}

function RegimenForm({
  busy,
  onPublish,
  onStepChange,
  onTitleChange,
  steps,
  title,
}: {
  busy: boolean;
  onPublish: () => void;
  onStepChange: (day: number, task: string) => void;
  onTitleChange: (title: string) => void;
  steps: TreatmentRegimenStep[];
  title: string;
}) {
  return (
    <View style={styles.form}>
      <TextInput
        onChangeText={onTitleChange}
        placeholder="Tên phác đồ"
        placeholderTextColor={durianTheme.colors.muted}
        style={styles.taskInput}
        value={title}
      />
      {steps.map((step) => (
        <View key={step.day} style={styles.taskRow}>
          <Text style={styles.taskLabel}>Bước {step.day}</Text>
          <TextInput
            onChangeText={(value) => onStepChange(step.day, value)}
            placeholder={`Nhiệm vụ bước ${step.day}`}
            placeholderTextColor={durianTheme.colors.muted}
            style={styles.taskInput}
            value={step.task}
          />
        </View>
      ))}
      <Pressable disabled={busy} onPress={onPublish} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Gửi checklist điều trị</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  activePeerChip: { backgroundColor: durianTheme.colors.moss, borderColor: durianTheme.colors.moss },
  activePeerName: { color: durianTheme.colors.white },
  activeStatusChip: { backgroundColor: durianTheme.colors.durianYellow, borderColor: durianTheme.colors.durianYellow },
  activeStatusText: { color: durianTheme.colors.mossDark },
  author: { color: durianTheme.colors.moss, fontSize: 11, fontWeight: "900", lineHeight: 16 },
  bubble: { backgroundColor: durianTheme.colors.surface, borderRadius: 18, gap: 6, maxWidth: "84%", overflow: "hidden", padding: 12 },
  centerState: { alignItems: "center", flex: 1, gap: 10, justifyContent: "center", padding: 22 },
  composer: { alignItems: "flex-end", backgroundColor: durianTheme.colors.surface, borderTopColor: durianTheme.colors.mossSoft, borderTopWidth: 1, flexDirection: "row", gap: 8, padding: 10 },
  composerInput: { backgroundColor: durianTheme.colors.surfaceSecondary, borderColor: durianTheme.colors.border, borderRadius: durianTheme.radius.lg, borderWidth: 1, color: durianTheme.colors.ink, flex: 1, fontSize: 14, lineHeight: 20, maxHeight: 96, minHeight: 46, paddingHorizontal: 13, paddingVertical: 11 },
  connectedText: { color: durianTheme.colors.moss },
  conversationRail: { backgroundColor: durianTheme.colors.surfaceSecondary, borderBottomColor: durianTheme.colors.border, borderBottomWidth: 1 },
  dangerButton: { backgroundColor: durianTheme.colors.dangerSoft },
  disabled: { opacity: 0.42 },
  emptyText: { color: durianTheme.colors.muted, fontSize: 13, lineHeight: 20, textAlign: "center" },
  emptyTitle: { color: durianTheme.colors.ink, fontSize: 17, fontWeight: "900", lineHeight: 24, textAlign: "center" },
  engineerTools: { alignItems: "center", backgroundColor: durianTheme.colors.surface, flexDirection: "row", gap: 7, padding: 10 },
  errorText: { backgroundColor: durianTheme.colors.dangerSoft, color: durianTheme.colors.danger, fontSize: 12, fontWeight: "800", lineHeight: 17, paddingHorizontal: 13, paddingVertical: 8 },
  flex: { flex: 1 },
  form: { backgroundColor: durianTheme.colors.surface, borderBottomColor: durianTheme.colors.mossSoft, borderBottomWidth: 1, gap: 9, padding: 12 },
  iconButton: { alignItems: "center", backgroundColor: durianTheme.colors.mossSoft, borderRadius: 18, height: 40, justifyContent: "center", width: 40 },
  mediaButton: { alignItems: "center", backgroundColor: durianTheme.colors.mossSoft, borderRadius: 20, height: 44, justifyContent: "center", width: 44 },
  messageImage: { borderRadius: 12, height: 185, width: 235 },
  messageList: { gap: 11, padding: 13, paddingBottom: 20 },
  messageRow: { alignItems: "flex-start" },
  messageText: { color: durianTheme.colors.ink, fontSize: 14, lineHeight: 20 },
  newPeerChip: { borderStyle: "dashed" },
  newPeerText: { color: durianTheme.colors.moss, fontSize: 9, fontWeight: "900", lineHeight: 12 },
  ownBubble: { backgroundColor: durianTheme.colors.moss },
  ownMessageRow: { alignItems: "flex-end" },
  ownText: { color: durianTheme.colors.white },
  ownTime: { color: durianTheme.colors.mist },
  peerChip: { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderColor: durianTheme.colors.border, borderRadius: durianTheme.radius.sm, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 40, paddingHorizontal: 12 },
  peerName: { color: durianTheme.colors.ink, fontSize: 12, fontWeight: "900", lineHeight: 17, maxWidth: 130 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
  previewBar: { alignItems: "center", backgroundColor: durianTheme.colors.surfaceSecondary, borderTopColor: durianTheme.colors.border, borderTopWidth: 1, flexDirection: "row", gap: 9, padding: 9 },
  previewImage: { borderRadius: 10, height: 44, width: 44 },
  previewText: { color: durianTheme.colors.ink, flex: 1, fontSize: 12, fontWeight: "800", lineHeight: 17 },
  protocolDay: { alignItems: "center", backgroundColor: durianTheme.colors.moss, borderRadius: 12, flexDirection: "row", gap: 9, minHeight: 44, padding: 9 },
  protocolDayBadge: { backgroundColor: durianTheme.colors.durianYellow, borderRadius: 8, color: durianTheme.colors.mossDark, fontSize: 10, fontWeight: "900", lineHeight: 14, overflow: "hidden", paddingHorizontal: 7, paddingVertical: 5 },
  protocolDayTask: { color: durianTheme.colors.white, flex: 1, fontSize: 12, fontWeight: "700", lineHeight: 17 },
  protocolDayTaskCompleted: { color: durianTheme.colors.durianYellow, textDecorationLine: "line-through" },
  railContent: { gap: 8, padding: 10 },
  realtimeStatus: { alignItems: "center", flexDirection: "row", gap: 5, marginTop: 2 },
  regimenCard: { backgroundColor: durianTheme.colors.mossDark, borderRadius: 18, gap: 9, padding: 15 },
  regimenDescription: { color: durianTheme.colors.mist, fontSize: 12, lineHeight: 18 },
  regimenLabel: { color: durianTheme.colors.durianYellow, fontSize: 10, fontWeight: "900", letterSpacing: 1, lineHeight: 14 },
  regimenTime: { color: durianTheme.colors.mist, fontSize: 9, lineHeight: 13, textAlign: "right" },
  regimenTitle: { color: durianTheme.colors.white, fontSize: 15, fontWeight: "900", lineHeight: 21 },
  regimenToggle: { alignItems: "center", backgroundColor: durianTheme.colors.durianYellow, borderRadius: 15, height: 34, justifyContent: "center", width: 34 },
  roomCopy: { flex: 1 },
  roomHeader: { alignItems: "center", backgroundColor: durianTheme.colors.surfaceSecondary, flexDirection: "row", gap: 8, minHeight: 58, paddingHorizontal: 14, paddingVertical: 8 },
  roomSubtitle: { color: durianTheme.colors.muted, fontSize: 10, lineHeight: 14, marginTop: 2 },
  roomTitle: { color: durianTheme.colors.ink, fontSize: 14, fontWeight: "900", lineHeight: 20 },
  saveButton: { alignItems: "center", backgroundColor: durianTheme.colors.durianYellow, borderRadius: 13, justifyContent: "center", minHeight: 42 },
  saveButtonText: { color: durianTheme.colors.mossDark, fontSize: 12, fontWeight: "900", lineHeight: 17 },
  sendButton: { alignItems: "center", backgroundColor: durianTheme.colors.mossSoft, borderRadius: durianTheme.radius.pill, height: 46, justifyContent: "center", width: 46 },
  shareBanner: { alignItems: "center", backgroundColor: durianTheme.colors.surfaceSecondary, borderBottomColor: durianTheme.colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 9, padding: 10 },
  shareButton: { alignItems: "center", backgroundColor: durianTheme.colors.durianYellow, borderRadius: 12, justifyContent: "center", minHeight: 34, paddingHorizontal: 13 },
  shareButtonText: { color: durianTheme.colors.mossDark, fontSize: 12, fontWeight: "900" },
  shareCopy: { flex: 1 },
  shareText: { color: durianTheme.colors.muted, fontSize: 11, lineHeight: 16 },
  shareTitle: { color: durianTheme.colors.ink, fontSize: 12, fontWeight: "900", lineHeight: 17 },
  statusChip: { borderColor: durianTheme.colors.border, borderRadius: durianTheme.radius.pill, borderWidth: 1, justifyContent: "center", minHeight: 34, paddingHorizontal: 10 },
  statusText: { color: durianTheme.colors.muted, fontSize: 10, fontWeight: "900", lineHeight: 14 },
  taskInput: { backgroundColor: durianTheme.colors.canvas, borderRadius: 10, color: durianTheme.colors.ink, flex: 1, fontSize: 12, lineHeight: 17, paddingHorizontal: 11, paddingVertical: 10 },
  taskLabel: { color: durianTheme.colors.moss, fontSize: 11, fontWeight: "900", lineHeight: 16, width: 52 },
  taskRow: { alignItems: "center", flexDirection: "row", gap: 9 },
  time: { color: durianTheme.colors.muted, fontSize: 9, lineHeight: 13, textAlign: "right" },
  unreadBadge: { backgroundColor: durianTheme.colors.durianYellow, borderRadius: 8, color: durianTheme.colors.mossDark, fontSize: 10, fontWeight: "900", lineHeight: 14, minWidth: 18, overflow: "hidden", paddingHorizontal: 5, textAlign: "center" },
});
