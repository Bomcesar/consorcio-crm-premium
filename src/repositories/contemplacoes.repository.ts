import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import type { Database } from "@/types/database.types";

export type Contemplacao = Database["public"]["Tables"]["contemplacoes"]["Row"];
export type ContemplacaoInsert = Database["public"]["Tables"]["contemplacoes"]["Insert"];
export type ContemplacaoUpdate = Database["public"]["Tables"]["contemplacoes"]["Update"];
export type ContemplacaoHistorico = Database["public"]["Tables"]["contemplacao_historico"]["Row"];

export async function getContemplacoes(): Promise<Contemplacao[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contemplacoes")
    .select("*")
    .eq("usuario_id", user.id)
    .order("data", { ascending: false });

  if (error) {
    throw new Error("Não foi possível carregar as contemplações.");
  }

  return (data as Contemplacao[]) ?? [];
}

export async function getContemplacao(id: string): Promise<Contemplacao | null> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contemplacoes")
    .select("*")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Contemplacao;
}

export async function createContemplacao(payload: ContemplacaoInsert): Promise<Contemplacao> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contemplacoes")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível salvar a contemplação.");
  }

  return data as Contemplacao;
}

export async function updateContemplacao(id: string, payload: ContemplacaoUpdate): Promise<Contemplacao> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contemplacoes")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível atualizar a contemplação.");
  }

  return data as Contemplacao;
}

export async function deleteContemplacao(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { error } = await supabase.from("contemplacoes").delete().eq("id", id).eq("usuario_id", user.id);

  if (error) {
    throw new Error("Não foi possível excluir a contemplação.");
  }
}

export async function getContemplacaoHistorico(contemplacaoId: string): Promise<ContemplacaoHistorico[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contemplacao_historico")
    .select("*")
    .eq("contemplacao_id", contemplacaoId)
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Não foi possível carregar o histórico.");
  return (data as ContemplacaoHistorico[]) ?? [];
}

export async function addContemplacaoHistorico(contemplacaoId: string, payload: { tipo?: string; descricao?: string }) {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contemplacao_historico")
    .insert({ contemplacao_id: contemplacaoId, usuario_id: user.id, ...payload })
    .select()
    .single();

  if (error) throw new Error("Não foi possível adicionar histórico.");
  return data as ContemplacaoHistorico;
}