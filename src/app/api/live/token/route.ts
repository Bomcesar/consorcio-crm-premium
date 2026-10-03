import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  emitirTokenLiveKit,
  livekitConfigurado,
  livekitUrl,
  motivoLivekitInoperante,
} from "@/lib/live/livekit-server";

export const runtime = "nodejs";

/**
 * POST /api/live/token
 *
 * Único emissor de token de mídia.
 *
 * Dois caminhos:
 *  1) Usuário cadastrado com sessão  → recebe token com permissão
 *     de publicar áudio (se estiver em cadeira).
 *  2) Convidado externo via token    → NUNCA recebe permissão de
 *     publicar; apenas escutar e assinar a sala.
 *
 * A chave secreta do LiveKit permanece exclusivamente no servidor.
 */
export async function POST(request: Request) {
  try {
    if (!livekitConfigurado()) {
      // O diagnóstico detalhado fica no log do servidor; a resposta ao
      // cliente permanece genérica para não vazar configuração do ambiente.
      console.error(
        `[API live/token] emissão indisponível: ${
          motivoLivekitInoperante() ?? "configuração inválida"
        }`,
      );
      return NextResponse.json(
        { erro: "falha_emissao_token", mensagem: "A sala de áudio e vídeo ainda não foi configurada neste ambiente." },
        { status: 503 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    const corpo = (await request.json().catch(() => null)) as { liveId?: string } | null;
    const liveId = corpo?.liveId;
    if (!liveId) {
      return NextResponse.json({ erro: "Live não informada." }, { status: 400 });
    }

    // Leitura com o client da sessão: a RLS já limita ao participante.
    const { data: sala, error: erroSala } = await supabase
      .from("live_rooms")
      .select("id, livekit_room, status, modo, anfitriao_id, titulo")
      .eq("id", liveId)
      .single();

    if (erroSala || !sala) {
      return NextResponse.json({ erro: "Live não encontrada." }, { status: 404 });
    }

    const live = sala as {
      livekit_room: string;
      status: string;
      modo: string;
      anfitriao_id: string;
      titulo: string;
    };

    if (live.status === "encerrada") {
      return NextResponse.json({ erro: "live_encerrada" }, { status: 409 });
    }

    const { data: participante, error: erroPart } = await supabase
      .from("live_participantes")
      .select("id, nome_exibicao, perfil, tipo, cadeira, bloqueado, saiu_em")
      .eq("live_id", liveId)
      .eq("usuario_id", user.id)
      .is("saiu_em", null)
      .maybeSingle();

    if (erroPart || !participante) {
      return NextResponse.json({ erro: "Você não está nesta sala." }, { status: 403 });
    }

    const eu = participante as {
      id: string;
      nome_exibicao: string;
      perfil: string | null;
      tipo: "anfitriao" | "participante" | "ouvinte" | "convidado";
      cadeira: number | null;
      bloqueado: boolean;
    };

    if (eu.bloqueado) {
      return NextResponse.json({ erro: "bloqueado_na_live" }, { status: 403 });
    }

    const ehAnfitriao = eu.tipo === "anfitriao";
    const emCadeira = ehAnfitriao || (eu.tipo === "participante" && eu.cadeira != null);

    const token = await emitirTokenLiveKit({
      roomName: live.livekit_room,
      identity: user.id,
      nome: eu.nome_exibicao,
      tipo: emCadeira ? (ehAnfitriao ? "anfitriao" : "participante") : "ouvinte",
      metadata: {
        liveId,
        participanteId: eu.id,
        perfil: eu.perfil ?? undefined,
        cadeira: eu.cadeira ?? undefined,
      },
    });

    return NextResponse.json({
      token,
      url: livekitUrl(),
      tipo: emCadeira ? (ehAnfitriao ? "anfitriao" : "participante") : "ouvinte",
      podePublicar: emCadeira,
      sala: { id: liveId, titulo: live.titulo, status: live.status, modo: live.modo },
    });
  } catch (erro) {
    console.error("[API live/token] erro:", erro);
    return NextResponse.json({ erro: "falha_emissao_token" }, { status: 500 });
  }
}
