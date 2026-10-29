"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api, getLoginUrl } from "@/lib/api";
import type { User, UserOrg } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  userOrgs: UserOrg[];
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userOrgs, setUserOrgs] = useState<UserOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const { user: sessionUser } = await api.getMe();
      setUser(sessionUser);
      // Also fetch user's available orgs
      try {
        const { orgs } = await api.getUserOrgs();
        setUserOrgs(orgs);
      } catch {}
    } catch {
      setUser(null);
      setUserOrgs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = () => {
    window.location.href = getLoginUrl();
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setUserOrgs([]);
    router.push("/");
  };

  const switchOrg = async (orgId: string) => {
    await api.switchOrg(orgId);
    await refresh();
  };

  return (
    <AuthContext.Provider value={{ user, userOrgs, loading, login, logout, refresh, switchOrg }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
