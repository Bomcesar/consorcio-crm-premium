"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  getCurrentAuthStateService,
  hasPermissionService,
  signInService,
  signOutService,
  subscribeAuthStateService,
} from "@/services/auth.service";
import type { AppPermission, AuthProfile, AuthUser, UserRole } from "@/types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  profile: AuthProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  signIn: typeof signInService;
  signOut: typeof signOutService;
  refreshAuth: () => Promise<void>;
  hasPermission: (permission: AppPermission) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const authState = await getCurrentAuthStateService();
      setUser(authState?.user ?? null);
      setProfile(authState?.profile ?? null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAuth();

    const unsubscribe = subscribeAuthStateService(() => {
      void refreshAuth();
    });

    return unsubscribe;
  }, [refreshAuth]);

  const value = useMemo<AuthContextValue>(() => {
    const role = profile?.perfil ?? null;

    return {
      user,
      profile,
      role,
      isLoading,
      async signIn(input) {
        await signInService(input);
        await refreshAuth();
      },
      async signOut() {
        await signOutService();
        setUser(null);
        setProfile(null);
      },
      refreshAuth,
      hasPermission(permission) {
        if (!role) return false;
        return hasPermissionService(role, permission);
      },
    };
  }, [isLoading, profile, refreshAuth, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext deve ser usado dentro de AuthProvider.");
  }
  return context;
}
