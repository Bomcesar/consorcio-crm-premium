import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (browserClient) return browserClient;

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === "undefined") return [];
          return document.cookie
            .split("; ")
            .map((cookie) => {
              const [name, ...rest] = cookie.split("=");
              return { name: name.trim(), value: rest.join("=") };
            })
            .filter((cookie) => cookie.name.length > 0);
        },
        setAll(cookiesToSet: { name: string; value: string; options?: { path?: string; sameSite?: string; secure?: boolean; maxAge?: number } }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const path = options?.path ?? "/";
            const sameSite = options?.sameSite ?? "lax";
            const secure = options?.secure ?? false;
            const maxAge = options?.maxAge;
            document.cookie = `${name}=${value}; path=${path}; samesite=${sameSite}; secure=${secure}${maxAge ? `; max-age=${maxAge}` : ""}`;
          });
        },
      },
    },
  );

  return browserClient;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url && key && !url.includes("your-project") && key !== "your-anon-key",
  );
}
