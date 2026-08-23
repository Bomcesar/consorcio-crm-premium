import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/middleware";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/reset-password";

  if (!code) {
    const url = new URL("/reset-password", request.url);
    url.searchParams.set("error", "missing_code");
    return NextResponse.redirect(url);
  }

  if (!isSupabaseConfigured()) {
    const url = new URL("/reset-password", request.url);
    url.searchParams.set("error", "not_configured");
    return NextResponse.redirect(url);
  }

  const supabaseResponse = NextResponse.redirect(new URL(next, requestUrl.origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: { path?: string; sameSite?: boolean | "lax" | "strict" | "none"; secure?: boolean; maxAge?: number } }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const url = new URL("/reset-password", request.url);
    url.searchParams.set("error", "invalid_code");
    url.searchParams.set("error_description", error.message);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
