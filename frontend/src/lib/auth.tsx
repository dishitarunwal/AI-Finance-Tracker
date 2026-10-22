import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, onUnauthorized, userIdFromToken, type User } from "../api/client";

const TOKEN_KEY = "finance.token";

interface AuthState {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readToken);
  const [user, setUser] = useState<User | null>(null);

  const logout = useCallback(() => {
    writeToken(null);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    onUnauthorized(logout);
    return () => onUnauthorized(null);
  }, [logout]);

  useEffect(() => {
    if (!token) return;
    const id = userIdFromToken(token);
    if (id == null) return;
    api.getUser(token, id).then(setUser).catch(() => setUser(null));
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    writeToken(res.access_token);
    setToken(res.access_token);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await api.register(name, email, password);
      await login(email, password);
    },
    [login],
  );

  return <AuthContext.Provider value={{ token, user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** For pages rendered behind the auth gate, where a token is guaranteed. */
export function useToken() {
  const { token } = useAuth();
  if (!token) throw new Error("Not authenticated");
  return token;
}
