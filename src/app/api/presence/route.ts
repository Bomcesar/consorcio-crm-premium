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

    const now = new Date().toISOString();
    const payload = {
      usuario_id: user.id,
      status,
      last_seen: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("usuario_status")
      .select("id")
      .eq("usuario_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao localizar status:", error);
      return NextResponse.json({ error: "Não foi possível atualizar o status." }, { status: 500 });
    }

    if (data?.id) {
      const { error: updateError } = await supabase
        .from("usuario_status")
        .update({ status, last_seen: now, updated_at: now })
        .eq("id", data.id);

      if (updateError) {
        console.error("Erro ao atualizar status:", updateError);
        return NextResponse.json({ error: "Não foi possível atualizar o status." }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase.from("usuario_status").insert(payload);

      if (insertError) {
        console.error("Erro ao inserir status:", insertError);
        return NextResponse.json({ error: "Não foi possível atualizar o status." }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no endpoint de presença:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
