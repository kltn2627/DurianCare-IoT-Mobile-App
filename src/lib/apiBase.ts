export function getApiBaseUrl() {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("Thiếu EXPO_PUBLIC_API_BASE_URL để kết nối dịch vụ.");
  }

  return baseUrl.replace(/\/$/, "");
}
