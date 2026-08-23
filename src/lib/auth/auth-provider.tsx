"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

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

    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: { user: import("@supabase/supabase-js").User | null } | null) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
      retryRef.current = 0;
    });

    return () => {
      subscription.unsubscribe();
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
