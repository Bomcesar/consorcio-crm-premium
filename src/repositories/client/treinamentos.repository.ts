import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser, isAdminOrGestor } from "@/lib/auth-user";

export type Treinamento = Database["public"]["Tables"]["treinamentos"]["Row"];
export type TreinamentoInsert = Database["public"]["Tables"]["treinamentos"]["Insert"];
export type TreinamentoUpdate = Database["public"]["Tables"]["treinamentos"]["Update"];

function treinamentoBaseQuery(supabase: ReturnType<typeof createClient>) {
  return supabase.from("treinamentos").select("*");
}

export async function getTreinamentos(): Promise<Treinamento[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = treinamentoBaseQuery(supabase).order("created_at", { ascending: false });
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar os treinamentos.");
  return (data as Treinamento[]) ?? [];
}

export async function getTreinamentosByCategoria(categoria: string): Promise<Treinamento[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = treinamentoBaseQuery(supabase).eq("categoria", categoria).order("created_at", { ascending: false });
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar os treinamentos.");
  return (data as Treinamento[]) ?? [];
}

export async function getTreinamento(id: string): Promise<Treinamento | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = treinamentoBaseQuery(supabase).eq("id", id);
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query.single();
  if (error || !data) return null;
  return data as Treinamento;
}

export async function createTreinamento(payload: TreinamentoInsert): Promise<Treinamento> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("treinamentos")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();
  if (error || !data) throw new Error("Não foi possível salvar o treinamento.");
  return data as Treinamento;
}

export async function updateTreinamento(id: string, payload: TreinamentoUpdate): Promise<Treinamento> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("treinamentos").update(payload).eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { data, error } = await query.select().single();
  if (error || !data) throw new Error("Não foi possível atualizar o treinamento.");
  return data as Treinamento;
}

export async function deleteTreinamento(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("treinamentos").delete().eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { error } = await query;
  if (error) throw new Error("Não foi possível excluir o treinamento.");
}
