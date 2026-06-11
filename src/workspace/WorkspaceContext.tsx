import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type { ChatMessage, ProtocolDay } from "./types";

type WorkspaceContextValue = {
  messages: ChatMessage[];
  publishProtocol: (days: ProtocolDay[]) => void;
  pushScanAlert: (disease: string, confidence: number) => void;
  receiveExpertMessage: (message: ChatMessage) => void;
  sendExpertImage: (
    imageUri: string,
    body: string,
    author: string,
    role: "OWNER" | "ENGINEER",
    zoneLabel?: string,
  ) => ChatMessage;
  sendGardenLocation: (
    zoneLabel: string,
    author: string,
    role: "OWNER" | "ENGINEER",
  ) => ChatMessage;
  sendMessage: (
    body: string,
    author: string,
    role: "OWNER" | "ENGINEER",
  ) => ChatMessage;
  toggleProtocolDay: (messageId: string, day: number) => void;
};

const initialMessages: ChatMessage[] = [
  {
    author: "Bot lịch canh tác",
    body: "Hệ thống nhắc lịch: Ngày mai bạn có lịch thực hiện Ngày 1 của phác đồ điều trị bệnh Cháy lá tại Khu A.",
    createdAt: "07:30",
    id: "bot-reminder",
    kind: "bot",
    role: "BOT",
  },
  {
    author: "Nguyễn Minh",
    body: "Khu A vừa xuất hiện các vết cháy ở mép lá. Nhờ kỹ sư kiểm tra giúp.",
    createdAt: "08:15",
    id: "owner-opening",
    kind: "text",
    role: "OWNER",
  },
  {
    author: "Kỹ sư Trần An",
    body: "Tôi đã nhận thông tin. Anh chụp thêm một ảnh rõ mặt dưới lá nhé.",
    createdAt: "08:18",
    id: "engineer-reply",
    kind: "text",
    role: "ENGINEER",
  },
];

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  const appendMessage = useCallback(function appendMessage(message: ChatMessage) {
    setMessages((current) =>
      current.some((item) => item.id === message.id) ? current : [...current, message],
    );
  }, []);

  const sendMessage = useCallback(
    function sendMessage(body: string, author: string, role: "OWNER" | "ENGINEER") {
      const message: ChatMessage = {
        author,
        body,
        createdAt: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        id: `message-${Date.now()}`,
        kind: "text",
        role,
      };
      appendMessage(message);
      return message;
    },
    [appendMessage],
  );

  const pushScanAlert = useCallback(
    function pushScanAlert(disease: string, confidence: number) {
      appendMessage({
        author: "DurianCare AI",
        body: `Cảnh báo tại Khu A: phát hiện ${disease} với độ tin cậy ${confidence}%.`,
        createdAt: "Vừa xong",
        id: `scan-${Date.now()}`,
        kind: "scan-alert",
        role: "BOT",
      });
    },
    [appendMessage],
  );

  const sendExpertImage = useCallback(
    function sendExpertImage(
      imageUri: string,
      body: string,
      author: string,
      role: "OWNER" | "ENGINEER",
      zoneLabel?: string,
    ) {
      const message: ChatMessage = {
        author,
        body: body.trim() || "Ảnh hiện trạng lá cần kỹ sư kiểm tra.",
        createdAt: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        id: `expert-image-${Date.now()}`,
        imageUri,
        kind: "image",
        role,
        zoneLabel,
      };
      appendMessage(message);
      return message;
    },
    [appendMessage],
  );

  const sendGardenLocation = useCallback(
    function sendGardenLocation(
      zoneLabel: string,
      author: string,
      role: "OWNER" | "ENGINEER",
    ) {
      const message: ChatMessage = {
        author,
        body: `Đề nghị hỗ trợ tại ${zoneLabel}.`,
        createdAt: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        id: `garden-location-${Date.now()}`,
        kind: "location",
        role,
        zoneLabel,
      };
      appendMessage(message);
      return message;
    },
    [appendMessage],
  );

  const publishProtocol = useCallback(
    function publishProtocol(days: ProtocolDay[]) {
      appendMessage({
        author: "Kỹ sư Trần An",
        body: `Đã thiết lập phác đồ điều trị ${days.length} ngày cho bệnh Cháy lá tại Khu A.`,
        createdAt: "Vừa xong",
        id: `protocol-${Date.now()}`,
        kind: "protocol",
        protocol: days,
        role: "ENGINEER",
      });
    },
    [appendMessage],
  );

  const toggleProtocolDay = useCallback(function toggleProtocolDay(messageId: string, day: number) {
    setMessages((current) =>
      current.map((message) =>
        message.id !== messageId || !message.protocol
          ? message
          : {
              ...message,
              protocol: message.protocol.map((item) =>
                item.day === day ? { ...item, completed: !item.completed } : item,
              ),
            },
      ),
    );
  }, []);

  const receiveExpertMessage = useCallback(
    function receiveExpertMessage(message: ChatMessage) {
      appendMessage(message);
    },
    [appendMessage],
  );

  const value = useMemo(
    () => ({
      messages,
      publishProtocol,
      pushScanAlert,
      receiveExpertMessage,
      sendExpertImage,
      sendGardenLocation,
      sendMessage,
      toggleProtocolDay,
    }),
    [
      messages,
      publishProtocol,
      pushScanAlert,
      receiveExpertMessage,
      sendExpertImage,
      sendGardenLocation,
      sendMessage,
      toggleProtocolDay,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return context;
}
