import Constants from "expo-constants";

const AUTO_LAN_API_BASE_URL = "auto";

function getApiBaseUrlFromMetroHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri?.trim();
  if (!hostUri) return null;

  try {
    const metroUrl = new URL(hostUri.includes("://") ? hostUri : `http://${hostUri}`);
    const host = metroUrl.hostname;
    if (!host) return null;

    const formattedHost = host.includes(":") ? `[${host}]` : host;
    return `http://${formattedHost}:8080`;
  } catch {
    return null;
  }
}

export function getApiBaseUrl() {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (configuredBaseUrl && configuredBaseUrl !== AUTO_LAN_API_BASE_URL) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  if (__DEV__ && configuredBaseUrl === AUTO_LAN_API_BASE_URL) {
    const metroApiBaseUrl = getApiBaseUrlFromMetroHost();
    if (metroApiBaseUrl) return metroApiBaseUrl;

    throw new Error(
      "Không thể xác định máy chủ API từ Metro. Hãy chạy Expo ở chế độ LAN rồi tải lại ứng dụng.",
    );
  }

  throw new Error("Thiếu EXPO_PUBLIC_API_BASE_URL để kết nối dịch vụ.");
}
