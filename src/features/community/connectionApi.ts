import { authorizedRequest, normalizeAuthError } from "@/src/features/auth/authApi";

export type ConnectionRelationStatus =
  | "NONE"
  | "REQUEST_SENT"
  | "REQUEST_RECEIVED"
  | "CONNECTED"
  | "BLOCKED";

export type ConnectionUser = {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  avatar: string | null;
  role: string;
  status: string;
  region: string | null;
  specialization: string | null;
  relationStatus: ConnectionRelationStatus;
  connectionId: string | null;
};

export type UserConnection = {
  id: string;
  status: string;
  user: ConnectionUser;
  createdAt: string;
};

type PageResponse<T> = {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

async function request<T>(config: Parameters<typeof authorizedRequest<T>>[0]) {
  try {
    const response = await authorizedRequest<T>(config);
    return response.data;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export const connectionApi = {
  communityUsers: (query: string) => {
    const params = new URLSearchParams({ page: "0", size: "24" });
    if (query.trim()) params.set("query", query.trim());
    return request<PageResponse<ConnectionUser>>({
      method: "GET",
      url: `/api/community/users?${params.toString()}`,
    });
  },
  searchByPhone: (phoneNumber: string) =>
    request<ConnectionUser | null>({
      method: "GET",
      url: `/api/connections/search?phoneNumber=${encodeURIComponent(phoneNumber)}`,
    }),
  incoming: () =>
    request<UserConnection[]>({
      method: "GET",
      url: "/api/connections/requests/incoming",
    }),
  outgoing: () =>
    request<UserConnection[]>({
      method: "GET",
      url: "/api/connections/requests/outgoing",
    }),
  connections: () =>
    request<PageResponse<UserConnection>>({
      method: "GET",
      url: "/api/connections?page=0&size=24",
    }),
  sendRequest: (receiverId: string, source: "PHONE_SEARCH" | "COMMUNITY") =>
    request<UserConnection>({
      method: "POST",
      url: "/api/connections/requests",
      data: { receiverId, source },
    }),
  accept: (connectionId: string) =>
    request<UserConnection>({
      method: "PATCH",
      url: `/api/connections/requests/${encodeURIComponent(connectionId)}/accept`,
    }),
  reject: (connectionId: string) =>
    request<UserConnection>({
      method: "PATCH",
      url: `/api/connections/requests/${encodeURIComponent(connectionId)}/reject`,
    }),
  cancel: (connectionId: string) =>
    request<UserConnection>({
      method: "PATCH",
      url: `/api/connections/requests/${encodeURIComponent(connectionId)}/cancel`,
    }),
  disconnect: (connectionId: string) =>
    request<UserConnection>({
      method: "DELETE",
      url: `/api/connections/${encodeURIComponent(connectionId)}`,
    }),
};
