import type { CameraDevice } from "@/src/lib/iotApi";

export type CameraTone = "online" | "degraded" | "offline" | "unknown";

export interface CameraStatusView {
  label: string;
  tone: CameraTone;
  /** The snapshot image is requested only while this is true. */
  canPreview: boolean;
  message: string | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  CAMERA_INIT_FAILED: "Camera không khởi tạo được (lỗi cảm biến/cáp camera). Thiết bị đang tự thử lại.",
  CAMERA_STREAM_FAILED: "Camera đang kết nối nhưng không chụp được ảnh. Thiết bị đang tự thử lại.",
  HEARTBEAT_TIMEOUT: "Không nhận được tín hiệu từ camera. Kiểm tra nguồn điện và Wi-Fi tại vườn.",
};

/** Same mapping as the Web dashboard: the registry (heartbeat + self-test) is the only source of truth. */
export function cameraStatusView(device: Pick<CameraDevice, "status"> & { lastError?: string | null } | null | undefined): CameraStatusView {
  if (!device) return { label: "Chưa có camera", tone: "unknown", canPreview: false, message: "Chưa có camera được cấp quyền." };
  switch (device.status) {
    case "ONLINE":
      return { label: "Online", tone: "online", canPreview: true, message: null };
    case "DEGRADED":
      return { label: "Hoạt động hạn chế", tone: "degraded", canPreview: false,
        message: ERROR_MESSAGES[device.lastError ?? ""] ?? ERROR_MESSAGES.CAMERA_STREAM_FAILED };
    case "OFFLINE":
      return { label: "Offline", tone: "offline", canPreview: false, message: ERROR_MESSAGES.HEARTBEAT_TIMEOUT };
    default:
      return { label: "Chưa kết nối", tone: "unknown", canPreview: false, message: "Camera chưa từng gửi tín hiệu tới hệ thống." };
  }
}

export const CAMERA_TONE_COLORS: Record<CameraTone, { bg: string; dot: string; text: string }> = {
  online: { bg: "#dcfce7", dot: "#22c55e", text: "#15803d" },
  degraded: { bg: "#fef3c7", dot: "#f59e0b", text: "#92400e" },
  offline: { bg: "#fee2e2", dot: "#ef4444", text: "#dc2626" },
  unknown: { bg: "#f1f5f9", dot: "#94a3b8", text: "#475569" },
};
