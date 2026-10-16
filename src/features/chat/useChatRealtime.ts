import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { getApiBaseUrl } from "@/src/lib/apiBase";
import type { ChatConversation } from "./chatTypes";

export type ChatRealtimeStatus = "connecting" | "connected" | "offline" | "not-configured";

function getChatSocketBaseUrl() {
  return getApiBaseUrl();
}

export function useChatRealtime({
  activeConversationId,
  enabled,
  onConversationDeleted,
  onConversationUpdated,
  token,
}: {
  activeConversationId?: string | null;
  enabled: boolean;
  onConversationDeleted: (conversationId: string) => void;
  onConversationUpdated: (conversation: ChatConversation) => void;
  token?: string | null;
}) {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ChatRealtimeStatus>(
    enabled ? "connecting" : "not-configured",
  );

  useEffect(
    function connectSocket() {
      if (!enabled || !token) {
        setStatus("not-configured");
        return undefined;
      }

      const socket = io(`${getChatSocketBaseUrl()}/chat`, {
        auth: { token },
        reconnection: true,
        transports: ["websocket", "polling"],
      });
      socketRef.current = socket;
      setStatus("connecting");

      socket.on("connect", () => setStatus("connected"));
      socket.on("disconnect", () => setStatus("offline"));
      socket.on("connect_error", () => setStatus("offline"));
      socket.on("conversation.updated", (payload: ChatConversation) => {
        if (payload?.id) onConversationUpdated(payload);
      });
      socket.on("conversation.deleted", (payload: { conversationId?: string } | string) => {
        const conversationId =
          typeof payload === "string" ? payload : payload?.conversationId;
        if (conversationId) onConversationDeleted(conversationId);
      });

      return () => {
        socket.removeAllListeners();
        socket.disconnect();
        socketRef.current = null;
      };
    },
    [enabled, onConversationDeleted, onConversationUpdated, token],
  );

  useEffect(
    function joinActiveRoom() {
      if (!activeConversationId || !socketRef.current?.connected) return;
      socketRef.current.emit("room.join", { roomId: activeConversationId });
    },
    [activeConversationId, status],
  );

  return { status };
}
