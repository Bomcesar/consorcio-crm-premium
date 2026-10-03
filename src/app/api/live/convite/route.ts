import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { gerarTokenConvite, hashTokenConvite } from "@/lib/live/livekit-server";
import { clampNumber } from "@/lib/live/server-convite";
import type { LiveConvite } from "@/lib/live/types";

export const runtime = "nodejs";

/**
 * POST /api/live/convite
 * Somente o anfitrião da sala (confirmado no banco, nunca no corpo).
 * Gera 32 bytes aleatórios e grava apenas o SHA-256: o token puro
 * existe em uma única resposta, para o anfitrião copiar o link.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    const corpo = (await request.json().catch(() => null)) as {
      liveId?: string;
      validadeHoras?: number;
      limiteAcessos?: number | null;
      rotulo?: string;
    } | null;

    const liveId = corpo?.liveId;
    if (!liveId) {
      return NextResponse.json({ erro: "Live não informada." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: live, error: erroLive } = await admin
      .from("live_rooms")
      .select("id, anfitriao_id, status")
      .eq("id", liveId)
      .single();

    if (erroLive || !live) {
      return NextResponse.json({ erro: "Live não encontrada." }, { status: 404 });
    }

    const sala = live as { anfitriao_id: string; status: string };
    if (sala.anfitriao_id !== user.id) {
      return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
    }
    if (sala.status === "encerrada") {
      return NextResponse.json({ erro: "Esta Live foi encerrada." }, { status: 409 });
    }

    const validadeHoras = clampNumber(corpo?.validadeHoras, 1, 168, 24);
    const limiteAcessos = corpo?.limiteAcessos
      ? clampNumber(corpo.limiteAcessos, 1, 10000, 100)
      : null;

    const token = gerarTokenConvite();
    const expiraEm = new Date(Date.now() + validadeHoras * 3600 * 1000).toISOString();

    const { data: convite, error } = await admin
      .from("live_convites")
      .insert({
        live_id: liveId,
        token_hash: hashTokenConvite(token),
        rotulo: (corpo?.rotulo ?? "").slice(0, 80),
        criado_por: user.id,
        expira_em: expiraEm,
        limite_acessos: limiteAcessos,
      })
      .select()
      .single();

    if (error || !convite) {
      console.error("[API live/convite] erro ao criar:", error);
      return NextResponse.json({ erro: "Não foi possível gerar o convite." }, { status: 500 });
    }

    const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

    return NextResponse.json({
      convite: convite as LiveConvite,
      token,
      url: `${base}/live/convite/${token}`,
    });
  } catch (erro) {
    console.error("[API live/convite] erro:", erro);
    return NextResponse.json({ erro: "Erro interno." }, { status: 500 });
  }
}
