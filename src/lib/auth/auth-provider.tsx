"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { isDemoEnabled } from "@/lib/validations/auth";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(false);
  const retryRef = useRef(0);

  const refresh = async () => {
    // Modo demo: criar usuário fictício se a sessão demo estiver ativa
    if (isDemoEnabled) {
      const demoActive = document.cookie.includes("crm-demo-session=active");
      if (demoActive) {
        const fakeUser = {
          id: "demo-user-001",
          email: process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "demo@crm.com",
          user_metadata: { name: "Consultor Demo", full_name: "Consultor Demo" },
          app_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        } as unknown as User;
        setUser(fakeUser);
        setIsLoading(false);
        return;
      }
      setUser(null);
      setIsLoading(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
      retryRef.current = 0;
    } catch {
      if (retryRef.current < 3) {
        retryRef.current += 1;
        setTimeout(() => {
          void refresh();
        }, 300);
        return;
      }
      setUser(null);
    } finally {
      if (!mountedRef.current) {
        setIsLoading(false);
        mountedRef.current = true;
      }
    }
  };

  useEffect(() => {
    void refresh();

    // Modo demo: não inscrever no auth state do Supabase
    if (isDemoEnabled) {
      const handleFocus = () => void refresh();
      window.addEventListener("focus", handleFocus);
      return () => window.removeEventListener("focus", handleFocus);
    }

    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: { user: import("@supabase/supabase-js").User | null } | null) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
      retryRef.current = 0;
    });

    const handleFocus = async () => {
      if (!sessionStorage.getItem("auth_refreshing")) {
        sessionStorage.setItem("auth_refreshing", "true");
        await refresh();
        sessionStorage.removeItem("auth_refreshing");
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
