import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type AuthTokens = {
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
};

const ACCESS_TOKEN_KEY = "duriancare.access-token";
const ACCESS_EXPIRY_KEY = "duriancare.access-token-expires-at";
const REFRESH_TOKEN_KEY = "duriancare.refresh-token";
const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

let memoryTokens: AuthTokens | null = null;

function supportsSecureStorage() {
  return Platform.OS !== "web";
}

export async function loadAuthTokens(): Promise<AuthTokens | null> {
  if (!supportsSecureStorage()) return memoryTokens;

  const [accessToken, refreshToken, expiresAt] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.getItemAsync(ACCESS_EXPIRY_KEY),
  ]);

  if (!accessToken || !refreshToken || !expiresAt) return null;
  const accessTokenExpiresAt = Number(expiresAt);
  if (!Number.isFinite(accessTokenExpiresAt)) return null;

  memoryTokens = { accessToken, accessTokenExpiresAt, refreshToken };
  return memoryTokens;
}

export function getCachedAuthTokens() {
  return memoryTokens;
}

export async function saveAuthTokens(tokens: AuthTokens) {
  memoryTokens = tokens;
  if (!supportsSecureStorage()) return;

  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken, secureOptions),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken, secureOptions),
    SecureStore.setItemAsync(
      ACCESS_EXPIRY_KEY,
      String(tokens.accessTokenExpiresAt),
      secureOptions,
    ),
  ]);
}

export async function clearAuthTokens() {
  memoryTokens = null;
  if (!supportsSecureStorage()) return;

  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(ACCESS_EXPIRY_KEY),
  ]);
}
