export function getApiBaseUrl() {
  return (
    process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || "http://localhost:8000"
  ).replace(/\/$/, "");
}
