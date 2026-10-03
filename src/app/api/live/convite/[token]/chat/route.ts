import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { hashTokenConvite } from "@/lib/live/livekit-server";
import { validarConvite } from "@/lib/live/server-convite";
import { LIVE_MENSAGEM_MAX } from "@/lib/live/types";

export const runtime = "nodejs";

/**
 * GET /api/live/convite/[token]/chat
 *
 * Leitura do histórico para o convidado externo.
 *
 * O convidado não tem sessão Supabase e não passa pela RLS de
 * `live_chat_mensagens`: o histórico é filtrado aqui no servidor
 * depois de revalidar o convite, e o payload é enxuto (autor,
 * perfil, texto, hora). Nada do CRM é exposto.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const validacao = await validarConvite(token);
    if (!validacao.ok) {
      return NextResponse.json({ erro: validacao.erro }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("live_chat_mensagens")
      .select("id, autor_usuario_id, nome_exibicao, perfil, mensagem, tipo, created_at")
      .eq("live_id", validacao.dados.live_id)
      .order("criado_em", { ascending: true })
      .limit(200);

    if (error) {
      console.error("[API live/convite/chat] erro ao ler:", error);
      return NextResponse.json({ erro: "Não foi possível carregar o chat." }, { status: 500 });
    }

    return NextResponse.json({ mensagens: data ?? [] });
  } catch (erro) {
    console.error("[API live/convite/chat] erro:", erro);
    return NextResponse.json({ erro: "Erro interno." }, { status: 500 });
  }
}

/**
 * POST /api/live/convite/[token]/chat
 *
 * Único caminho de escrita do convidado externo no chat.
 * Não há sessão Supabase: o acesso é revalidado a CADA mensagem.
 * Qualquer falha (revogação, expiração, limite, live encerrada)
 * devolve erro e nada é gravado.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const corpo = (await request.json().catch(() => null)) as {
      mensagem?: string;
      nome?: string;
    } | null;

    const mensagem = (corpo?.mensagem ?? "").trim().slice(0, LIVE_MENSAGEM_MAX);
    const nome = (corpo?.nome ?? "").trim().slice(0, 80);

    if (!mensagem) {
      return NextResponse.json({ erro: "Mensagem vazia." }, { status: 400 });
    }

    const validacao = await validarConvite(token);
    if (!validacao.ok) {
      return NextResponse.json({ erro: validacao.erro }, { status: 403 });
    }

    const liveId = validacao.dados.live_id;
    const admin = createAdminClient();

    const { data: gravada, error: erroInsert } = await admin
      .from("live_chat_mensagens")
      .insert({
        live_id: liveId,
        autor_convidado_hash: hashTokenConvite(token),
        nome_exibicao: nome || "Convidado",
        perfil: null,
        mensagem,
        tipo: "texto",
      })
      .select()
      .single();

    if (erroInsert || !gravada) {
      console.error("[API live/convite/chat] erro ao inserir:", erroInsert);
      return NextResponse.json({ erro: "Não foi possível enviar a mensagem." }, { status: 500 });
    }

    // Convidados não podem assinar postgres_changes; a mensagem é
    // propagada por Broadcast, que carrega apenas conteúdo de sala.
    const registro = gravada as Record<string, unknown>;
    const anon = await createClient();
    const canal = anon.channel(`live:chat-bc:${liveId}`);
    await canal.send({ type: "broadcast", event: "mensagem", payload: registro });

    return NextResponse.json({ ok: true, mensagem: registro });
  } catch (erro) {
    console.error("[API live/convite/chat] erro:", erro);
    return NextResponse.json({ erro: "Erro interno." }, { status: 500 });
  }
}