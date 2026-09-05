import { NextRequest, NextResponse } from "next/server";
import { createUsuarioAction } from "@/app/actions/usuarios.actions";
import { createClient } from "@/lib/supabase/client";

import type { Perfil } from "@/types/database.types";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const body = (await request.json()) as { nome?: string; email?: string; password?: string; perfil?: Perfil };

    if (!body.nome || !body.email || !body.password) {
      return NextResponse.json({ error: "Preencha todos os campos." }, { status: 400 });
    }

    const usuario = await createUsuarioAction(body.email, body.password, body.nome, body.perfil || "Indicador");

    return NextResponse.json(
      { message: "Conta criada com sucesso.", usuario },
      { status: 201 }
    );
  } catch (err) {
    console.error("[API register] error:", err);
    const message = err instanceof Error ? err.message : "Não foi possível criar a conta.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
