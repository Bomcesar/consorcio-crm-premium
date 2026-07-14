import { NextResponse } from "next/server";
import { loginSchema, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/validations/auth";
import { DEMO_SESSION_COOKIE } from "@/lib/supabase/middleware";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const { email, password } = parsed.data;

    if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
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
