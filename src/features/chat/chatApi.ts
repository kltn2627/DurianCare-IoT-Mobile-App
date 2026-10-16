import { authorizedRequest, normalizeAuthError } from "@/src/features/auth/authApi";

import type {
  ChatConversation,
  ChatListResponse,
  ChatConversationStatus,
  CreateConversationRequest,
  PublishRegimenRequest,
  SendMessageRequest,
} from "./chatTypes";

async function request<T>(config: Parameters<typeof authorizedRequest<T>>[0]) {
  try {
    const response = await authorizedRequest<T>(config);
    return response.data;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export const chatApi = {
  listConversations: (peerPhone?: string) => {
    const params = new URLSearchParams();
    if (peerPhone?.trim()) params.set("peerPhone", peerPhone.trim());
    const query = params.toString();
    return request<ChatListResponse>({
      method: "GET",
      url: `/api/chat/conversations${query ? `?${query}` : ""}`,
    });
  },
  createConversation: (body: CreateConversationRequest) =>
    request<{ conversation: ChatConversation }>({
      method: "POST",
      url: "/api/chat/conversations",
      data: body,
    }),
  sendMessage: (conversationId: string, body: SendMessageRequest) =>
    request<{ conversation: ChatConversation }>({
      method: "POST",
      url: `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
      data: body,
    }),
  markRead: (conversationId: string) =>
    request<{ conversation: ChatConversation }>({
      method: "POST",
      url: `/api/chat/conversations/${encodeURIComponent(conversationId)}/read`,
    }),
  setStatus: (conversationId: string, status: ChatConversationStatus) =>
    request<{ conversation: ChatConversation }>({
      method: "PATCH",
      url: `/api/chat/conversations/${encodeURIComponent(conversationId)}/status`,
      data: { status },
    }),
  publishRegimen: (conversationId: string, body: PublishRegimenRequest) =>
    request<{ conversation: ChatConversation }>({
      method: "POST",
      url: `/api/chat/conversations/${encodeURIComponent(conversationId)}/regimens`,
      data: body,
    }),
  updateRegimenStep: (
    conversationId: string,
    messageId: string,
    day: number,
    completed: boolean,
  ) =>
    request<{ conversation: ChatConversation }>({
      method: "PATCH",
      url: `/api/chat/conversations/${encodeURIComponent(
        conversationId,
      )}/regimens/${encodeURIComponent(messageId)}/steps/${encodeURIComponent(String(day))}`,
      data: { completed },
    }),
  deleteConversation: (conversationId: string) =>
    request<{ conversationId: string }>({
      method: "DELETE",
      url: `/api/chat/conversations/${encodeURIComponent(conversationId)}`,
    }),
};

