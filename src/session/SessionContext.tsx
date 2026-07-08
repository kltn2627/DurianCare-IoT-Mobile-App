import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  loginRequest,
  logoutRequest,
  refreshAuthTokens,
  setSessionInvalidHandler,
} from "@/src/features/auth/authApi";
import {
  clearAuthTokens,
  loadAuthTokens,
} from "@/src/features/auth/authTokenStore";
import type { AuthenticationResponse } from "@/src/features/auth/authTypes";
import { profileClient } from "@/src/features/profile/profileApi";
import type { ProfileRecord } from "@/src/features/profile/profileTypes";

import type { SessionState, SessionUser, UserRole } from "./types";

const USER_KEY = "@duriancare/auth-user";
const AUTO_REFRESH_WINDOW_MS = 60_000;

type SessionContextValue = {
  applyProfileSnapshot: (profile: ProfileRecord) => Promise<void>;
  getCurrentUser: () => SessionUser | null;
  isRestoring: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<SessionUser | null>;
  refreshSession: () => Promise<void>;
  session: SessionState | null;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function toAppRole(role: string): UserRole {
  if (role === "FARMER") return "OWNER";
  if (role === "EXPERT") return "ENGINEER";
  throw new Error(`Vai trò ${role} chưa được hỗ trợ trên ứng dụng Mobile.`);
}

function toSessionUser(response: AuthenticationResponse): SessionUser {
  return {
    avatarUrl: response.profile.avatarUrl,
    backendRole: response.role as "EXPERT" | "FARMER",
    accountStatus: null,
    address: response.profile.farmAddress,
    bio: null,
    email: response.email,
    createdAt: null,
    dateOfBirth: null,
    farmAddress: response.profile.farmAddress,
    id: response.userId,
    gender: null,
    name: response.profile.fullName,
    phoneNumber: response.profile.phoneNumber,
    provinceCity: null,
    role: toAppRole(response.role),
    updatedAt: null,
  };
}

function mergeProfileIntoUser(
  baseUser: SessionUser,
  profile: ProfileRecord,
): SessionUser {
  return {
    ...baseUser,
    accountStatus: profile.accountStatus,
    address: profile.address,
    avatarUrl: profile.avatarUrl,
    bio: profile.bio,
    createdAt: profile.createdAt,
    dateOfBirth: profile.dateOfBirth,
    email: profile.email,
    farmAddress: profile.address ?? baseUser.farmAddress,
    gender: profile.gender,
    name: profile.fullName,
    phoneNumber: profile.phoneNumber,
    provinceCity: profile.provinceCity,
    role: toAppRole(profile.role),
    updatedAt: profile.updatedAt,
  };
}

async function loadProfileForUser(baseUser: SessionUser) {
  try {
    const profile = await profileClient.me();
    return mergeProfileIntoUser(baseUser, profile);
  } catch {
    return baseUser;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  const clearLocalSession = useCallback(async function clearLocalSession() {
    await Promise.all([clearAuthTokens(), AsyncStorage.removeItem(USER_KEY)]);
    setSession(null);
  }, []);

  useEffect(
    function connectApiSessionInvalidation() {
      setSessionInvalidHandler(clearLocalSession);
      return () => setSessionInvalidHandler(null);
    },
    [clearLocalSession],
  );

  useEffect(function restorePersistentSession() {
    let isActive = true;

    async function restore() {
      try {
        const [storedUser, storedTokens] = await Promise.all([
          AsyncStorage.getItem(USER_KEY),
          loadAuthTokens(),
        ]);
        if (!storedUser || !storedTokens) {
          await clearLocalSession();
          return;
        }

        const user = JSON.parse(storedUser) as SessionUser;
        const tokens =
          storedTokens.accessTokenExpiresAt - Date.now() <= AUTO_REFRESH_WINDOW_MS
            ? await refreshAuthTokens()
            : storedTokens;
        const hydratedUser = await loadProfileForUser(user);

        if (isActive) {
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(hydratedUser));
          setSession({
            accessTokenExpiresAt: tokens.accessTokenExpiresAt,
            token: tokens.accessToken,
            user: hydratedUser,
          });
        }
      } catch {
        await clearLocalSession();
      } finally {
        if (isActive) setIsRestoring(false);
      }
    }

    void restore();
    return () => {
      isActive = false;
    };
  }, [clearLocalSession]);

  const login = useCallback(async function loginWithBackend(
    email: string,
    password: string,
  ) {
    const response = await loginRequest(email.trim().toLowerCase(), password);
    try {
      const user = await loadProfileForUser(toSessionUser(response));
      const accessTokenExpiresAt =
        Date.now() + Math.max(0, response.accessTokenExpiresIn) * 1000;
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      setSession({ accessTokenExpiresAt, token: response.accessToken, user });
    } catch (error) {
      await clearLocalSession();
      throw error;
    }
  }, [clearLocalSession]);

  const refreshSession = useCallback(async function refreshCurrentSession() {
    const tokens = await refreshAuthTokens();
    setSession((current) =>
      current
        ? {
            ...current,
            accessTokenExpiresAt: tokens.accessTokenExpiresAt,
            token: tokens.accessToken,
          }
        : null,
    );
  }, []);

  const refreshProfile = useCallback(async function refreshCurrentProfile() {
    if (!session) return null;
    const profile = await profileClient.me();
    const nextUser = mergeProfileIntoUser(session.user, profile);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setSession((current) =>
      current
        ? {
            ...current,
            user: nextUser,
          }
        : current,
    );
    return nextUser;
  }, [session]);

  const applyProfileSnapshot = useCallback(
    async function applyProfileSnapshot(profile: ProfileRecord) {
      if (!session) return;
      const nextUser = mergeProfileIntoUser(session.user, profile);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      setSession((current) =>
        current
          ? {
              ...current,
              user: nextUser,
            }
          : current,
      );
    },
    [session],
  );

  useEffect(
    function scheduleAccessTokenRefresh() {
      if (!session) return;
      const delay = Math.max(
        0,
        session.accessTokenExpiresAt - Date.now() - AUTO_REFRESH_WINDOW_MS,
      );
      const timer = setTimeout(() => {
        void refreshSession().catch(() => clearLocalSession());
      }, delay);
      return () => clearTimeout(timer);
    },
    [clearLocalSession, refreshSession, session],
  );

  const logout = useCallback(async function logoutEverywhere() {
    try {
      await logoutRequest();
    } finally {
      await clearLocalSession();
    }
  }, [clearLocalSession]);

  const getCurrentUser = useCallback(() => session?.user ?? null, [session]);

  const value = useMemo(
    () => ({
      applyProfileSnapshot,
      getCurrentUser,
      isRestoring,
      login,
      logout,
      refreshProfile,
      refreshSession,
      session,
    }),
    [
      applyProfileSnapshot,
      getCurrentUser,
      isRestoring,
      login,
      logout,
      refreshProfile,
      refreshSession,
      session,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
}
