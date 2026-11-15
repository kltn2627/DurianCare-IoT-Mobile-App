import { authorizedRequest, normalizeAuthError } from "@/src/features/auth/authApi";

import type { IotAlert, IotDevice } from "./types";

/** Device claim, configuration and alert-rule API — same contract as the Web client. */
export type IotMetric = "TEMPERATURE" | "HUMIDITY" | "SOIL_MOISTURE" | "LIGHT";
export type IotSeverity = "INFO" | "WARNING" | "CRITICAL";
export type IotLatestMetric = { value: number; unit: string; measuredAt: string | null } | null;

export type IotDeviceDetail = IotDevice & {
  deviceType?: "SENSOR" | "CAMERA";
  firmwareVersion?: string | null;
  provisioningStatus?: "PROVISIONED" | "CLAIMED";
  claimedAt?: string | null;
  latestByMetric?: {
    temperature: IotLatestMetric; humidity: IotLatestMetric; soilMoisture: IotLatestMetric; light: IotLatestMetric;
    /** Latest probe verdict (firmware >= 1.4.0); when newer than the last valid percentage, soilMoisture is null. */
    soilSensor?: { status: string; raw: number | null; measuredAt: string | null } | null;
  };
};

export type IotDeviceConfig = {
  deviceId: string;
  publishIntervalSeconds: number | null;
  alertsEnabled: boolean;
  configVersion: number | null;
  deliveryStatus: "NOT_CONFIGURED" | "PENDING" | "DELIVERED" | "APPLIED";
  appliedAt: string | null;
  deviceSupportsRemoteConfig: boolean;
};

export type IotAlertRule = {
  id: string;
  farmId: string;
  cultivationAreaId: string | null;
  deviceId: string | null;
  metric: IotMetric;
  minValue: number | null;
  maxValue: number | null;
  hysteresis: number;
  severity: IotSeverity;
  enabled: boolean;
  scope: "FARM" | "ZONE" | "DEVICE";
};

export type IotDefaultRule = { metric: IotMetric; minValue: number | null; maxValue: number | null };

async function request<T>(config: Parameters<typeof authorizedRequest<T>>[0]) {
  try {
    return (await authorizedRequest<T>(config)).data;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

const enc = encodeURIComponent;

export const iotLifecycleApi = {
  claimDevice: (data: { deviceUid: string; claimCode: string; farmId: string; cultivationAreaId: string | null; name: string | null }) =>
    request<{ device: IotDeviceDetail }>({ method: "POST", url: "/api/iot/devices/claim", data }),
  getDevice: (id: string) => request<{ device: IotDeviceDetail; openAlerts: IotAlert[] }>({ method: "GET", url: `/api/iot/devices/${enc(id)}` }),
  getConfig: (id: string) => request<{ config: IotDeviceConfig }>({ method: "GET", url: `/api/iot/devices/${enc(id)}/config` }),
  saveConfig: (id: string, data: { publishIntervalSeconds: number; alertsEnabled: boolean }) =>
    request<{ config: IotDeviceConfig }>({ method: "PUT", url: `/api/iot/devices/${enc(id)}/config`, data }),
  listRules: (farmId: string, cultivationAreaId: string | null) => {
    const params = new URLSearchParams({ farmId });
    if (cultivationAreaId) params.set("cultivationAreaId", cultivationAreaId);
    return request<{ rules: IotAlertRule[]; defaults: IotDefaultRule[] }>({ method: "GET", url: `/api/iot/alert-rules?${params}` });
  },
  createRule: (data: {
    farmId: string; cultivationAreaId: string | null; metric: IotMetric; minValue: number | null; maxValue: number | null;
    hysteresis: number; severity: IotSeverity; notify: boolean;
  }) => request<{ rule: IotAlertRule }>({ method: "POST", url: "/api/iot/alert-rules", data }),
  updateRule: (id: string, data: { enabled: boolean }) =>
    request<{ rule: IotAlertRule }>({ method: "PATCH", url: `/api/iot/alert-rules/${enc(id)}`, data }),
  deleteRule: (id: string) => request<{ deleted: boolean }>({ method: "DELETE", url: `/api/iot/alert-rules/${enc(id)}` }),
};

export const METRIC_LABELS: Record<IotMetric, string> = {
  TEMPERATURE: "Nhiệt độ không khí", HUMIDITY: "Độ ẩm không khí", SOIL_MOISTURE: "Độ ẩm đất", LIGHT: "Ánh sáng",
};
export const SEVERITY_LABELS: Record<IotSeverity, string> = { INFO: "Thông tin", WARNING: "Cảnh báo", CRITICAL: "Nghiêm trọng" };
export const DELIVERY_LABELS: Record<IotDeviceConfig["deliveryStatus"], string> = {
  NOT_CONFIGURED: "Chưa cấu hình",
  PENDING: "Đã lưu, chờ gửi tới thiết bị",
  DELIVERED: "Đã gửi, chờ thiết bị xác nhận",
  APPLIED: "Thiết bị đã áp dụng",
};

/** Vietnamese message for an IoT device error; backend text is never shown raw. */
export function lifecycleMessage(error: unknown, fallback: string) {
  const status = error && typeof error === "object" && "status" in error ? Number((error as { status?: number }).status) : 0;
  const text = error instanceof Error ? error.message : "";
  const byStatus: Record<number, string> = {
    400: "Thông tin chưa đúng. Vui lòng kiểm tra mã thiết bị, mã kích hoạt và các giá trị đã nhập.",
    401: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    403: "Bạn không có quyền với vườn hoặc khu này.",
    404: "Không tìm thấy thiết bị.",
    409: /claimed/i.test(text) ? "Thiết bị này đã được kích hoạt trước đó."
      : /rule/i.test(text) ? "Đã có ngưỡng cho chỉ số này ở phạm vi này." : "Dữ liệu đã thay đổi. Vui lòng tải lại.",
    410: "Mã kích hoạt đã hết hạn. Vui lòng xin mã mới.",
    429: "Nhập sai mã quá nhiều lần. Vui lòng xin mã kích hoạt mới.",
  };
  if (status >= 500) return "Dịch vụ IoT đang gặp lỗi. Vui lòng thử lại sau.";
  return byStatus[status] ?? fallback;
}

export function validateRule(metric: IotMetric, min: number | null, max: number | null, hysteresis: number) {
  const bounds: Record<IotMetric, [number, number]> = { TEMPERATURE: [-20, 70], HUMIDITY: [0, 100], SOIL_MOISTURE: [0, 100], LIGHT: [0, 100000] };
  const [lo, hi] = bounds[metric];
  if (min === null && max === null) return "Nhập ít nhất một ngưỡng (thấp hoặc cao).";
  for (const value of [min, max]) {
    if (value !== null && (!Number.isFinite(value) || value < lo || value > hi)) return `Ngưỡng phải nằm trong khoảng ${lo}–${hi}.`;
  }
  if (min !== null && max !== null && min >= max) return "Ngưỡng thấp phải nhỏ hơn ngưỡng cao.";
  if (!Number.isFinite(hysteresis) || hysteresis < 0) return "Vùng đệm phải lớn hơn hoặc bằng 0.";
  if (min !== null && max !== null && hysteresis * 2 >= max - min) return "Vùng đệm quá lớn so với khoảng ngưỡng.";
  return null;
}
