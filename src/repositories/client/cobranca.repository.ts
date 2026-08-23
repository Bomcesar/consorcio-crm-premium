import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser, isAdminOrGestor } from "@/lib/auth-user";

export type Cobranca = Database["public"]["Tables"]["cobrancas"]["Row"];
export type CobrancaInsert = Database["public"]["Tables"]["cobrancas"]["Insert"];
export type CobrancaUpdate = Database["public"]["Tables"]["cobrancas"]["Update"];
export type CobrancaHistorico = Database["public"]["Tables"]["cobranca_historico"]["Row"];

function cobrancaBaseQuery(supabase: ReturnType<typeof createClient>) {
  return supabase.from("cobrancas").select("*");
}

export async function getCobrancas(): Promise<Cobranca[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = cobrancaBaseQuery(supabase).order("data_vencimento", { ascending: true });
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar as cobranças.");
  return (data as Cobranca[]) ?? [];
}

export async function getCobranca(id: string): Promise<Cobranca | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = cobrancaBaseQuery(supabase).eq("id", id);
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query.single();
  if (error || !data) return null;
  return data as Cobranca;
}

export async function createCobranca(payload: CobrancaInsert): Promise<Cobranca> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("cobrancas")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();
  if (error || !data) throw new Error("Não foi possível salvar a cobrança.");
  return data as Cobranca;
}

export async function updateCobranca(id: string, payload: CobrancaUpdate): Promise<Cobranca> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("cobrancas").update(payload).eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { data, error } = await query.select().single();
  if (error || !data) throw new Error("Não foi possível atualizar a cobrança.");
  return data as Cobranca;
}

export async function deleteCobranca(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("cobrancas").delete().eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { error } = await query;
  if (error) throw new Error("Não foi possível excluir a cobrança.");
}

export async function getCobrancaHistorico(cobrancaId: string): Promise<CobrancaHistorico[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("cobranca_historico")
    .select("*")
    .eq("cobranca_id", cobrancaId)
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Não foi possível carregar o histórico.");
  return (data as CobrancaHistorico[]) ?? [];
}

export async function addCobrancaHistorico(cobrancaId: string, payload: { tipo?: string; descricao?: string }) {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("cobranca_historico")
    .insert({ cobranca_id: cobrancaId, usuario_id: user.id, ...payload })
    .select()
    .single();

  if (error) throw new Error("Não foi possível adicionar histórico.");
  return data as CobrancaHistorico;
}

