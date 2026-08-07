import { getBrowserSupabase } from "@/repositories/supabase-browser";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { AuthState, AuthProfile } from "@/types/auth";

const DEMO_STORAGE_KEY = "crm-demo-session";

function getDemoAuthState(): AuthState {
  return {
    user: {
      id: "demo-user",
      email: "demo@crm.local",
    },
    profile: {
      id: "demo-user",
      nome: "Usuário Demo",
      email: "demo@crm.local",
      perfil: "Administrador",
      avatar_url: null,
    },
  };
}

export type LoginInput = {
  email: string;
  password: string;
};

export async function signInRepository(input: LoginInput): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword(input);
    if (error) throw error;
    return;
  }

  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const result = (await response.json()) as { error?: string };
    throw new Error(result.error ?? "Erro ao fazer login.");
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(DEMO_STORAGE_KEY, "active");
  }
}

export async function signOutRepository(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return;
  }

  await fetch("/api/auth/logout", { method: "POST" });

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(DEMO_STORAGE_KEY);
  }
}

export async function getCurrentAuthStateRepository(): Promise<AuthState | null> {
  if (isSupabaseConfigured()) {
    const supabase = getBrowserSupabase();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    if (!user || !user.email) return null;

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, nome, email, perfil, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    const profile = (profileData as AuthProfile | null) ?? {
      id: user.id,
      nome: user.user_metadata?.nome || user.email.split("@")[0],
      email: user.email,
      perfil: "Consultor",
      avatar_url: null,
    };

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
    };
  }

  if (typeof window === "undefined") return null;
  const active = window.localStorage.getItem(DEMO_STORAGE_KEY) === "active";
  return active ? getDemoAuthState() : null;
}

export function subscribeAuthStateRepository(onChange: () => void): () => void {
  if (isSupabaseConfigured()) {
    const supabase = getBrowserSupabase();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => onChange());

    return () => subscription.unsubscribe();
  }

  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: StorageEvent) => {
    if (event.key === DEMO_STORAGE_KEY) {
      onChange();
    }
  };

  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
