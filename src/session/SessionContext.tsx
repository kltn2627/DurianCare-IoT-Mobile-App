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

import type { SessionState, UserRole } from "./types";

const SESSION_KEY = "@duriancare/mock-session";

type SessionContextValue = {
  isRestoring: boolean;
  login: (email: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  session: SessionState | null;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function createMockJwt(role: UserRole) {
  const header = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0";
  const ownerPayload = "eyJzdWIiOiJtb2NrLW93bmVyIiwicm9sZSI6Ik9XTkVSIn0";
  const engineerPayload = "eyJzdWIiOiJtb2NrLWVuZ2luZWVyIiwicm9sZSI6IkVOR0lORUVSIn0";
  return `${header}.${role === "OWNER" ? ownerPayload : engineerPayload}.mock-signature`;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(function restoreMockSession() {
    async function restore() {
      try {
        const storedSession = await AsyncStorage.getItem(SESSION_KEY);
        if (storedSession) setSession(JSON.parse(storedSession) as SessionState);
      } finally {
        setIsRestoring(false);
      }
    }

    void restore();
  }, []);

  const login = useCallback(async function loginWithMockJwt(email: string, role: UserRole) {
    const nextSession: SessionState = {
      token: createMockJwt(role),
      user: {
        email,
        name: role === "OWNER" ? "Nguyễn Minh - Chủ vườn" : "Kỹ sư Trần An",
        role,
      },
    };

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  }, []);

  const logout = useCallback(async function clearMockSession() {
    await AsyncStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ isRestoring, login, logout, session }),
    [isRestoring, login, logout, session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
}
