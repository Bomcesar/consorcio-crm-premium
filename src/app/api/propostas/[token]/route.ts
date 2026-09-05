import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.pathname.split("/").pop();

    if (!token) {
      return NextResponse.json({ error: "Token inválido." }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: proposta, error: fetchError } = await supabase
      .from("propostas")
      .select("*")
      .eq("link_token", token)
      .single();

    if (fetchError || !proposta) {
      return NextResponse.json({ error: "Proposta não encontrada." }, { status: 404 });
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0]?.trim() : null;
    const userAgent = request.headers.get("user-agent") ?? null;

    await supabase.from("proposta_eventos").insert({
      proposta_id: proposta.id,
      evento: "visualizacao",
      detalhes: "link_compartilhado",
      ip_origem: ip,
      user_agent: userAgent,
    });

    try {
      await supabase.rpc("increment_proposta_acessos", { proposta_id: proposta.id });
    } catch (err) {
      console.error("[API propostas] increment_proposta_acessos error:", err);
    }

    return NextResponse.json({
      id: proposta.id,
      titulo: proposta.titulo,
      tipo: proposta.tipo,
      conteudo: proposta.conteudo,
      acessos: proposta.acessos + 1,
      data_envio: proposta.data_envio,
      created_at: proposta.created_at,
      banner_caminho: proposta.banner_caminho,
    });
  } catch (err) {
    console.error("[API propostas] error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
