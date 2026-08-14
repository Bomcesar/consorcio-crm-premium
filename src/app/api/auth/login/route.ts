import { NextResponse } from "next/server";
import { loginSchema, isDemoEnabled } from "@/lib/validations/auth";
import { isRateLimited, getRateLimitKey } from "@/lib/rate-limit";
import { DEMO_SESSION_COOKIE } from "@/lib/supabase/middleware";

export async function POST(request: Request) {
  if (isRateLimited(getRateLimitKey(request))) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente mais tarde." }, { status: 429 });
  }

  try {
    if (!isDemoEnabled) {
      return NextResponse.json({ error: "Modo demo desativado." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const { email, password } = parsed.data;

    if (email !== process.env.NEXT_PUBLIC_DEMO_EMAIL || password !== process.env.NEXT_PUBLIC_DEMO_PASSWORD) {
      return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(DEMO_SESSION_COOKIE, "active", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
