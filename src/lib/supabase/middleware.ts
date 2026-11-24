import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasPermissionForPerfil } from "@/lib/permission-rules";

const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/agenda": ["agenda.ver"],
  "/cobranca": ["cobranca.ver"],
  "/comissoes": ["comissoes.ver_proprias", "comissoes.ver_todas"],
};

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      !url.includes("your-project") &&
      key !== "your-anon-key",
  );
}

export function isDemoEnabled(): boolean {
  // Segurança: demo mode SOMENTE em desenvolvimento
  if (process.env.NODE_ENV !== "development") return false;
  return (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false").toLowerCase() === "true";
}

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/forgot-password") || request.nextUrl.pathname.startsWith("/reset-password") || request.nextUrl.pathname.startsWith("/register");
  const shouldAllowReset = request.nextUrl.pathname.startsWith("/reset-password") || request.nextUrl.pathname.startsWith("/forgot-password");
  const isPublicAsset =
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/api/auth");
  const isPublicProposal = request.nextUrl.pathname.startsWith("/proposta/");
  const isPublicProposalApi = request.nextUrl.pathname.startsWith("/api/propostas/");
  // Sala pública de live: acessível somente por token (convidado externo).
  const isPublicLive = request.nextUrl.pathname.startsWith("/live/convite/");
  const isPublicLiveApi = request.nextUrl.pathname.startsWith("/api/live/convite/");
  const isPublicLiveRoute = isPublicLive || isPublicLiveApi;

  if (isPublicAsset) {
    return supabaseResponse;
  }

  // --- Modo demo: bypass de autenticação Supabase ---
  if (isDemoEnabled()) {
    const demoSession = request.cookies.get("crm-demo-session");
    if (demoSession?.value === "active") {
      // Sessão demo ativa — permitir acesso a todas as rotas protegidas
      return supabaseResponse;
    }
    // Sem sessão demo — redirecionar para login (exceto rotas públicas)
    if (!isAuthRoute && !isPublicProposal && !isPublicProposalApi && !isPublicLiveRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (!isSupabaseConfigured()) {
    if (!isAuthRoute && !isPublicProposal && !isPublicProposalApi && !isPublicLiveRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isAuthRoute && !isPublicProposal && !isPublicProposalApi && !isPublicLiveRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const requiredPermissions = ROUTE_PERMISSIONS[request.nextUrl.pathname];
  if (user && requiredPermissions) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("perfil")
      .eq("id", user.id)
      .maybeSingle();

    let permissoes: string[] = [];
    const { data: grants } = await supabase
      .from("user_permission_grants")
      .select("permissao_id")
      .eq("usuario_id", user.id);

    const grantIds = (grants ?? []).map((grant: { permissao_id: string }) => grant.permissao_id);
    if (grantIds.length > 0) {
      const { data: permissaoRows } = await supabase
        .from("user_permissions")
        .select("codigo")
        .in("id", grantIds);
      permissoes = (permissaoRows ?? []).map((row: { codigo: string }) => row.codigo);
    }

    if (profile?.perfil) {
      const allowed = requiredPermissions.some((permission) =>
        hasPermissionForPerfil(profile.perfil, permission, permissoes),
      );

      if (!allowed) {
        const denied = new NextResponse("Acesso não autorizado", { status: 403 });
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          denied.cookies.set(cookie);
        });
        return denied;
      }
    }
  }

  if (user && isAuthRoute && !shouldAllowReset) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}