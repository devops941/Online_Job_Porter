import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { TOKEN_KEY, USER_KEY } from "@/lib/api";
import { authApi } from "@/lib/api-client";
import type { Role, User } from "@/types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: {
    email: string;
    password: string;
    fullName: string;
    role: Role;
    companyName?: string;
  }) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => readStoredUser());
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState<boolean>(Boolean(localStorage.getItem(TOKEN_KEY)));

  const persist = useCallback((nextToken: string | null, nextUser: User | null) => {
    if (nextToken && nextUser) {
      localStorage.setItem(TOKEN_KEY, nextToken);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    setToken(nextToken);
    setUserState(nextUser);
  }, []);

  const refresh = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setLoading(false);
      return;
    }
    try {
      const me = await authApi.me();
      persist(localStorage.getItem(TOKEN_KEY), me);
    } catch {
      persist(null, null);
    } finally {
      setLoading(false);
    }
  }, [persist]);

  // Revalidate the cached profile once on mount so a stale/blocked account is
  // caught before the UI trusts the localStorage copy.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await authApi.login(email, password);
      persist(data.access_token, data.user);
      return data.user;
    },
    [persist],
  );

  const register = useCallback<AuthContextValue["register"]>(
    async (payload) => {
      const data = await authApi.register(payload);
      persist(data.access_token, data.user);
      return data.user;
    },
    [persist],
  );

  const logout = useCallback(() => persist(null, null), [persist]);

  const setUser = useCallback(
    (next: User) => persist(localStorage.getItem(TOKEN_KEY), next),
    [persist],
  );

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout, refresh, setUser }),
    [user, token, loading, login, register, logout, refresh, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export function homeRouteFor(role?: Role | null) {
  switch (role) {
    case "admin":
      return "/admin";
    case "employer":
      return "/employer";
    case "job_seeker":
      return "/job-seeker";
    default:
      return "/jobs";
  }
}
