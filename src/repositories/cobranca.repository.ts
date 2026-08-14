import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import type { Database } from "@/types/database.types";

export type Cobranca = Database["public"]["Tables"]["cobrancas"]["Row"];
export type CobrancaInsert = Database["public"]["Tables"]["cobrancas"]["Insert"];
export type CobrancaUpdate = Database["public"]["Tables"]["cobrancas"]["Update"];

export async function getCobrancas(): Promise<Cobranca[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cobrancas")
    .select("*")
    .eq("usuario_id", user.id)
    .order("data_vencimento", { ascending: true });

  if (error) {
    throw new Error("Não foi possível carregar as cobranças.");
  }

  return (data as Cobranca[]) ?? [];
}

export async function getCobranca(id: string): Promise<Cobranca | null> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cobrancas")
    .select("*")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Cobranca;
}

export async function createCobranca(payload: CobrancaInsert): Promise<Cobranca> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cobrancas")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível salvar a cobrança.");
  }

  return data as Cobranca;
}

export async function updateCobranca(id: string, payload: CobrancaUpdate): Promise<Cobranca> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cobrancas")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível atualizar a cobrança.");
  }

  return data as Cobranca;
}

export async function deleteCobranca(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { error } = await supabase.from("cobrancas").delete().eq("id", id).eq("usuario_id", user.id);

  if (error) {
    throw new Error("Não foi possível excluir a cobrança.");
  }
}