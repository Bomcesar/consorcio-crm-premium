import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser } from "@/lib/auth-user";

export type ContatoIndicado = Database["public"]["Tables"]["contatos_indicados"]["Row"];
export type ContatoIndicadoInsert = Database["public"]["Tables"]["contatos_indicados"]["Insert"];
export type ContatoIndicadoUpdate = Database["public"]["Tables"]["contatos_indicados"]["Update"];

export async function getContatosIndicados(indicadorId: string): Promise<ContatoIndicado[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("contatos_indicados").select("*").eq("indicador_id", indicadorId).eq("usuario_id", user.id).order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os contatos indicados.");
  return (data as ContatoIndicado[]) ?? [];
}

export async function getContatoIndicado(id: string): Promise<ContatoIndicado | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("contatos_indicados").select("*").eq("id", id).eq("usuario_id", user.id).single();
  if (error || !data) return null;
  return data as ContatoIndicado;
}

export async function createContatoIndicado(payload: ContatoIndicadoInsert): Promise<ContatoIndicado> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("contatos_indicados").insert({ ...payload, usuario_id: user.id }).select().single();
  if (error || !data) throw new Error("Não foi possível salvar o contato indicado.");
  return data as ContatoIndicado;
}

export async function updateContatoIndicado(id: string, payload: ContatoIndicadoUpdate): Promise<ContatoIndicado> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("contatos_indicados").update(payload).eq("id", id).eq("usuario_id", user.id).select().single();
  if (error || !data) throw new Error("Não foi possível atualizar o contato indicado.");
  return data as ContatoIndicado;
}

export async function deleteContatoIndicado(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { error } = await supabase.from("contatos_indicados").delete().eq("id", id).eq("usuario_id", user.id);
  if (error) throw new Error("Não foi possível excluir o contato indicado.");
}

