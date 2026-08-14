import { NextResponse } from "next/server";
import { googleCalendarEnv } from "@/integrations/env-validation";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const env = googleCalendarEnv();
    const missing = Object.entries(env)
      .filter(([, value]) => !value || value.trim() === "")
      .map(([key]) => key);

    if (missing.length > 0) {
      return NextResponse.json(
        { valid: false, missing, message: `Variáveis faltantes: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    return NextResponse.json({ valid: true, provider: "Google Calendar" });
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: "Não foi possível validar a integração." },
      { status: 500 },
    );
  }
}

async function getServerSession() {
  try {
    const mod = await import("@/lib/supabase/server");
    const supabase = await mod.createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ? { user } : null;
  } catch {
    return null;
  }
}
