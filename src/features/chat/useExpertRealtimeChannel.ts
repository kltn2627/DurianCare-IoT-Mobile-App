import { useCallback, useEffect, useRef, useState } from "react";

import type { ChatMessage } from "@/src/workspace/types";

export type ExpertRealtimeStatus =
  | "not-configured"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline";

type SocketEnvelope = {
  data?: unknown;
  message?: unknown;
  payload?: unknown;
  type?: unknown;
};

const RECONNECT_DELAY_MS = 3_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMessageKind(value: unknown): value is ChatMessage["kind"] {
  return ["text", "scan-alert", "protocol", "bot", "image", "location"].includes(
    String(value),
  );
}

function normalizeInboundMessage(payload: unknown): ChatMessage | null {
  if (!isRecord(payload)) return null;
  const envelope = payload as SocketEnvelope;
  const candidate = [envelope.data, envelope.message, envelope.payload].find(isRecord) ?? payload;
  if (!isRecord(candidate)) return null;

  const body = typeof candidate.body === "string"
    ? candidate.body
    : typeof candidate.content === "string"
      ? candidate.content
      : "";
  if (!body && typeof candidate.imageUri !== "string") return null;

  const rawRole = candidate.role ?? candidate.senderRole;
  const role: ChatMessage["role"] =
    rawRole === "OWNER" || rawRole === "BOT" ? rawRole : "ENGINEER";

  return {
    author:
      typeof candidate.author === "string"
        ? candidate.author
        : typeof candidate.senderName === "string"
          ? candidate.senderName
          : role === "ENGINEER"
            ? "Kỹ sư DurianCare"
            : "Chủ vườn",
    body,
    createdAt:
      typeof candidate.createdAt === "string"
        ? candidate.createdAt
        : new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
    id:
      typeof candidate.id === "string"
        ? candidate.id
        : typeof candidate.messageId === "string"
          ? candidate.messageId
          : `socket-${Date.now()}`,
    imageUri:
      typeof candidate.imageUri === "string"
        ? candidate.imageUri
        : typeof candidate.imageUrl === "string"
          ? candidate.imageUrl
          : undefined,
    kind: isMessageKind(candidate.kind) ? candidate.kind : "text",
    protocol: Array.isArray(candidate.protocol)
      ? (candidate.protocol as ChatMessage["protocol"])
      : undefined,
    role,
    zoneLabel:
      typeof candidate.zoneLabel === "string"
        ? candidate.zoneLabel
        : typeof candidate.zone === "string"
          ? candidate.zone
          : undefined,
  };
}

function buildSocketUrl(token?: string): string | null {
  const configuredUrl = process.env.EXPO_PUBLIC_EXPERT_WS_URL?.trim();
  if (!configuredUrl) return null;

  const separator = configuredUrl.includes("?") ? "&" : "?";
  return token
    ? `${configuredUrl}${separator}access_token=${encodeURIComponent(token)}`
    : configuredUrl;
}

export function useExpertRealtimeChannel({
  onMessage,
  token,
}: {
  onMessage: (message: ChatMessage) => void;
  token?: string;
}) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);
  const onMessageRef = useRef(onMessage);
  const [status, setStatus] = useState<ExpertRealtimeStatus>("connecting");

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(
    function connectExpertChannel() {
      const socketUrl = buildSocketUrl(token);
      if (!socketUrl) {
        setStatus("not-configured");
        return undefined;
      }

      shouldReconnectRef.current = true;

      function connect(isRetry = false) {
        setStatus(isRetry ? "reconnecting" : "connecting");
        const socket = new WebSocket(socketUrl as string);
        socketRef.current = socket;

        socket.onopen = () => {
          setStatus("connected");
          socket.send(JSON.stringify({ type: "channel.join", channel: "farm-support" }));
        };

        socket.onmessage = (event) => {
          try {
            const parsed: unknown = JSON.parse(String(event.data));
            const message = normalizeInboundMessage(parsed);
            if (message) onMessageRef.current(message);
          } catch {
            // Ignore malformed transport frames without taking down the chat screen.
          }
        };

        socket.onerror = () => setStatus("offline");
        socket.onclose = () => {
          socketRef.current = null;
          if (!shouldReconnectRef.current) return;
          setStatus("reconnecting");
          reconnectTimerRef.current = setTimeout(() => connect(true), RECONNECT_DELAY_MS);
        };
      }

      connect();

      return () => {
        shouldReconnectRef.current = false;
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        socketRef.current?.close();
        socketRef.current = null;
      };
    },
    [token],
  );

  const send = useCallback(function sendRealtimeMessage(message: ChatMessage): boolean {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return false;
    socketRef.current.send(
      JSON.stringify({
        channel: "farm-support",
        data: message,
        type: "chat.message",
      }),
    );
    return true;
  }, []);

  return { send, status };
}
