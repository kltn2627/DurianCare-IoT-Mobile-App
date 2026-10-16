export type FarmPermissionType =
  | "VIEW_FARM"
  | "VIEW_CULTIVATION_AREA"
  | "VIEW_SENSOR_DATA"
  | "VIEW_ALERTS"
  | "VIEW_DEVICES"
  | "VIEW_CARE_SCHEDULE"
  | "CREATE_CARE_SCHEDULE"
  | "UPDATE_CARE_SCHEDULE"
  | "DELETE_CARE_SCHEDULE"
  | "REQUEST_IRRIGATION_CONTROL"
  | "CONTROL_IRRIGATION"
  | "CHAT_WITH_OWNER"
  | "READ_IOT"
  | "READ_DISEASE"
  | "CREATE_PROTOCOL"
  | "UPDATE_PROTOCOL"
  | "CONFIGURE_DEVICE";

export type AuthorizationStatus = "ACTIVE" | "REVOKED" | "EXPIRED";
export type AgronomistInvitationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "EXPIRED";

export type AgronomistSummary = {
  avatarUrl?: string | null;
  eligible: boolean;
  email?: string | null;
  fullName: string;
  id: string;
  provinceCity?: string | null;
  role: string;
  specialization?: string | null;
  workplace?: string | null;
  yearsExperience?: number | null;
};

export type AgronomistInvitation = {
  agronomistId: string;
  createdAt: string;
  expiresAt?: string | null;
  farmId: string;
  id: string;
  initialAllowedCultivationAreaIds: string[];
  initialPermissions: FarmPermissionType[];
  message?: string | null;
  ownerId: string;
  respondedAt?: string | null;
  status: AgronomistInvitationStatus;
};

export type FarmAuthorization = {
  agronomistId: string;
  allowedCultivationAreaIds: string[];
  createdAt: string;
  expiresAt?: string | null;
  farmId: string;
  grantedAt?: string | null;
  id: string;
  ownerId: string;
  permissions: FarmPermissionType[];
  revokedAt?: string | null;
  status: AuthorizationStatus;
  updatedAt: string;
  version?: number | null;
};

export type AuthorizedFarmAccess = {
  allowedCultivationAreaIds: string[];
  authorizationId: string;
  expiresAt?: string | null;
  farmId: string;
  farmName?: string | null;
  grantedAt?: string | null;
  ownerId: string;
  permissions: FarmPermissionType[];
  status: AuthorizationStatus;
};

export type CreateAgronomistInvitationRequest = {
  agronomistId: string;
  expiresAt?: string | null;
  initialAllowedCultivationAreaIds?: string[];
  initialPermissions?: FarmPermissionType[];
  message?: string | null;
};

export type UpdateFarmAuthorizationRequest = {
  allowedCultivationAreaIds: string[];
  expiresAt?: string | null;
  permissions: FarmPermissionType[];
};

export type RejectAgronomistInvitationRequest = {
  reason?: string | null;
};
