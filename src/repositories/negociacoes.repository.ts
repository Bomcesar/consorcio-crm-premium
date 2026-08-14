import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import type { Database } from "@/types/database.types";

export type Negociacao = Database["public"]["Tables"]["negociacoes"]["Row"];
export type NegociacaoInsert = Database["public"]["Tables"]["negociacoes"]["Insert"];
export type NegociacaoUpdate = Database["public"]["Tables"]["negociacoes"]["Update"];

export async function getNegociacoes(): Promise<Negociacao[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("negociacoes")
    .select("*")
    .eq("usuario_id", user.id)
    .order("data_prevista", { ascending: true });

  if (error) {
    throw new Error("Não foi possível carregar as negociações.");
  }

  return (data as Negociacao[]) ?? [];
}

export async function getNegociacao(id: string): Promise<Negociacao | null> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("negociacoes")
    .select("*")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Negociacao;
}

export async function createNegociacao(payload: NegociacaoInsert): Promise<Negociacao> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("negociacoes")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível salvar a negociação.");
  }

  return data as Negociacao;
}

export async function updateNegociacao(id: string, payload: NegociacaoUpdate): Promise<Negociacao> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("negociacoes")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível atualizar a negociação.");
  }

  return data as Negociacao;
}

export async function deleteNegociacao(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { error } = await supabase.from("negociacoes").delete().eq("id", id).eq("usuario_id", user.id);

  if (error) {
    throw new Error("Não foi possível excluir a negociação.");
  }
}