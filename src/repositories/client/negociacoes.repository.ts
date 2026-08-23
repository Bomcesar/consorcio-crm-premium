import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser, isAdminOrGestor } from "@/lib/auth-user";

export type Negociacao = Database["public"]["Tables"]["negociacoes"]["Row"];
export type NegociacaoInsert = Database["public"]["Tables"]["negociacoes"]["Insert"];
export type NegociacaoUpdate = Database["public"]["Tables"]["negociacoes"]["Update"];
export type NegociacaoHistorico = Database["public"]["Tables"]["negociacao_historico"]["Row"];
export type NegociacaoAnexo = Database["public"]["Tables"]["anexos"]["Row"];

function negociacaoBaseQuery(supabase: ReturnType<typeof createClient>) {
  return supabase.from("negociacoes").select("*");
}

export async function getNegociacoes(): Promise<Negociacao[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = negociacaoBaseQuery(supabase).order("data_prevista", { ascending: true });
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar as negociações.");
  return (data as Negociacao[]) ?? [];
}

export async function getNegociacao(id: string): Promise<Negociacao | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = negociacaoBaseQuery(supabase).eq("id", id);
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query.single();
  if (error || !data) return null;
  return data as Negociacao;
}

export async function createNegociacao(payload: NegociacaoInsert): Promise<Negociacao> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("negociacoes").insert({ ...payload, usuario_id: user.id }).select().single();
  if (error || !data) throw new Error("Não foi possível salvar a negociação.");
  return data as Negociacao;
}

export async function updateNegociacao(id: string, payload: NegociacaoUpdate): Promise<Negociacao> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("negociacoes").update(payload).eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { data, error } = await query.select().single();
  if (error || !data) throw new Error("Não foi possível atualizar a negociação.");
  return data as Negociacao;
}

export async function deleteNegociacao(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("negociacoes").delete().eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { error } = await query;
  if (error) throw new Error("Não foi possível excluir a negociação.");
}

export async function getNegociacaoHistorico(negociacaoId: string): Promise<NegociacaoHistorico[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("negociacao_historico")
    .select("*")
    .eq("negociacao_id", negociacaoId)
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar o histórico.");
  return (data as NegociacaoHistorico[]) ?? [];
}

export async function addNegociacaoHistorico(negociacaoId: string, payload: { tipo?: string; descricao?: string }) {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("negociacao_historico")
    .insert({ negociacao_id: negociacaoId, usuario_id: user.id, ...payload })
    .select()
    .single();
  if (error) throw new Error("Não foi possível adicionar histórico.");
  return data as NegociacaoHistorico;
}

export async function getNegociacaoAnexos(negociacaoId: string): Promise<NegociacaoAnexo[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("anexos")
    .select("*")
    .eq("entity_type", "negociacao")
    .eq("entity_id", negociacaoId)
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os anexos.");
  return (data as NegociacaoAnexo[]) ?? [];
}

export async function addNegociacaoAnexo(negociacaoId: string, file: File) {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const usuarioId = user.id;
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = `${usuarioId}/negociacao/${negociacaoId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("anexos")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Não foi possível enviar o arquivo: ${uploadError.message}`);
  }

  const { data, error } = await supabase
    .from("anexos")
    .insert({
      entity_type: "negociacao",
      entity_id: negociacaoId,
      nome: file.name,
      caminho: filePath,
      tipo: file.type || "application/octet-stream",
      tamanho: file.size,
      usuario_id: usuarioId,
    })
    .select()
    .single();

  if (error || !data) {
    await supabase.storage.from("anexos").remove([filePath]);
    throw new Error("Não foi possível registrar o anexo.");
  }

  return data as NegociacaoAnexo;
}

export async function removeNegociacaoAnexo(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();

  const { data: anexo, error: fetchError } = await supabase
    .from("anexos")
    .select("caminho")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();

  if (fetchError || !anexo) {
    throw new Error("Anexo não encontrado.");
  }

  const { error: deleteDbError } = await supabase
    .from("anexos")
    .delete()
    .eq("id", id)
    .eq("usuario_id", user.id);

  if (deleteDbError) {
    throw new Error("Não foi possível excluir o registro do anexo.");
  }

  const { error: deleteStorageError } = await supabase.storage
    .from("anexos")
    .remove([anexo.caminho]);

  if (deleteStorageError) {
    console.error("Não foi possível excluir o arquivo do storage:", deleteStorageError);
  }
}

