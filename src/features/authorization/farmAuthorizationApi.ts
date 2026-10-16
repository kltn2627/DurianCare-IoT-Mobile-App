import { authorizedRequest, normalizeAuthError } from "@/src/features/auth/authApi";
import type {
  AgronomistInvitation,
  AgronomistSummary,
  AuthorizedFarmAccess,
  CreateAgronomistInvitationRequest,
  FarmAuthorization,
  RejectAgronomistInvitationRequest,
  UpdateFarmAuthorizationRequest,
} from "@/src/features/authorization/farmAuthorizationTypes";

async function request<T>(config: Parameters<typeof authorizedRequest<T>>[0]) {
  try {
    const response = await authorizedRequest<T>(config);
    return response.data;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export const farmAuthorizationApi = {
  acceptInvitation: (invitationId: string) =>
    request<FarmAuthorization>({
      method: "POST",
      url: `/api/v1/agronomist-invitations/${encodeURIComponent(invitationId)}/accept`,
    }),
  cancelInvitation: (invitationId: string) =>
    request<{ message: string }>({
      method: "DELETE",
      url: `/api/v1/agronomist-invitations/${encodeURIComponent(invitationId)}`,
    }),
  createInvitation: (farmId: string, body: CreateAgronomistInvitationRequest) =>
    request<AgronomistInvitation>({
      data: body,
      method: "POST",
      url: `/api/v1/farms/${encodeURIComponent(farmId)}/agronomist-invitations`,
    }),
  listAuthorizedFarms: () =>
    request<AuthorizedFarmAccess[]>({
      method: "GET",
      url: "/api/v1/me/authorized-farms",
    }),
  listFarmAuthorizations: (farmId: string) =>
    request<FarmAuthorization[]>({
      method: "GET",
      url: `/api/v1/farms/${encodeURIComponent(farmId)}/agronomist-authorizations`,
    }),
  listFarmInvitations: (farmId: string) =>
    request<AgronomistInvitation[]>({
      method: "GET",
      url: `/api/v1/farms/${encodeURIComponent(farmId)}/agronomist-invitations`,
    }),
  listMyInvitations: () =>
    request<AgronomistInvitation[]>({
      method: "GET",
      url: "/api/v1/me/agronomist-invitations",
    }),
  rejectInvitation: (invitationId: string, body: RejectAgronomistInvitationRequest) =>
    request<AgronomistInvitation>({
      data: body,
      method: "POST",
      url: `/api/v1/agronomist-invitations/${encodeURIComponent(invitationId)}/reject`,
    }),
  revokeAuthorization: (authorizationId: string) =>
    request<{ message: string }>({
      method: "DELETE",
      url: `/api/v1/farm-authorizations/${encodeURIComponent(authorizationId)}`,
    }),
  searchAgronomists: (query: string) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    return request<AgronomistSummary[]>({
      method: "GET",
      url: `/api/v1/agronomists${params.toString() ? `?${params.toString()}` : ""}`,
    });
  },
  updateAuthorization: (authorizationId: string, body: UpdateFarmAuthorizationRequest) =>
    request<FarmAuthorization>({
      data: body,
      method: "PATCH",
      url: `/api/v1/farm-authorizations/${encodeURIComponent(authorizationId)}`,
    }),
};
