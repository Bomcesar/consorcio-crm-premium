import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { validarConvite } from "@/lib/live/server-convite";

export const runtime = "nodejs";

/** Validade curta: o arquivo fica acessível só durante a apresentação. */
const VALIDADE_SEGUNDOS = 300;

/**
 * GET /api/live/convite/[token]/apresentacao
 *
 * Entrega o arquivo da apresentação (PDF/vídeo) ao convidado
 * externo.
 *
 * O bucket `anexos` é isolado por pasta do usuário e não é
 * público: o convidado não tem sessão e, portanto, não conseguiria
 * ler o arquivo direto. A URL assinada é gerada aqui, no
 * servidor, SOMENTE depois de revalidar o convite — nunca é
 * exposta a link permanente nem para quem não tem o token.
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
      .from("live_apresentacoes")
      .select("id, tipo, caminho, mime_type, titulo, pagina_atual, total_paginas")
      .eq("live_id", validacao.dados.live_id)
      .is("encerrada_em", null)
      .order("iniciado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[API live/convite/apresentacao] erro ao ler:", error);
      return NextResponse.json({ erro: "Não foi possível carregar a apresentação." }, { status: 500 });
    }

    if (!data || !data.caminho || data.tipo === "screen") {
      return NextResponse.json({ apresentacao: null });
    }

    const caminho = data.caminho as string;
    const { data: assinada, error: erroUrl } = await admin.storage
      .from("anexos")
      .createSignedUrl(caminho, VALIDADE_SEGUNDOS);

    if (erroUrl || !assinada) {
      console.error("[API live/convite/apresentacao] erro na signed URL:", erroUrl);
      return NextResponse.json({ erro: "Não foi possível carregar a apresentação." }, { status: 500 });
    }

    return NextResponse.json({
      apresentacao: {
        id: data.id,
        tipo: data.tipo,
        mime_type: data.mime_type,
        titulo: data.titulo,
        pagina_atual: data.pagina_atual,
        total_paginas: data.total_paginas,
      },
      url: assinada.signedUrl,
    });
  } catch (erro) {
    console.error("[API live/convite/apresentacao] erro:", erro);
    return NextResponse.json({ erro: "Erro interno." }, { status: 500 });
  }
}