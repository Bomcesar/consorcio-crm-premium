import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser, isAdminOrGestor } from "@/lib/auth-user";

export type Indicador = Database["public"]["Tables"]["indicadores"]["Row"];
export type IndicadorInsert = Database["public"]["Tables"]["indicadores"]["Insert"];
export type IndicadorUpdate = Database["public"]["Tables"]["indicadores"]["Update"];
export type IndicadorHistorico = Database["public"]["Tables"]["indicador_historico"]["Row"];

function indicadorBaseQuery(supabase: ReturnType<typeof createClient>) {
  return supabase.from("indicadores").select("*");
}

export async function getIndicadores(): Promise<Indicador[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = indicadorBaseQuery(supabase).order("created_at", { ascending: false });
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar os indicadores.");
  return (data as Indicador[]) ?? [];
}

export async function searchIndicadores(query: string): Promise<Indicador[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const pattern = `%${query}%`;
  let q = indicadorBaseQuery(supabase)
    .or(`nome.ilike.${pattern},telefone.ilike.${pattern},email.ilike.${pattern},cidade.ilike.${pattern},observacoes.ilike.${pattern}`)
    .order("created_at", { ascending: false });
  if (!isAdminOrGestor(user)) {
    q = q.eq("usuario_id", user.id);
  }
  const { data, error } = await q;
  if (error) throw new Error("Não foi possível pesquisar os indicadores.");
  return (data as Indicador[]) ?? [];
}

export async function getIndicador(id: string): Promise<Indicador | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = indicadorBaseQuery(supabase).eq("id", id);
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query.single();
  if (error || !data) return null;
  return data as Indicador;
}

export async function createIndicador(payload: IndicadorInsert): Promise<Indicador> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("indicadores").insert({ ...payload, usuario_id: user.id }).select().single();
  if (error || !data) throw new Error("Não foi possível salvar o indicador.");
  return data as Indicador;
}

export async function updateIndicador(id: string, payload: IndicadorUpdate): Promise<Indicador> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("indicadores").update(payload).eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { data, error } = await query.select().single();
  if (error || !data) throw new Error("Não foi possível atualizar o indicador.");
  return data as Indicador;
}

export async function deleteIndicador(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("indicadores").delete().eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { error } = await query;
  if (error) throw new Error("Não foi possível excluir o indicador.");
}

export async function getIndicadorHistorico(indicadorId: string): Promise<IndicadorHistorico[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("indicador_historico")
    .select("*")
    .eq("indicador_id", indicadorId)
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar o histórico.");
  return (data as IndicadorHistorico[]) ?? [];
}

export async function addIndicadorHistorico(indicadorId: string, payload: { tipo?: string; descricao?: string }) {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("indicador_historico")
    .insert({ indicador_id: indicadorId, usuario_id: user.id, ...payload })
    .select()
    .single();
  if (error) throw new Error("Não foi possível adicionar histórico.");
  return data as IndicadorHistorico;
}

