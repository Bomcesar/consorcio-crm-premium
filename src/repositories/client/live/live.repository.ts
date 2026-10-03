import { createClient } from "@/lib/supabase/client";
import { getAuthenticatedUser } from "@/lib/auth-user";
import type { LiveRoom } from "@/lib/live/types";
import { nomeSalaLiveKit } from "@/lib/live/livekit-compartilhado";

type SupabaseError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function logSupabaseError(context: string, error: SupabaseError | null) {
  console.error(`[Live] ${context} error:`, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
  });
}

/**
 * Traduz erros do Postgres/PostgREST para o catálogo de erros da sala.
 *
 * Um `insert` duplicado chega do PostgREST como HTTP 409 (`error.code
 * === "23505"`), não como 401/403. Sem este tratamento, uma violation
 * de índice único — por exemplo `live_participantes_usuario_unico`,
 * quando o mesmo usuário entra duas vezes na mesma sala — seria
 * reportada como "falha de carregamento", escondendo a causa real.
 */
function codigoDeErro(error: SupabaseError | null): string {
  const msg = `${error?.message ?? ""} ${error?.details ?? ""}`;

  // Violação de índice único (PostgREST → 409 Conflict)
  if (error?.code === "23505" || msg.includes("duplicate key")) {
    if (msg.includes("live_participantes_cadeira_unica")) return "cadeira_indisponivel";
    if (msg.includes("live_participantes_convidado_unico")) return "ja_participa";
    if (msg.includes("live_solicitacoes_pendente_unica")) return "solicitacao_duplicada";
    if (msg.includes("live_participantes_usuario_unico")) return "ja_participa";
    return "conflito_registro";
  }

  if (msg.includes("destinatario_fora_da_cadeira")) return "cadeira_indisponivel";
  if (msg.includes("Somente o anfitriao")) return "sem_permissao";

  // Sala encerrada: a policy de INSERT exige `live_aberta(live_id)`
  if (msg.includes("row-level security")) return "live_encerrada";

  return "falha_carregamento";
}

export async function getLive(id: string): Promise<LiveRoom | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("live_rooms").select("*").eq("id", id).single();
  if (error || !data) {
    logSupabaseError("getLive", error);
    return null;
  }
  return data as LiveRoom;
}

/** Lista as lives visíveis para o usuário (abertas + histórico próprio). */
export async function getLivesAtivas(): Promise<LiveRoom[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("live_rooms")
    .select("*")
    .neq("status", "encerrada")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    logSupabaseError("getLivesAtivas", error);
    return [];
  }
  return (data as LiveRoom[]) ?? [];
}

export async function getHistoricoLives(limit = 20): Promise<LiveRoom[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("live_rooms")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    logSupabaseError("getHistoricoLives", error);
    return [];
  }
  return (data as LiveRoom[]) ?? [];
}

export async function criarLive(payload: {
  titulo: string;
  descricao: string;
  max_cadeiras: number;
}): Promise<LiveRoom> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();

  // A sala LiveKit é derivada do id da live; geramos o id antes
  // para que o nome da sala seja determinístico e único.
  const id = crypto.randomUUID();

  const { data, error } = await supabase
    .from("live_rooms")
    .insert({
      id,
      titulo: payload.titulo.trim() || "Live sem título",
      descricao: payload.descricao.trim(),
      anfitriao_id: user.id,
      livekit_room: nomeSalaLiveKit(id),
      max_cadeiras: payload.max_cadeiras,
      status: "aguardando",
    })
    .select()
    .single();

  if (error || !data) {
    logSupabaseError("criarLive", error);
    throw new Error("Não foi possível criar a Live.");
  }
  return data as LiveRoom;
}

export async function atualizarLive(
  id: string,
  payload: Partial<Pick<LiveRoom, "titulo" | "descricao" | "status" | "modo" | "max_cadeiras" | "encerrada_em" | "iniciada_em">>,
): Promise<LiveRoom> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("live_rooms")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    logSupabaseError("atualizarLive", error);
    throw new Error("Não foi possível atualizar a Live.");
  }
  return data as LiveRoom;
}

/**
 * Inicia a live. A transição de status é sempre do anfitrião.
 *
 * Devolve a sala já persistida para que a tela atualize o estado local
 * sem depender do evento de Realtime (que pode atrasar ou não chegar).
 */
export async function iniciarLive(id: string): Promise<LiveRoom> {
  return atualizarLive(id, { status: "ao_vivo", iniciada_em: new Date().toISOString() });
}

/**
 * Encerra a live. O encerramento é definitivo: o trigger
 * `live_rooms_transicao_status` impede reabrir uma sala encerrada.
 */
export async function encerrarLive(id: string): Promise<LiveRoom> {
  return atualizarLive(id, { status: "encerrada", encerrada_em: new Date().toISOString() });
}

export async function entrarComoOuvinte(liveId: string): Promise<string> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nome, perfil")
    .eq("id", user.id)
    .single();

  const { data, error } = await supabase
    .from("live_participantes")
    .insert({
      live_id: liveId,
      usuario_id: user.id,
      nome_exibicao: (perfil as { nome?: string; perfil?: string } | null)?.nome || user.email || "Ouvinte",
      perfil: (perfil as { perfil?: string } | null)?.perfil ?? null,
      tipo: "ouvinte",
    })
    .select()
    .single();

  if (error || !data) {
    logSupabaseError("entrarComoOuvinte", error);
    // Um 409 aqui significa registro duplicado — quase sempre o próprio
    // usuário tentando entrar de novo. A presença já está no banco, então
    // recuperar a linha existente é o comportamento correto, não um erro.
    const codigo = codigoDeErro(error);
    if (codigo === "ja_participa") {
      const { data: existente } = await supabase
        .from("live_participantes")
        .select("id")
        .eq("live_id", liveId)
        .eq("usuario_id", user.id)
        .is("saiu_em", null)
        .maybeSingle();
      if (existente) return (existente as { id: string }).id;
    }
    throw new Error(codigo);
  }
  return (data as { id: string }).id;
}

export async function sairDaLive(liveId: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { error } = await supabase
    .from("live_participantes")
    .delete()
    .eq("live_id", liveId)
    .eq("usuario_id", user.id);
  if (error) logSupabaseError("sairDaLive", error);
}

export async function atualizarMeuEstado(
  participanteId: string,
  payload: { microfone_ativo?: boolean; camera_ativa?: boolean; last_seen_at?: string },
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("live_participantes")
    .update(payload)
    .eq("id", participanteId);
  if (error) {
    logSupabaseError("atualizarMeuEstado", error);
    throw new Error("Não foi possível atualizar seu estado na sala.");
  }
}

/** Anfitrião registra o próprio assento ao abrir a sala. */
export async function registrarAnfitriao(live: LiveRoom): Promise<string> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();

  const { data: existente } = await supabase
    .from("live_participantes")
    .select("id")
    .eq("live_id", live.id)
    .eq("usuario_id", user.id)
    .is("saiu_em", null)
    .maybeSingle();

  if (existente) return (existente as { id: string }).id;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nome, perfil")
    .eq("id", user.id)
    .single();

  const { data, error } = await supabase
    .from("live_participantes")
    .insert({
      live_id: live.id,
      usuario_id: user.id,
      nome_exibicao: (perfil as { nome?: string } | null)?.nome || user.email || "Anfitrião",
      perfil: (perfil as { perfil?: string } | null)?.perfil ?? null,
      tipo: "anfitriao",
      cadeira: 0,
      microfone_ativo: false,
    })
    .select()
    .single();

  if (error || !data) {
    logSupabaseError("registrarAnfitriao", error);
    throw new Error("Não foi possível registrar o anfitrião na sala.");
  }
  return (data as { id: string }).id;
}
