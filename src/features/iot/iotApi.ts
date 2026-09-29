import { authorizedRequest, normalizeAuthError } from "@/src/features/auth/authApi";

import type {
  IotAlertListResponse,
  IotAlertResponse,
  IotDeviceMutationRequest,
  IotDeviceListResponse,
  IotDeviceResponse,
  IotTelemetryHistoryResponse,
  IotTelemetryLatestResponse,
} from "./types";

type HistoryQuery = {
  from?: string;
  limit?: number;
  to?: string;
};

async function request<T>(config: Parameters<typeof authorizedRequest<T>>[0]) {
  try {
    const response = await authorizedRequest<T>(config);
    return response.data;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

function historyQuery(query: HistoryQuery) {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.limit) params.set("limit", String(query.limit));
  const text = params.toString();
  return text ? `?${text}` : "";
}

export const iotApi = {
  listAlerts: (status = "ALERTING") =>
    request<IotAlertListResponse>({
      method: "GET",
      url: `/api/iot/alerts?status=${encodeURIComponent(status)}`,
    }),
  acknowledgeAlert: (alertId: string) =>
    request<IotAlertResponse>({
      method: "POST",
      url: `/api/iot/alerts/${encodeURIComponent(alertId)}/acknowledge`,
    }),
  listDevices: () =>
    request<IotDeviceListResponse>({
      method: "GET",
      url: "/api/iot/devices",
    }),
  getDevice: (deviceId: string) =>
    request<IotDeviceResponse>({
      method: "GET",
      url: `/api/iot/devices/${encodeURIComponent(deviceId)}`,
    }),
  registerDevice: (body: IotDeviceMutationRequest) =>
    request<IotDeviceResponse>({
      data: body,
      method: "POST",
      url: "/api/iot/devices",
    }),
  updateDevice: (deviceId: string, body: IotDeviceMutationRequest) =>
    request<IotDeviceResponse>({
      data: body,
      method: "PATCH",
      url: `/api/iot/devices/${encodeURIComponent(deviceId)}`,
    }),
  deleteDevice: (deviceId: string) =>
    request<IotDeviceResponse>({
      method: "DELETE",
      url: `/api/iot/devices/${encodeURIComponent(deviceId)}`,
    }),
  latestTelemetry: (deviceId: string) =>
    request<IotTelemetryLatestResponse>({
      method: "GET",
      url: `/api/iot/devices/${encodeURIComponent(deviceId)}/telemetry/latest`,
    }),
  telemetryHistory: (deviceId: string, query: HistoryQuery = {}) =>
    request<IotTelemetryHistoryResponse>({
      method: "GET",
      url: `/api/iot/devices/${encodeURIComponent(deviceId)}/telemetry${historyQuery(query)}`,
    }),
};
