import { createClient } from "@/lib/supabase/client";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth-user";
import type {
  LivePresente,
  LivePresenteCategoria,
  LivePresenteEnvio,
  LivePresenteSubcategoria,
} from "@/lib/live/types";

type SupabaseError = { message?: string; details?: string; hint?: string; code?: string };

function logSupabaseError(context: string, error: SupabaseError | null) {
  console.error(`[Live Presentes] ${context} error:`, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
  });
}

function exigirAdmin() {
  // A RLS já bloqueia, mas a falha aqui evita chamadas inúteis
  // e devolve uma mensagem clara em vez de um erro genérico.
  throw new Error("sem_permissao");
}

export type CategoriaComSubcategorias = LivePresenteCategoria & {
  subcategorias: LivePresenteSubcategoria[];
};

export async function getCategorias(admin = false): Promise<CategoriaComSubcategorias[]> {
  const supabase = createClient();

  const categorias = await supabase
    .from("live_presentes_categorias")
    .select("*")
    .order("ordem", { ascending: true });

  const subs = await supabase
    .from("live_presentes_subcategorias")
    .select("*")
    .order("ordem", { ascending: true });

  if (categorias.error) logSupabaseError("getCategorias", categorias.error);

  const lista = (categorias.data ?? []) as LivePresenteCategoria[];
  const sub = (subs.data ?? []) as LivePresenteSubcategoria[];

  return lista
    .filter((c) => admin || c.ativo)
    .map((c) => ({
      ...c,
      subcategorias: sub.filter((s) => s.categoria_id === c.id && (admin || s.ativo)),
    }));
}

export async function getPresentes(categoriaId?: string): Promise<LivePresente[]> {
  const supabase = createClient();
  let query = supabase.from("live_presentes").select("*").order("valor_credito", { ascending: true });
  if (categoriaId) query = query.eq("categoria_id", categoriaId);
  const { data, error } = await query;
  if (error) {
    logSupabaseError("getPresentes", error);
    return [];
  }
  return (data as LivePresente[]) ?? [];
}

export async function getPresentesAtivos(): Promise<LivePresente[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("live_presentes")
    .select("*")
    .eq("ativo", true)
    .order("valor_credito", { ascending: true });
  if (error) {
    logSupabaseError("getPresentesAtivos", error);
    return [];
  }
  return (data as LivePresente[]) ?? [];
}

/** Agrupa por categoria (com subcategoria quando existir). */
export async function getCatalogoPresentes(): Promise<
  { categoria: CategoriaComSubcategorias; presentes: LivePresente[] }[]
> {
  const [categorias, presentes] = await Promise.all([
    getCategorias(false),
    getPresentesAtivos(),
  ]);
  return categorias.map((categoria) => ({
    categoria,
    presentes: presentes.filter((p) => p.categoria_id === categoria.id),
  }));
}

export async function getEnviosDaSala(liveId: string): Promise<LivePresenteEnvio[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("live_presentes_envios")
    .select("*")
    .eq("live_id", liveId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    logSupabaseError("getEnviosDaSala", error);
    return [];
  }
  return (data as LivePresenteEnvio[]) ?? [];
}

export async function getEnviosDoDestinatario(
  participanteId: string,
): Promise<LivePresenteEnvio[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("live_presentes_envios")
    .select("*")
    .eq("destinatario_participante_id", participanteId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    logSupabaseError("getEnviosDoDestinatario", error);
    return [];
  }
  return (data as LivePresenteEnvio[]) ?? [];
}

/**
 * Envia um presente para quem está em cadeira.
 * O trigger `live_presentes_destinatario_em_cadeira` rejeita
 * o envio se o destinatário não estiver numa cadeira ativa.
 */
export async function enviarPresente(params: {
  liveId: string;
  presenteId: string;
  destinatarioParticipanteId: string;
}): Promise<LivePresenteEnvio> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();

  const { data: presente, error: erroPresente } = await supabase
    .from("live_presentes")
    .select("id, nome, valor_credito, categoria_id, ativo")
    .eq("id", params.presenteId)
    .single();

  if (erroPresente || !presente) {
    logSupabaseError("enviarPresente.presente", erroPresente);
    throw new Error("falha_envio_presente");
  }

  if (!presente.ativo) throw new Error("falha_envio_presente");

  const { data: categoria } = await supabase
    .from("live_presentes_categorias")
    .select("id, nome")
    .eq("id", presente.categoria_id)
    .single();

  const { data, error } = await supabase
    .from("live_presentes_envios")
    .insert({
      live_id: params.liveId,
      presente_id: presente.id,
      categoria_id: presente.categoria_id ?? null,
      categoria_nome: (categoria as { nome?: string } | null)?.nome ?? "",
      presente_nome: presente.nome,
      remetente_usuario_id: user.id,
      destinatario_participante_id: params.destinatarioParticipanteId,
      valor_credito_representado: presente.valor_credito,
    })
    .select()
    .single();

  if (error || !data) {
    logSupabaseError("enviarPresente", error);
    const msg = `${error?.message ?? ""} ${error?.details ?? ""}`;
    if (msg.includes("destinatario_fora_da_cadeira")) throw new Error("cadeira_indisponivel");
    throw new Error("falha_envio_presente");
  }

  return data as LivePresenteEnvio;
}

/* ------------------------------------------------------------------
 * Administração (somente Administrador — garantido pela RLS)
 * ---------------------------------------------------------------- */

export async function criarCategoria(payload: {
  nome: string;
  emoji: string;
  ordem: number;
}): Promise<LivePresenteCategoria> {
  const user = await getAuthenticatedUser();
  if (!hasPermission(user, "live.presentes.gerenciar")) exigirAdmin();

  const slug = slugify(payload.nome);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("live_presentes_categorias")
    .insert({ nome: payload.nome.trim(), slug, emoji: payload.emoji || "", ordem: payload.ordem })
    .select()
    .single();
  if (error || !data) {
    logSupabaseError("criarCategoria", error);
    throw new Error("Não foi possível criar a categoria.");
  }
  return data as LivePresenteCategoria;
}

export async function atualizarCategoria(
  id: string,
  payload: Partial<Pick<LivePresenteCategoria, "nome" | "emoji" | "ordem" | "ativo">>,
): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!hasPermission(user, "live.presentes.gerenciar")) exigirAdmin();

  const supabase = createClient();
  const { error } = await supabase.from("live_presentes_categorias").update(payload).eq("id", id);
  if (error) {
    logSupabaseError("atualizarCategoria", error);
    throw new Error("Não foi possível atualizar a categoria.");
  }
}

export async function criarPresente(payload: {
  categoria_id: string;
  subcategoria_id?: string | null;
  nome: string;
  valor_credito: number;
  imagem_path?: string;
  ordem?: number;
}): Promise<LivePresente> {
  const user = await getAuthenticatedUser();
  if (!hasPermission(user, "live.presentes.gerenciar")) exigirAdmin();

  const supabase = createClient();
  const { data, error } = await supabase
    .from("live_presentes")
    .insert({
      categoria_id: payload.categoria_id,
      subcategoria_id: payload.subcategoria_id ?? null,
      nome: payload.nome.trim(),
      valor_credito: payload.valor_credito,
      imagem_path: payload.imagem_path ?? "",
      ordem: payload.ordem ?? 0,
      ativo: true,
    })
    .select()
    .single();
  if (error || !data) {
    logSupabaseError("criarPresente", error);
    throw new Error("Não foi possível criar o presente.");
  }
  return data as LivePresente;
}

export async function atualizarPresente(
  id: string,
  payload: Partial<
    Pick<
      LivePresente,
      "nome" | "valor_credito" | "imagem_path" | "ativo" | "ordem" | "categoria_id" | "subcategoria_id"
    >
  >,
): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!hasPermission(user, "live.presentes.gerenciar")) exigirAdmin();

  const supabase = createClient();
  const { error } = await supabase.from("live_presentes").update(payload).eq("id", id);
  if (error) {
    logSupabaseError("atualizarPresente", error);
    throw new Error("Não foi possível atualizar o presente.");
  }
}

export async function uploadImagemPresente(
  presenteId: string,
  arquivo: File,
): Promise<string> {
  const user = await getAuthenticatedUser();
  if (!hasPermission(user, "live.presentes.gerenciar")) exigirAdmin();

  const supabase = createClient();
  const path = `${user.id}/presente/${presenteId}/${Date.now()}-${arquivo.name}`;

  const { error } = await supabase.storage
    .from("anexos")
    .upload(path, arquivo, { cacheControl: "3600", upsert: false });

  if (error) {
    logSupabaseError("uploadImagemPresente", error);
    throw new Error("Não foi possível enviar a imagem.");
  }

  await supabase.from("live_presentes").update({ imagem_path: path }).eq("id", presenteId);
  return path;
}

export async function getUrlImagemPresente(caminho: string): Promise<string | null> {
  if (!caminho) return null;
  const supabase = createClient();
  const { data, error } = await supabase.storage.from("anexos").createSignedUrl(caminho, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}

function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
