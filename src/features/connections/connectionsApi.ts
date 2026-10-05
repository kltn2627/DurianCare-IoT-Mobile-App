import { authorizedRequest } from "@/src/features/auth/authApi";
import { getApiBaseUrl } from "@/src/lib/apiBase";

export type ConnectionRelationStatus =
  | "NONE"
  | "REQUEST_SENT"
  | "REQUEST_RECEIVED"
  | "CONNECTED"
  | "BLOCKED";

export type ConnectionUserSummary = {
  id: string;
  fullName: string;
  phoneNumber?: string;
  avatar?: string;
  role?: string;
  status?: string;
  region?: string;
  specialization?: string;
  relationStatus: ConnectionRelationStatus;
  connectionId?: string;
};

export type ConnectionStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "DISCONNECTED";

export type UserConnectionResponse = {
  id: string;
  requesterId: string;
  receiverId: string;
  requesterRole?: string;
  receiverRole?: string;
  status: ConnectionStatus;
  user: ConnectionUserSummary;
  createdAt?: string;
  updatedAt?: string;
  respondedAt?: string;
};

type ConnectionPageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
};

const BASE = () => getApiBaseUrl();

export async function searchUserByPhone(phoneNumber: string): Promise<ConnectionUserSummary> {
  const { data } = await authorizedRequest<ConnectionUserSummary>({
    baseURL: BASE(),
    url: `/api/connections/search`,
    method: "GET",
    params: { phoneNumber },
  });
  return data;
}

export async function browseCommunityUsers(
  query?: string,
  page = 0,
  size = 20,
): Promise<ConnectionPageResponse<ConnectionUserSummary>> {
  const { data } = await authorizedRequest<ConnectionPageResponse<ConnectionUserSummary>>({
    baseURL: BASE(),
    url: `/api/community/users`,
    method: "GET",
    params: { query, page, size },
  });
  return data;
}

export async function sendConnectionRequest(
  receiverId: string,
): Promise<UserConnectionResponse> {
  const { data } = await authorizedRequest<UserConnectionResponse>({
    baseURL: BASE(),
    url: `/api/connections/requests`,
    method: "POST",
    data: { receiverId },
  });
  return data;
}

export async function fetchIncomingRequests(): Promise<UserConnectionResponse[]> {
  const { data } = await authorizedRequest<UserConnectionResponse[]>({
    baseURL: BASE(),
    url: `/api/connections/requests/incoming`,
    method: "GET",
  });
  return data;
}

export async function acceptConnectionRequest(
  connectionId: string,
): Promise<UserConnectionResponse> {
  const { data } = await authorizedRequest<UserConnectionResponse>({
    baseURL: BASE(),
    url: `/api/connections/requests/${connectionId}/accept`,
    method: "PATCH",
  });
  return data;
}

export async function rejectConnectionRequest(
  connectionId: string,
): Promise<UserConnectionResponse> {
  const { data } = await authorizedRequest<UserConnectionResponse>({
    baseURL: BASE(),
    url: `/api/connections/requests/${connectionId}/reject`,
    method: "PATCH",
  });
  return data;
}

export async function cancelConnectionRequest(
  connectionId: string,
): Promise<UserConnectionResponse> {
  const { data } = await authorizedRequest<UserConnectionResponse>({
    baseURL: BASE(),
    url: `/api/connections/requests/${connectionId}/cancel`,
    method: "PATCH",
  });
  return data;
}

export async function fetchConnections(
  page = 0,
  size = 20,
): Promise<ConnectionPageResponse<UserConnectionResponse>> {
  const { data } = await authorizedRequest<ConnectionPageResponse<UserConnectionResponse>>({
    baseURL: BASE(),
    url: `/api/connections`,
    method: "GET",
    params: { page, size },
  });
  return data;
}

export async function disconnectUser(connectionId: string): Promise<UserConnectionResponse> {
  const { data } = await authorizedRequest<UserConnectionResponse>({
    baseURL: BASE(),
    url: `/api/connections/${connectionId}`,
    method: "DELETE",
  });
  return data;
}
