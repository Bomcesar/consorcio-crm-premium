import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const status = body?.status as "online" | "offline";

    if (!status || !["online", "offline"].includes(status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }

    const { error } = await supabase
      .from("usuario_status")
      .upsert(
        {
          usuario_id: user.id,
          status,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "usuario_id",
        },
      );

    if (error) {
      console.error("Erro ao atualizar status:", error);
      return NextResponse.json({ error: "Não foi possível atualizar o status." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no endpoint de presença:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
