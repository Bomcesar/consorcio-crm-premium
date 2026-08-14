import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import type { Database } from "@/types/database.types";

export type ComissaoIndicador = Database["public"]["Tables"]["comissoes_indicadores"]["Row"];
export type ComissaoIndicadorInsert = Database["public"]["Tables"]["comissoes_indicadores"]["Insert"];
export type ComissaoIndicadorUpdate = Database["public"]["Tables"]["comissoes_indicadores"]["Update"];

export async function getComissoesIndicadores(filtro?: { indicadorId?: string; clienteId?: string; status?: string }): Promise<ComissaoIndicador[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  let query = supabase
    .from("comissoes_indicadores")
    .select("*")
    .eq("usuario_id", user.id)
    .order("data_prevista", { ascending: true })
    .order("created_at", { ascending: false });

  if (filtro?.indicadorId) {
    query = query.eq("indicador_id", filtro.indicadorId);
  }
  if (filtro?.clienteId) {
    query = query.eq("cliente_id", filtro.clienteId);
  }
  if (filtro?.status) {
    query = query.eq("status", filtro.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Não foi possível carregar as comissões.");
  }

  return (data as ComissaoIndicador[]) ?? [];
}

export async function getComissaoIndicador(id: string): Promise<ComissaoIndicador | null> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("comissoes_indicadores")
    .select("*")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ComissaoIndicador;
}

export async function createComissaoIndicador(payload: ComissaoIndicadorInsert): Promise<ComissaoIndicador> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("comissoes_indicadores")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível salvar a comissão.");
  }

  return data as ComissaoIndicador;
}

export async function updateComissaoIndicador(
  id: string,
  payload: ComissaoIndicadorUpdate
): Promise<ComissaoIndicador> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("comissoes_indicadores")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível atualizar a comissão.");
  }

  return data as ComissaoIndicador;
}

export async function deleteComissaoIndicador(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { error } = await supabase.from("comissoes_indicadores").delete().eq("id", id).eq("usuario_id", user.id);

  if (error) {
    throw new Error("Não foi possível excluir a comissão.");
  }
}

export async function getComissoesResumo(): Promise<{ total: number; totalPendente: number; totalPago: number; totalAReceber: number; quantidade: number }> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("comissoes_indicadores")
    .select("valor, status")
    .eq("usuario_id", user.id);

  if (error) {
    throw new Error("Não foi possível carregar o resumo de comissões.");
  }

  const comissoes = data as ComissaoIndicador[];
  const total = comissoes.reduce((sum, c) => sum + Number(c.valor), 0);
  const totalPendente = comissoes
    .filter((c) => c.status === "Pendente")
    .reduce((sum, c) => sum + Number(c.valor), 0);
  const totalPago = comissoes
    .filter((c) => c.status === "Paga")
    .reduce((sum, c) => sum + Number(c.valor), 0);
  const totalAReceber = comissoes
    .filter((c) => c.status === "A receber" || c.status === "Prevista")
    .reduce((sum, c) => sum + Number(c.valor), 0);

  return {
    total: Math.round(total * 100) / 100,
    totalPendente: Math.round(totalPendente * 100) / 100,
    totalPago: Math.round(totalPago * 100) / 100,
    totalAReceber: Math.round(totalAReceber * 100) / 100,
    quantidade: comissoes.length,
  };
}