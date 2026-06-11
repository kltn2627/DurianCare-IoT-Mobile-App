import type { CameraCapturedPicture } from "expo-camera";
import { Bot, Camera, Image as ImageIcon, Send, Sparkles, UserRound, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
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

import { durianTheme } from "@/src/theme/durianTheme";

import { ChatCameraSheet } from "./ChatCameraSheet";
import { askDurianAssistant } from "./hybridChatApi";

type AiMessage = {
  body: string;
  id: string;
  imageUri?: string;
  references?: string[];
  role: "assistant" | "user";
};

const initialMessages: AiMessage[] = [
  {
    body: "Chào bạn, tôi là trợ lý kỹ thuật sầu riêng DurianCare. Bạn có thể hỏi về VietGAP, dinh dưỡng, cảm biến hoặc gửi ảnh lá để tôi phân tích ngữ cảnh trước khi chuyển kỹ sư.",
    id: "ai-welcome",
    role: "assistant",
  },
];

export function DurianAiAssistantChannel() {
  const listRef = useRef<FlatList<AiMessage>>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [photo, setPhoto] = useState<CameraCapturedPicture | null>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  useEffect(function abortAiRequestOnUnmount() {
    return () => requestRef.current?.abort();
  }, []);

  useEffect(
    function scrollToLatestMessage() {
      const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
      return () => clearTimeout(timer);
    },
    [messages, isThinking],
  );

  async function sendQuestion() {
    const question = draft.trim();
    if ((!question && !photo) || isThinking) return;

    const prompt = question || "Hãy phân tích ảnh lá sầu riêng này và đề xuất bước kiểm tra tiếp theo.";
    const currentPhoto = photo;
    const userMessage: AiMessage = {
      body: prompt,
      id: `ai-user-${Date.now()}`,
      imageUri: currentPhoto?.uri,
      role: "user",
    };
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setPhoto(null);
    setIsThinking(true);

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const reply = await askDurianAssistant(prompt, currentPhoto, controller.signal);
      if (!controller.signal.aborted) {
        setMessages((current) => [
          ...current,
          {
            body: reply.answer,
            id: `ai-assistant-${Date.now()}`,
            references: reply.references,
            role: "assistant",
          },
        ]);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setMessages((current) => [
          ...current,
          {
            body:
              error instanceof Error
                ? error.message
                : "Không thể kết nối trợ lý AI lúc này. Bạn có thể chuyển sang tab Kỹ sư.",
            id: `ai-error-${Date.now()}`,
            role: "assistant",
          },
        ]);
      }
    } finally {
      if (!controller.signal.aborted) setIsThinking(false);
    }
  }

  const renderMessage = useCallback(
    ({ item }: { item: AiMessage }) => <AiMessageBubble message={item} />,
    [],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={84}
      style={styles.flex}
    >
      <FlatList
        ref={listRef}
        contentContainerStyle={styles.messageList}
        data={messages}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          isThinking ? (
            <View style={styles.typingBubble}>
              <ActivityIndicator color={durianTheme.colors.moss} size="small" />
              <Text style={styles.typingText}>LangChain đang tổng hợp tư vấn...</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.aiNotice}>
            <Sparkles color={durianTheme.colors.moss} size={18} />
            <Text style={styles.aiNoticeText}>
              AI hỗ trợ sàng lọc ban đầu. Quyết định phác đồ cần kỹ sư xác nhận.
            </Text>
          </View>
        }
        renderItem={renderMessage}
        showsVerticalScrollIndicator={false}
      />

      {photo ? (
        <View style={styles.attachmentPreview}>
          <Image source={{ uri: photo.uri }} style={styles.attachmentImage} />
          <View style={styles.attachmentCopy}>
            <Text style={styles.attachmentTitle}>Ảnh lá đã sẵn sàng</Text>
            <Text style={styles.attachmentText}>Thêm câu hỏi hoặc gửi để AI phân tích.</Text>
          </View>
          <Pressable
            accessibilityLabel="Gỡ ảnh"
            hitSlop={8}
            onPress={() => setPhoto(null)}
            style={({ pressed }) => [styles.removeAttachment, pressed && styles.pressed]}
          >
            <X color={durianTheme.colors.mossDark} size={18} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.composer}>
        <Pressable
          accessibilityLabel="Chụp ảnh lá"
          hitSlop={8}
          onPress={() => setCameraVisible(true)}
          style={({ pressed }) => [styles.cameraButton, pressed && styles.pressed]}
        >
          <Camera color={durianTheme.colors.moss} size={22} />
        </Pressable>
        <View style={styles.inputShell}>
          {photo ? <ImageIcon color={durianTheme.colors.moss} size={17} /> : null}
          <TextInput
            multiline
            onChangeText={setDraft}
            placeholder="Hỏi trợ lý về vườn sầu riêng..."
            placeholderTextColor={durianTheme.colors.muted}
            style={styles.input}
            value={draft}
          />
        </View>
        <Pressable
          accessibilityLabel="Gửi câu hỏi"
          disabled={(!draft.trim() && !photo) || isThinking}
          hitSlop={6}
          onPress={sendQuestion}
          style={({ pressed }) => [
            styles.sendButton,
            ((!draft.trim() && !photo) || isThinking) && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Send color={durianTheme.colors.mossDark} size={20} />
        </Pressable>
      </View>

      <ChatCameraSheet
        busy={false}
        onClose={() => setCameraVisible(false)}
        onUsePhoto={(nextPhoto) => {
          setPhoto(nextPhoto);
          setCameraVisible(false);
        }}
        visible={cameraVisible}
      />
    </KeyboardAvoidingView>
  );
}

function AiMessageBubble({ message }: { message: AiMessage }) {
  const isUser = message.role === "user";
  const avatar = (
    <View style={[styles.avatar, isUser && styles.userAvatar]}>
      {isUser ? (
        <UserRound color={durianTheme.colors.mossDark} size={18} />
      ) : (
        <Bot color={durianTheme.colors.durianYellow} size={19} />
      )}
    </View>
  );

  return (
    <View style={[styles.messageRow, isUser && styles.userMessageRow]}>
      {!isUser ? avatar : null}
      <View style={[styles.bubble, isUser && styles.userBubble]}>
        {message.imageUri ? (
          <Image source={{ uri: message.imageUri }} resizeMode="cover" style={styles.messageImage} />
        ) : null}
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>
          {message.body}
        </Text>
        {message.references?.length ? (
          <Text style={styles.referenceText}>
            Tham chiếu: {message.references.join(" · ")}
          </Text>
        ) : null}
      </View>
      {isUser ? avatar : null}
    </View>
  );
}

const styles = StyleSheet.create({
  aiNotice: {
    alignItems: "flex-start",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 16,
    flexDirection: "row",
    gap: 9,
    marginBottom: 4,
    padding: 12,
  },
  aiNoticeText: {
    color: durianTheme.colors.moss,
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 17,
  },
  attachmentCopy: { flex: 1 },
  attachmentImage: { borderRadius: 10, height: 48, width: 48 },
  attachmentPreview: {
    alignItems: "center",
    backgroundColor: "#FFF8D9",
    borderTopColor: durianTheme.colors.durianYellow,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  attachmentText: {
    color: durianTheme.colors.muted,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  attachmentTitle: {
    color: durianTheme.colors.ink,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossDark,
    borderRadius: 15,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  bubble: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: "#E6E2D2",
    borderRadius: 18,
    borderTopLeftRadius: 6,
    borderWidth: 1,
    gap: 7,
    maxWidth: "82%",
    overflow: "hidden",
    padding: 13,
  },
  cameraButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 22,
    height: 46,
    justifyContent: "center",
    width: 46,
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
  disabled: { opacity: 0.42 },
  flex: { flex: 1 },
  input: {
    color: durianTheme.colors.ink,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    maxHeight: 100,
    minHeight: 24,
    paddingVertical: 0,
  },
  inputShell: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.canvas,
    borderRadius: 19,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 46,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  messageImage: { borderRadius: 12, height: 180, width: 230 },
  messageList: { gap: 12, padding: 13, paddingBottom: 20 },
  messageRow: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  messageText: {
    color: durianTheme.colors.ink,
    fontSize: 14,
    lineHeight: 21,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.97 }] },
  referenceText: {
    color: durianTheme.colors.moss,
    fontSize: 10,
    fontStyle: "italic",
    lineHeight: 15,
  },
  removeAttachment: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 22,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  typingBubble: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 16,
    flexDirection: "row",
    gap: 9,
    marginTop: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  typingText: {
    color: durianTheme.colors.muted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  userAvatar: { backgroundColor: durianTheme.colors.durianYellow },
  userBubble: {
    backgroundColor: durianTheme.colors.moss,
    borderColor: durianTheme.colors.moss,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 6,
  },
  userMessageRow: { justifyContent: "flex-end" },
  userMessageText: { color: durianTheme.colors.white },
});
