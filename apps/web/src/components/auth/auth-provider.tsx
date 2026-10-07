"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { ApiError } from "@/lib/api/api-client";
import {
  getCurrentUser,
  logout,
  refreshSession,
} from "@/lib/api/auth/auth.api";
import type { AuthUser } from "@/lib/api/auth/auth.types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  setAuthenticatedUser: (user: AuthUser) => void;
  reloadSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const reloadSession = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setStatus("authenticated");
      return;
    } catch (requestError) {
      if (!(requestError instanceof ApiError) || requestError.status !== 401) {
        setUser(null);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not load your session.",
        );
        setStatus("error");
        return;
      }
    }

    try {
      await refreshSession();
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setStatus("authenticated");
    } catch (requestError) {
      setUser(null);

      if (requestError instanceof ApiError && requestError.status === 401) {
        setStatus("unauthenticated");
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not refresh your session.",
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // Initial session restoration is an external auth check that hydrates context state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reloadSession();
  }, [reloadSession]);

  const setAuthenticatedUser = useCallback((authenticatedUser: AuthUser) => {
    setUser(authenticatedUser);
    setError(null);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      setUser(null);
      setError(null);
      setStatus("unauthenticated");
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        error,
        setAuthenticatedUser,
        reloadSession,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }

  return context;
}
