import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser } from "@/lib/auth-user";

export type Recrutamento = Database["public"]["Tables"]["recrutamento"]["Row"];
export type RecrutamentoInsert = Database["public"]["Tables"]["recrutamento"]["Insert"];
export type RecrutamentoUpdate = Database["public"]["Tables"]["recrutamento"]["Update"];

export async function getRecrutamentos(): Promise<Recrutamento[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recrutamento")
    .select("*")
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Não foi possível carregar os candidatos.");
  return (data as Recrutamento[]) ?? [];
}

export async function getRecrutamento(id: string): Promise<Recrutamento | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recrutamento")
    .select("*")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();

  if (error || !data) return null;
  return data as Recrutamento;
}

export async function createRecrutamento(payload: RecrutamentoInsert): Promise<Recrutamento> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recrutamento")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível salvar o candidato.");
  return data as Recrutamento;
}

export async function updateRecrutamento(id: string, payload: RecrutamentoUpdate): Promise<Recrutamento> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recrutamento")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível atualizar o candidato.");
  return data as Recrutamento;
}

export async function deleteRecrutamento(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { error } = await supabase
    .from("recrutamento")
    .delete()
    .eq("id", id)
    .eq("usuario_id", user.id);

  if (error) throw new Error("Não foi possível excluir o candidato.");
}
