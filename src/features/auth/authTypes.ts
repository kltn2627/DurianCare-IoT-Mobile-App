export type BackendUserRole = "ADMIN" | "EXPERT" | "FARMER" | "GUEST";

export type AuthProfile = {
  avatarUrl: string | null;
  farmAddress: string | null;
  fullName: string;
  phoneNumber: string | null;
};

export type AuthenticationResponse = {
  accessToken: string;
  accessTokenExpiresIn: number;
  email: string;
  profile: AuthProfile;
  refreshToken: string;
  role: BackendUserRole;
  tokenType: "Bearer" | string;
  userId: string;
};

export type AccessTokenResponse = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
  tokenType: "Bearer" | string;
};

export type RegisterRequest = {
  email: string;
  fullName: string;
  password: string;
  phoneNumber?: string | null;
  role?: "EXPERT" | "FARMER" | null;
};

export type MessageResponse = {
  message: string;
};

export type ApiErrorResponse = {
  error?: string;
  message?: string;
  status?: number;
  timestamp?: string;
};
