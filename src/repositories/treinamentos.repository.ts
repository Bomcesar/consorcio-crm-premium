import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import type { Database } from "@/types/database.types";

export type Treinamento = Database["public"]["Tables"]["treinamentos"]["Row"];
export type TreinamentoInsert = Database["public"]["Tables"]["treinamentos"]["Insert"];
export type TreinamentoUpdate = Database["public"]["Tables"]["treinamentos"]["Update"];

export async function getTreinamentos(): Promise<Treinamento[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("treinamentos")
    .select("*")
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Não foi possível carregar os treinamentos.");
  }

  return (data as Treinamento[]) ?? [];
}

export async function getTreinamentosByCategoria(categoria: string): Promise<Treinamento[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("treinamentos")
    .select("*")
    .eq("categoria", categoria)
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Não foi possível carregar os treinamentos.");
  }

  return (data as Treinamento[]) ?? [];
}

export async function getTreinamento(id: string): Promise<Treinamento | null> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("treinamentos")
    .select("*")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Treinamento;
}

export async function createTreinamento(payload: TreinamentoInsert): Promise<Treinamento> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("treinamentos")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível salvar o treinamento.");
  }

  return data as Treinamento;
}

export async function updateTreinamento(id: string, payload: TreinamentoUpdate): Promise<Treinamento> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("treinamentos")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível atualizar o treinamento.");
  }

  return data as Treinamento;
}

export async function deleteTreinamento(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { error } = await supabase.from("treinamentos").delete().eq("id", id).eq("usuario_id", user.id);

  if (error) {
    throw new Error("Não foi possível excluir o treinamento.");
  }
}