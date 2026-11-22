import type { CameraDevice } from "@/src/lib/iotApi";

export type CameraTone = "online" | "degraded" | "offline" | "unknown";

export interface CameraStatusView {
  label: string;
  tone: CameraTone;
  /** The latest-frame image is requested only while this is true. */
  canPreview: boolean;
  /** "Chụp ngay" is offered only while this is true. */
  canCapture: boolean;
  message: string | null;
  reasons: string[];
}

const ERROR_MESSAGES: Record<string, string> = {
  CAMERA_INIT_FAILED: "Camera không khởi tạo được (lỗi cảm biến/cáp camera). Thiết bị đang tự thử lại.",
  CAMERA_STREAM_FAILED: "Camera đang kết nối nhưng không chụp được ảnh. Thiết bị đang tự thử lại.",
  HEARTBEAT_TIMEOUT: "Không nhận được tín hiệu từ camera quá 5 phút. Kiểm tra nguồn điện và Wi-Fi tại vườn.",
  WIFI_WEAK: "Sóng Wi-Fi tại camera yếu (dưới −80 dBm): ảnh có thể về chậm.",
  CAPTURE_FAILING: "Camera chụp lỗi nhiều lần liên tiếp. Thiết bị đang tự thử lại.",
};

export function cameraReasonText(code: string): string {
  return ERROR_MESSAGES[code] ?? code;
}

type StatusInput = Pick<CameraDevice, "status"> & Partial<Pick<CameraDevice,
  "lastError" | "statusReasons" | "previewAvailable" | "cameraReady">>;

/** Same mapping as the Web dashboard: the registry (heartbeat + self-test) is the only source of truth. */
export function cameraStatusView(device: StatusInput | null | undefined): CameraStatusView {
  if (!device) return { label: "Chưa có camera", tone: "unknown", canPreview: false, canCapture: false,
    message: "Chưa có camera được cấp quyền.", reasons: [] };
  const reasons = (device.statusReasons ?? []).map(cameraReasonText);
  switch (device.status) {
    case "ONLINE":
      return { label: "Online", tone: "online", canPreview: true, canCapture: true, message: null, reasons };
    case "DEGRADED": {
      // Degraded only by a weak link (the camera itself works): frames still arrive, just slower.
      const working = device.previewAvailable === true && device.cameraReady !== false;
      const primary = device.statusReasons?.[0] ?? device.lastError ?? "CAMERA_STREAM_FAILED";
      return { label: "Hoạt động hạn chế", tone: "degraded", canPreview: working, canCapture: working,
        message: cameraReasonText(working ? primary : device.lastError ?? primary), reasons };
    }
    case "OFFLINE":
      return { label: "Offline", tone: "offline", canPreview: false, canCapture: false,
        message: ERROR_MESSAGES.HEARTBEAT_TIMEOUT, reasons };
    default:
      return { label: "Chưa kết nối", tone: "unknown", canPreview: false, canCapture: false,
        message: "Camera chưa từng gửi tín hiệu tới hệ thống. Xem “Hướng dẫn kết nối thiết bị”.", reasons };
  }
}

export const CAMERA_TONE_COLORS: Record<CameraTone, { bg: string; dot: string; text: string }> = {
  online: { bg: "#dcfce7", dot: "#22c55e", text: "#15803d" },
  degraded: { bg: "#fef3c7", dot: "#f59e0b", text: "#92400e" },
  offline: { bg: "#fee2e2", dot: "#ef4444", text: "#dc2626" },
  unknown: { bg: "#f1f5f9", dot: "#94a3b8", text: "#475569" },
};
