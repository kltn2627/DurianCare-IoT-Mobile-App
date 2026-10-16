import { AlertCircle, Bot, RotateCw, Send, Sparkles, UserRound } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { durianTheme } from "@/src/theme/durianTheme";

import { askDurianAssistant } from "./hybridChatApi";

type AiMessage = {
  body: string;
  id: string;
  role: "assistant" | "user";
  sources?: string[];
};

const initialMessages: AiMessage[] = [
  {
    body: "Chào bạn, tôi là trợ lý kỹ thuật sầu riêng DurianCare. Bạn có thể hỏi về VietGAP, dinh dưỡng, cảm biến, sâu bệnh hoặc quy trình chăm sóc trong tri thức DurianCare.",
    id: "ai-welcome",
    role: "assistant",
  },
];

export function DurianAiAssistantChannel() {
  const listRef = useRef<FlatList<AiMessage>>(null);
  const requestRef = useRef<AbortController | null>(null);
  const lastPromptRef = useRef<string | null>(null);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(function abortAiRequestOnUnmount() {
    return () => requestRef.current?.abort();
  }, []);

  useEffect(
    function scrollToLatestMessage() {
      const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
      return () => clearTimeout(timer);
    },
    [messages, isThinking, errorMessage],
  );

  const sendQuestion = useCallback(
    async function sendQuestion(nextQuestion?: string) {
      const question = (nextQuestion ?? draft).trim();
      if (!question || isThinking) return;

      if (!nextQuestion) {
        const userMessage: AiMessage = {
          body: question,
          id: `ai-user-${Date.now()}`,
          role: "user",
        };
        setMessages((current) => [...current, userMessage]);
      }
      lastPromptRef.current = question;
      setDraft("");
      setErrorMessage(null);
      setIsThinking(true);

      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;

      try {
        const reply = await askDurianAssistant(question, controller.signal);
        if (!controller.signal.aborted) {
          setMessages((current) => [
            ...current,
            {
              body: reply.answer,
              id: `ai-assistant-${Date.now()}`,
              role: "assistant",
              sources: reply.sources,
            },
          ]);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Không thể kết nối trợ lý AI lúc này. Bạn có thể thử lại sau.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setIsThinking(false);
      }
    },
    [draft, isThinking],
  );

  const retryLastQuestion = useCallback(() => {
    if (lastPromptRef.current) {
      void sendQuestion(lastPromptRef.current);
    }
  }, [sendQuestion]);

  const renderMessage = useCallback(
    ({ item }: { item: AiMessage }) => <AiMessageBubble message={item} />,
    [],
  );

  const canSend = draft.trim().length > 0 && !isThinking;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
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
              <Text style={styles.typingText}>RAG đang tổng hợp câu trả lời...</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.aiNotice}>
            <Sparkles color={durianTheme.colors.moss} size={18} />
            <Text style={styles.aiNoticeText}>
              AI hỗ trợ tham khảo từ tri thức DurianCare. Quyết định phác đồ cần kỹ sư xác nhận.
            </Text>
          </View>
        }
        renderItem={renderMessage}
        showsVerticalScrollIndicator={false}
      />

      {errorMessage ? (
        <View style={styles.errorPanel}>
          <AlertCircle color={durianTheme.colors.danger} size={18} />
          <Text style={styles.errorText}>{errorMessage}</Text>
          {lastPromptRef.current ? (
            <Pressable
              accessibilityLabel="Thử lại câu hỏi"
              hitSlop={8}
              onPress={retryLastQuestion}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            >
              <RotateCw color={durianTheme.colors.moss} size={16} />
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.composer}>
        <View style={styles.inputShell}>
          <TextInput
            multiline
            onChangeText={setDraft}
            placeholder="Hỏi trợ lý về kỹ thuật sầu riêng..."
            placeholderTextColor={durianTheme.colors.muted}
            style={styles.input}
            value={draft}
          />
        </View>
        <Pressable
          accessibilityLabel="Gửi câu hỏi"
          disabled={!canSend}
          hitSlop={6}
          onPress={() => void sendQuestion()}
          style={({ pressed }) => [
            styles.sendButton,
            !canSend && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Send color={durianTheme.colors.mossDark} size={20} />
        </Pressable>
      </View>
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
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>
          {message.body}
        </Text>
        {message.sources?.length ? (
          <Text style={styles.sourceText}>Nguồn: {message.sources.join(" · ")}</Text>
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
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  bubble: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.mist,
    borderRadius: 18,
    borderTopLeftRadius: 6,
    borderWidth: 1,
    flexShrink: 1,
    gap: 8,
    maxWidth: "80%",
    padding: 12,
  },
  composer: {
    alignItems: "flex-end",
    backgroundColor: durianTheme.colors.surface,
    borderTopColor: durianTheme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    padding: 14,
  },
  disabled: {
    opacity: 0.45,
  },
  errorPanel: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.dangerSoft,
    borderColor: durianTheme.colors.danger,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    marginBottom: 10,
    marginHorizontal: 14,
    padding: 12,
  },
  errorText: {
    color: durianTheme.colors.danger,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  flex: {
    backgroundColor: durianTheme.colors.canvas,
    flex: 1,
  },
  input: {
    color: durianTheme.colors.ink,
    flex: 1,
    fontSize: 15,
    maxHeight: 110,
    minHeight: 42,
    paddingVertical: Platform.select({ android: 8, default: 10 }),
  },
  inputShell: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surfaceSecondary,
    borderColor: durianTheme.colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: 14,
  },
  messageList: {
    gap: 14,
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 9,
  },
  messageText: {
    color: durianTheme.colors.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.8,
  },
  retryButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  retryText: {
    color: durianTheme.colors.moss,
    fontSize: 12,
    fontWeight: "800",
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  sourceText: {
    color: durianTheme.colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  typingBubble: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.border,
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  typingText: {
    color: durianTheme.colors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  userAvatar: {
    backgroundColor: durianTheme.colors.durianYellow,
  },
  userBubble: {
    backgroundColor: durianTheme.colors.moss,
    borderColor: durianTheme.colors.moss,
    borderRadius: 18,
    borderTopRightRadius: 6,
  },
  userMessageRow: {
    justifyContent: "flex-end",
  },
  userMessageText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
