import Constants from "expo-constants";
import { Platform } from "react-native";
import { resolveApiBaseUrl } from "./apiBaseResolver";

export function getApiBaseUrl() {
  return resolveApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL, __DEV__, Constants.expoConfig?.hostUri,
    process.env.EXPO_PUBLIC_API_GATEWAY_PORT?.trim() || "8080", Platform.OS !== "web");
}
