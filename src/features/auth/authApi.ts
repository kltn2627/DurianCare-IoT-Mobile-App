import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

import {
  clearAuthTokens,
  getCachedAuthTokens,
  loadAuthTokens,
  saveAuthTokens,
  type AuthTokens,
} from "./authTokenStore";
import type {
  AccessTokenResponse,
  ApiErrorBody,
  ApproveExpertResponse,
  AuthenticationResponse,
  EngineerApplicationDetail,
  EngineerApplicationSummary,
  EngineerRegistrationRequest,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  ReviewEngineerApplicationRequest,
  VerifyOtpRequest,
  AuthSession,
} from "./authTypes";
import { getApiBaseUrl } from "@/src/lib/apiBase";

const REFRESH_WINDOW_MS = 60_000;

type RetriableRequest = InternalAxiosRequestConfig & { _authRetry?: boolean };
type SessionInvalidHandler = () => void | Promise<void>;
type QualificationFile = {
  name: string;
  type?: string | null;
  uri: string;
};

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryAfterSeconds?: number,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

const publicAuthClient = axios.create({ timeout: 15_000 });
export const authenticatedApiClient = axios.create({ timeout: 15_000 });

let refreshRequest: Promise<AuthTokens> | null = null;
let sessionInvalidHandler: SessionInvalidHandler | null = null;

export function setSessionInvalidHandler(handler: SessionInvalidHandler | null) {
  sessionInvalidHandler = handler;
}

function expiresAtFromNow(expiresInSeconds: number) {
  return Date.now() + Math.max(0, expiresInSeconds) * 1000;
}

async function availableTokens() {
  return getCachedAuthTokens() ?? loadAuthTokens();
}

async function invalidateSession() {
  await clearAuthTokens();
  await sessionInvalidHandler?.();
}

export async function refreshAuthTokens(): Promise<AuthTokens> {
  if (refreshRequest) return refreshRequest;

  refreshRequest = (async () => {
    const currentTokens = await availableTokens();
    if (!currentTokens?.refreshToken) {
      throw new AuthApiError("Phiên đăng nhập không có refresh token.", 401);
    }
    if (currentTokens.refreshToken.length > 4096) {
      await invalidateSession();
      throw new AuthApiError("Refresh token vượt quá giới hạn hợp lệ.", 401);
    }

    try {
      const response = await publicAuthClient.post<AccessTokenResponse>(
        `${getApiBaseUrl()}/api/auth/refresh`,
        { refreshToken: currentTokens.refreshToken },
      );
      const nextTokens: AuthTokens = {
        accessToken: response.data.accessToken,
        accessTokenExpiresAt: expiresAtFromNow(response.data.expiresIn),
        refreshToken: response.data.refreshToken,
      };
      await saveAuthTokens(nextTokens);
      return nextTokens;
    } catch (error) {
      await invalidateSession();
      throw normalizeAuthError(error);
    } finally {
      refreshRequest = null;
    }
  })();

  return refreshRequest;
}

async function attachAccessToken(config: InternalAxiosRequestConfig) {
  let tokens = await availableTokens();
  if (tokens && tokens.accessTokenExpiresAt - Date.now() <= REFRESH_WINDOW_MS) {
    tokens = await refreshAuthTokens();
  }
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  config.baseURL = getApiBaseUrl();
  return config;
}

async function retryUnauthorized(error: AxiosError) {
  const request = error.config as RetriableRequest | undefined;
  if (error.response?.status !== 401 || !request || request._authRetry) {
    throw normalizeAuthError(error);
  }

  request._authRetry = true;
  try {
    const tokens = await refreshAuthTokens();
    request.headers.Authorization = `Bearer ${tokens.accessToken}`;
    return authenticatedApiClient(request);
  } catch (refreshError) {
    throw normalizeAuthError(refreshError);
  }
}

authenticatedApiClient.interceptors.request.use(attachAccessToken);
authenticatedApiClient.interceptors.response.use(
  (response) => response,
  retryUnauthorized,
);

export async function loginRequest(request: LoginRequest) {
  try {
    const response = await publicAuthClient.post<AuthenticationResponse>(
      `${getApiBaseUrl()}/api/auth/login`,
      request,
    );
    await saveAuthTokens({
      accessToken: response.data.accessToken,
      accessTokenExpiresAt: expiresAtFromNow(response.data.accessTokenExpiresIn),
      refreshToken: response.data.refreshToken,
    });
    return response.data;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export async function registerRequest(request: RegisterRequest) {
  try {
    const response = await publicAuthClient.post<MessageResponse>(
      `${getApiBaseUrl()}/api/auth/register`,
      request,
    );
    return response.data;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export async function registerEngineerRequest(
  request: EngineerRegistrationRequest,
  qualificationFiles: QualificationFile[],
) {
  try {
    const formData = new FormData();
    formData.append("email", request.email);
    formData.append("password", request.password);
    formData.append("fullName", request.fullName);
    formData.append("role", request.role);
    if (request.phoneNumber) formData.append("phoneNumber", request.phoneNumber);
    formData.append("workplace", request.workplace);
    formData.append("specialization", request.specialization);
    formData.append("yearsExperience", String(request.yearsExperience));
    formData.append("biography", request.biography);

    qualificationFiles.forEach((file) => {
      formData.append(
        "qualificationFiles",
        {
          name: file.name,
          type: file.type ?? "application/octet-stream",
          uri: file.uri,
        } as never,
      );
    });

    const response = await publicAuthClient.post<MessageResponse>(
      `${getApiBaseUrl()}/api/auth/register/engineer`,
      formData,
    );
    return response.data;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export async function approveExpertRequest(userId: string) {
  try {
    const response = await authenticatedApiClient.post<ApproveExpertResponse>(
      `/api/auth/admin/users/${encodeURIComponent(userId)}/approve-expert`,
    );
    return response.data;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export async function sessionRequest() {
  try {
    const response = await authenticatedApiClient.get<AuthSession>("/api/auth/session");
    return response.data;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export async function verifyOtpRequest(request: VerifyOtpRequest) {
  try {
    const response = await publicAuthClient.post<MessageResponse>(
      `${getApiBaseUrl()}/api/auth/otp/verify`,
      request,
    );
    return response.data;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export async function resendOtpRequest(email: string) {
  try {
    const response = await publicAuthClient.post<MessageResponse>(
      `${getApiBaseUrl()}/api/auth/otp/resend`,
      { email },
    );
    return response.data;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export async function logoutRequest() {
  try {
    await authenticatedApiClient.post<MessageResponse>("/api/auth/logout");
  } catch (error) {
    const normalized = normalizeAuthError(error);
    if (normalized.status && normalized.status < 500) throw normalized;
  }
}

export async function listEngineerApplications(status?: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const query = params.toString();
  try {
    const response = await authenticatedApiClient.get<EngineerApplicationSummary[]>(
      `/api/auth/admin/engineer-applications${query ? `?${query}` : ""}`,
    );
    return response.data;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export async function getEngineerApplication(applicationId: string) {
  try {
    const response = await authenticatedApiClient.get<EngineerApplicationDetail>(
      `/api/auth/admin/engineer-applications/${encodeURIComponent(applicationId)}`,
    );
    return response.data;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export async function approveEngineerApplication(applicationId: string) {
  try {
    const response = await authenticatedApiClient.post<MessageResponse>(
      `/api/auth/admin/engineer-applications/${encodeURIComponent(applicationId)}/approve`,
    );
    return response.data;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export async function rejectEngineerApplication(
  applicationId: string,
  body: ReviewEngineerApplicationRequest,
) {
  try {
    const response = await authenticatedApiClient.post<MessageResponse>(
      `/api/auth/admin/engineer-applications/${encodeURIComponent(applicationId)}/reject`,
      body,
    );
    return response.data;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export async function authorizedRequest<T>(config: AxiosRequestConfig) {
  return authenticatedApiClient.request<T>(config);
}

export function normalizeAuthError(error: unknown) {
  if (error instanceof AuthApiError) return error;
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    if (__DEV__) {
      console.warn("[DurianCare network]", {
        code: error.code,
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status,
        url: error.config?.url,
      });
    }
    const message =
      error.response?.data?.message ??
      error.response?.data?.error ??
      (error.code === "ECONNABORTED"
        ? "Máy chủ phản hồi quá chậm. Vui lòng thử lại."
        : "Không thể kết nối tới máy chủ DurianCare.");
    return new AuthApiError(
      message,
      error.response?.status,
      error.response?.data?.retryAfterSeconds ??
        parseRetryAfter(error.response?.headers?.["retry-after"]),
      error,
    );
  }
  return new AuthApiError(
    error instanceof Error ? error.message : "Đã xảy ra lỗi xác thực không xác định.",
  );
}

function parseRetryAfter(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds));
  const retryDate = Date.parse(String(value));
  if (Number.isNaN(retryDate)) return undefined;
  return Math.max(0, Math.ceil((retryDate - Date.now()) / 1000));
}
