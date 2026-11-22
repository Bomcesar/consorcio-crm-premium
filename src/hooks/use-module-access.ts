"use client";

import { useEffect, useState } from "react";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth-user";

export function useModuleAccess(permissions: string[]): boolean | null {
  const key = permissions.join("|");
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const required = key ? key.split("|") : [];

    const check = async () => {
      try {
        const user = await getAuthenticatedUser();
        if (!cancelled) {
          setHasAccess(required.some((permission) => hasPermission(user, permission)));
        }
      } catch {
        if (!cancelled) setHasAccess(false);
      }
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return hasAccess;
}