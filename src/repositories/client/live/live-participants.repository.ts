import { createClient } from "@/lib/supabase/client";
import { getAuthenticatedUser } from "@/lib/auth-user";
import type { LiveParticipante, LiveSolicitacao } from "@/lib/live/types";
import { acharCadeiraLivre } from "@/lib/live/cadeira";

type SupabaseError = { message?: string; details?: string; hint?: string; code?: string };

function logSupabaseError(context: string, error: SupabaseError | null) {
  console.error(`[Live Participantes] ${context} error:`, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
  });
}

export async function getParticipantes(liveId: string): Promise<LiveParticipante[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("live_participantes")
    .select("*")
    .eq("live_id", liveId)
    .is("saiu_em", null)
    .order("cadeira", { ascending: true, nullsFirst: false });

  if (error) {
    logSupabaseError("getParticipantes", error);
    throw new Error("Não foi possível carregar os participantes da sala.");
  }
  return (data as LiveParticipante[]) ?? [];
}

export async function getSolicitacoesPendentes(
  liveId: string,
): Promise<LiveSolicitacao[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("live_solicitacoes")
    .select("*")
    .eq("live_id", liveId)
    .eq("status", "pendente")
    .order("created_at", { ascending: true });

  if (error) {
    logSupabaseError("getSolicitacoesPendentes", error);
    return [];
  }

  const ids = (data ?? []).map((s) => s.usuario_id);
  if (ids.length === 0) return (data as LiveSolicitacao[]) ?? [];

  const { data: perfis } = await supabase
    .from("profiles")
    .select("id, nome, perfil")
    .in("id", ids);

  const mapa = new Map(
    ((perfis ?? []) as { id: string; nome: string; perfil: string }[]).map((p) => [p.id, p]),
  );

  return ((data as LiveSolicitacao[]) ?? []).map((s) => ({
    ...s,
    nome_exibicao: mapa.get(s.usuario_id)?.nome ?? "Ouvinte",
    perfil: mapa.get(s.usuario_id)?.perfil ?? null,
  }));
}

export async function getMinhaSolicitacao(liveId: string): Promise<LiveSolicitacao | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("live_solicitacoes")
    .select("*")
    .eq("live_id", liveId)
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logSupabaseError("getMinhaSolicitacao", error);
    return null;
  }
  return (data as LiveSolicitacao) ?? null;
}

/**
 * Ouvinte pede para falar. O índice parcial
 * `live_solicitacoes_pendente_unica` impede duplicidade no banco,
 * independentemente de duplo clique ou de múltiplas abas.
 */
export async function pedirParaFalar(liveId: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();

  const { error } = await supabase
    .from("live_solicitacoes")
    .insert({ live_id: liveId, usuario_id: user.id, status: "pendente" });

  if (error) {
    logSupabaseError("pedirParaFalar", error);
    const msg = `${error.message ?? ""} ${error.details ?? ""}`;
    if (msg.includes("live_solicitacoes_pendente_unica") || error.code === "23505") {
      throw new Error("solicitacao_duplicada");
    }
    throw new Error("falha_carregamento");
  }
}

export async function cancelarSolicitacao(solicitacaoId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("live_solicitacoes")
    .update({ status: "cancelada", respondida_em: new Date().toISOString() })
    .eq("id", solicitacaoId)
    .eq("status", "pendente");
  if (error) logSupabaseError("cancelarSolicitacao", error);
}

/**
 * Anfitrião aceita a solicitação: a primeira cadeira livre é
 * ocupada e a solicitação é marcada como aceita. A atomicidade
 * é garantida pela política (somente o anfitrião altera cadeira).
 */
export async function aceitarSolicitacao(params: {
  solicitacaoId: string;
  participanteId: string;
  liveId: string;
  maxCadeiras: number;
  participantes: LiveParticipante[];
}): Promise<number> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();

  const cadeira = acharCadeiraLivre(params.participantes, params.maxCadeiras);
  if (cadeira === null) throw new Error("cadeira_indisponivel");

  const { error: erroCadeira } = await supabase
    .from("live_participantes")
    .update({ tipo: "participante", cadeira })
    .eq("id", params.participanteId);

  if (erroCadeira) {
    logSupabaseError("aceitarSolicitacao.cadeira", erroCadeira);
    if (erroCadeira.code === "23505") throw new Error("cadeira_indisponivel");
    throw new Error("falha_carregamento");
  }

  const { error } = await supabase
    .from("live_solicitacoes")
    .update({
      status: "aceita",
      respondida_em: new Date().toISOString(),
      respondido_por: user.id,
    })
    .eq("id", params.solicitacaoId);

  if (error) {
    logSupabaseError("aceitarSolicitacao.solicitacao", error);
  }

  return cadeira;
}

export async function recusarSolicitacao(solicitacaoId: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { error } = await supabase
    .from("live_solicitacoes")
    .update({
      status: "recusada",
      respondida_em: new Date().toISOString(),
      respondido_por: user.id,
    })
    .eq("id", solicitacaoId);
  if (error) logSupabaseError("recusarSolicitacao", error);
}

export type AcaoAnfitriao =
  | "silenciar"
  | "permitir_falar"
  | "remover"
  | "bloquear"
  | "retirar_cadeira";

/** Controle do anfitrião sobre um participante. */
export async function acaoSobreParticipante(
  participanteId: string,
  acao: AcaoAnfitriao,
): Promise<void> {
  const supabase = createClient();
  const agora = new Date().toISOString();

  const patch: Record<string, unknown> = {};
  switch (acao) {
    case "silenciar":
      patch.microfone_ativo = false;
      break;
    case "permitir_falar":
      patch.bloqueado = false;
      break;
    case "remover":
      patch.saiu_em = agora;
      patch.microfone_ativo = false;
      patch.camera_ativa = false;
      patch.cadeira = null;
      break;
    case "retirar_cadeira":
      patch.cadeira = null;
      patch.microfone_ativo = false;
      patch.tipo = "ouvinte";
      break;
    case "bloquear":
      patch.bloqueado = true;
      patch.microfone_ativo = false;
      patch.camera_ativa = false;
      patch.cadeira = null;
      patch.saiu_em = null;
      break;
    default:
      break;
  }

  const { error } = await supabase
    .from("live_participantes")
    .update(patch)
    .eq("id", participanteId);

  if (error) {
    logSupabaseError("acaoSobreParticipante", error);
    throw new Error("Não foi possível aplicar a ação.");
  }
}

/** Participante sai da cadeira por conta própria e volta a ouvinte. */
export async function sairDaCadeira(participanteId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("live_participantes")
    .update({ cadeira: null, microfone_ativo: false, camera_ativa: false, tipo: "ouvinte" })
    .eq("id", participanteId);
  if (error) {
    logSupabaseError("sairDaCadeira", error);
    throw new Error("Não foi possível sair da cadeira.");
  }
}
