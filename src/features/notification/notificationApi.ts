import type { AxiosRequestConfig } from "axios";

import { authorizedRequest } from "@/src/features/auth/authApi";
import { getApiBaseUrl } from "@/src/lib/apiBase";

import type {
  NotificationApiErrorBody,
  NotificationCountResponse,
  NotificationPageResponse,
  NotificationSortBy,
  NotificationSortDirection,
} from "./types";

export class NotificationApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: NotificationApiErrorBody,
  ) {
    super(message);
    this.name = "NotificationApiError";
  }
}

type NotificationQuery = {
  page?: number;
  size?: number;
  sortBy?: NotificationSortBy;
  sortDirection?: NotificationSortDirection;
};

function buildQuery(query: NotificationQuery) {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 0));
  params.set("size", String(query.size ?? 20));
  params.set("sortBy", query.sortBy ?? "createdAt");
  params.set("sortDirection", query.sortDirection ?? "desc");
  return params.toString();
}

async function requestJson<T>(config: AxiosRequestConfig) {
  try {
    const response = await authorizedRequest<T>(config);
    return response.data;
  } catch (error) {
    throw normalizeNotificationError(error);
  }
}

async function requestVoid(config: AxiosRequestConfig) {
  try {
    await authorizedRequest(config);
  } catch (error) {
    throw normalizeNotificationError(error);
  }
}

export const notificationClient = {
  count: () =>
    requestJson<NotificationCountResponse>({
      baseURL: getApiBaseUrl(),
      method: "GET",
      url: "/api/v1/notification/notifications/count",
    }),
  list: (query: NotificationQuery = {}) =>
    requestJson<NotificationPageResponse>({
      baseURL: getApiBaseUrl(),
      method: "GET",
      url: `/api/v1/notification/notifications?${buildQuery(query)}`,
    }),
  unread: (query: NotificationQuery = {}) =>
    requestJson<NotificationPageResponse>({
      baseURL: getApiBaseUrl(),
      method: "GET",
      url: `/api/v1/notification/notifications/unread?${buildQuery(query)}`,
    }),
  markRead: (id: string) =>
    requestVoid({
      baseURL: getApiBaseUrl(),
      method: "PATCH",
      url: `/api/v1/notification/notifications/${encodeURIComponent(id)}/read`,
    }),
  markAllRead: () =>
    requestVoid({
      baseURL: getApiBaseUrl(),
      method: "PATCH",
      url: "/api/v1/notification/notifications/read-all",
    }),
  delete: (id: string) =>
    requestVoid({
      baseURL: getApiBaseUrl(),
      method: "DELETE",
      url: `/api/v1/notification/notifications/${encodeURIComponent(id)}`,
    }),
};

function normalizeNotificationError(error: unknown) {
  if (error instanceof NotificationApiError) return error;
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as {
      response?: {
        data?: NotificationApiErrorBody;
        status?: number;
        statusText?: string;
      };
      message?: string;
    };
    const body = axiosError.response?.data;
    const status = axiosError.response?.status ?? 500;
    const message =
      body?.message ??
      axiosError.message ??
      axiosError.response?.statusText ??
      "Không thể tải dữ liệu thông báo.";
    return new NotificationApiError(message, status, body);
  }
  return new NotificationApiError("Không thể tải dữ liệu thông báo.", 500);
}
