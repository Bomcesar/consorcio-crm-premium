import { NextResponse } from "next/server";
import {
  emitirTokenLiveKit,
  extrairIp,
  hashIp,
  livekitConfigurado,
  livekitUrl,
  nomeSalaLiveKit,
} from "@/lib/live/livekit-server";
import { registrarAcessoConvite, validarConvite } from "@/lib/live/server-convite";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * GET /api/live/convite/[token]
 *
 * Duas operações distintas, controladas por `?entrar=1`:
 *
 *  - SEM `entrar=1` — validação leve, usada pelo polling que
 *    detecta revogação/expiração/encerramento enquanto o
 *    convidado assiste. NÃO registra acesso, NÃO consome
 *    `limite_acessos` e NÃO emite token de mídia.
 *
 *  - COM `entrar=1` — entrada efetiva: registra o acesso de
 *    forma atômica (respeitando revogação/expiração/limite) e
 *    emite o token LiveKit do convidado com `canPublish: false`.
 *
 * A resposta é deliberadamente mínima: nenhuma tabela do CRM é
 * exposta e o convidado não consegue publicar áudio nem vídeo,
 * mesmo que o frontend seja adulterado.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const url = new URL(request.url);
    const nome = (url.searchParams.get("nome") ?? "").trim().slice(0, 80);
    const registrarEntrada = url.searchParams.get("entrar") === "1";

    if (!livekitConfigurado()) {
      return NextResponse.json(
        { erro: "A sala de áudio e vídeo ainda não foi configurada neste ambiente." },
        { status: 503 },
      );
    }

    const validacao = await validarConvite(token);
    if (!validacao.ok) {
      return NextResponse.json({ erro: validacao.erro }, { status: 403 });
    }

    const sala = validacao.dados;

    const admin = createAdminClient();
    const { data: salaRow } = await admin
      .from("live_rooms")
      .select("livekit_room, status")
      .eq("id", sala.live_id)
      .single();

    const statusSala = (salaRow as { status?: string } | null)?.status ?? sala.status;
    if (statusSala === "encerrada") {
      return NextResponse.json({ erro: "live_encerrada" }, { status: 403 });
    }

    // Polling leve: confirma apenas que o convite continua válido.
    // Não toca em `live_convites.acessos` nem emite token de mídia.
    if (!registrarEntrada) {
      return NextResponse.json({
        valido: true,
        status: sala.status,
        modo: sala.modo,
        encerrada: false,
      });
    }

    // Entrada efetiva: registra o acesso de forma atômica.
    const acesso = await registrarAcessoConvite(
      token,
      nome,
      request.headers.get("user-agent") ?? "",
      hashIp(extrairIp(request.headers)),
    );

    if (!acesso) {
      return NextResponse.json({ erro: "convite_revogado" }, { status: 403 });
    }

    const livekitRoom =
      (salaRow as { livekit_room?: string } | null)?.livekit_room ??
      nomeSalaLiveKit(sala.live_id);

    const identidade = `convidado-${acesso}`;

    const tokenLivekit = await emitirTokenLiveKit({
      roomName: livekitRoom,
      identity: identidade,
      nome: nome || "Convidado",
      tipo: "convidado",
      metadata: { liveId: sala.live_id, conviteId: sala.convite_id },
    });

    return NextResponse.json({
      liveId: sala.live_id,
      status: sala.status,
      modo: sala.modo,
      titulo: sala.titulo,
      descricao: sala.descricao,
      anfitriao: sala.anfitriao_nome,
      nome: nome || "Convidado",
      identidade,
      tokenLivekit,
      urlLivekit: livekitUrl(),
    });
  } catch (erro) {
    console.error("[API live/convite/[token]] erro:", erro);
    return NextResponse.json({ erro: "Erro interno." }, { status: 500 });
  }
}