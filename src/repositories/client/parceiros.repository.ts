import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser } from "@/lib/auth-user";

export type Parceiro = Database["public"]["Tables"]["parceiros"]["Row"];
export type ParceiroInsert = Database["public"]["Tables"]["parceiros"]["Insert"];
export type ParceiroUpdate = Database["public"]["Tables"]["parceiros"]["Update"];

export async function getParceiros(): Promise<Parceiro[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("parceiros")
    .select("*")
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Não foi possível carregar os parceiros.");
  return (data as Parceiro[]) ?? [];
}

export async function getParceiro(id: string): Promise<Parceiro | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("parceiros")
    .select("*")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();

  if (error || !data) return null;
  return data as Parceiro;
}

export async function createParceiro(payload: ParceiroInsert): Promise<Parceiro> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("parceiros")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível salvar o parceiro.");
  return data as Parceiro;
}

export async function updateParceiro(id: string, payload: ParceiroUpdate): Promise<Parceiro> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("parceiros")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível atualizar o parceiro.");
  return data as Parceiro;
}

export async function deleteParceiro(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { error } = await supabase
    .from("parceiros")
    .delete()
    .eq("id", id)
    .eq("usuario_id", user.id);

  if (error) throw new Error("Não foi possível excluir o parceiro.");
}
