import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";
import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from "@/lib/session-storage";
import type { AuthUser } from "@/types/booking";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isReady: boolean;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

type AuthResponse = {
  token: string;
  user: AuthUser;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    void bootstrapSession();
  }, []);

  async function bootstrapSession() {
    const storedSession = await readStoredSession();

    if (!storedSession) {
      setIsReady(true);
      return;
    }

    setUser(storedSession.user);
    setToken(storedSession.token);

    try {
      const payload = await apiFetch<{ user: AuthUser }>("/api/mobile/auth/me", {
        token: storedSession.token,
      });

      setUser(payload.user);
      setToken(storedSession.token);
      await writeStoredSession({ token: storedSession.token, user: payload.user });
    } catch {
      await clearStoredSession();
      setUser(null);
      setToken(null);
    } finally {
      setIsReady(true);
    }
  }

  async function persistAuthResponse(response: AuthResponse) {
    setUser(response.user);
    setToken(response.token);
    await writeStoredSession({ token: response.token, user: response.user });
  }

  async function signIn(input: { email: string; password: string }) {
    const response = await apiFetch<AuthResponse>("/api/mobile/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });

    await persistAuthResponse(response);
  }

  async function register(input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) {
    const response = await apiFetch<AuthResponse>("/api/mobile/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });

    await persistAuthResponse(response);
  }

  async function signOut() {
    setUser(null);
    setToken(null);
    await clearStoredSession();
  }

  async function refreshSession() {
    if (!token) {
      return;
    }

    const payload = await apiFetch<{ user: AuthUser }>("/api/mobile/auth/me", {
      token,
    });

    setUser(payload.user);
    await writeStoredSession({ token, user: payload.user });
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isReady,
      signIn,
      register,
      signOut,
      refreshSession,
    }),
    [isReady, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
