import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import type { Database } from "@/types/database.types";

export type PosVenda = Database["public"]["Tables"]["pos_venda"]["Row"];
export type PosVendaInsert = Database["public"]["Tables"]["pos_venda"]["Insert"];
export type PosVendaUpdate = Database["public"]["Tables"]["pos_venda"]["Update"];
export type PosVendaHistorico = Database["public"]["Tables"]["pos_venda_historico"]["Row"];
export type PosVendaTarefa = Database["public"]["Tables"]["pos_venda_tarefas"]["Row"];
export type PosVendaTarefaInsert = Database["public"]["Tables"]["pos_venda_tarefas"]["Insert"];
export type PosVendaTarefaUpdate = Database["public"]["Tables"]["pos_venda_tarefas"]["Update"];
export type PosVendaComunicacao = Database["public"]["Tables"]["pos_venda_comunicacoes"]["Row"];
export type PosVendaComunicacaoInsert = Database["public"]["Tables"]["pos_venda_comunicacoes"]["Insert"];
export type PosVendaComunicacaoUpdate = Database["public"]["Tables"]["pos_venda_comunicacoes"]["Update"];

export async function getPosVendas(): Promise<PosVenda[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pos_venda")
    .select("*")
    .eq("usuario_id", user.id)
    .order("data_prevista", { ascending: true });

  if (error) {
    throw new Error("Não foi possível carregar as ações de pós-venda.");
  }

  return (data as PosVenda[]) ?? [];
}

export async function getPosVenda(id: string): Promise<PosVenda | null> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pos_venda")
    .select("*")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as PosVenda;
}

export async function createPosVenda(payload: PosVendaInsert): Promise<PosVenda> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pos_venda")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível salvar a ação de pós-venda.");
  }

  return data as PosVenda;
}

export async function updatePosVenda(id: string, payload: PosVendaUpdate): Promise<PosVenda> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pos_venda")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível atualizar a ação de pós-venda.");
  }

  return data as PosVenda;
}

export async function deletePosVenda(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { error } = await supabase.from("pos_venda").delete().eq("id", id).eq("usuario_id", user.id);

  if (error) {
    throw new Error("Não foi possível excluir a ação de pós-venda.");
  }
}

export async function getPosVendaHistorico(posVendaId: string): Promise<PosVendaHistorico[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pos_venda_historico")
    .select("*")
    .eq("pos_venda_id", posVendaId)
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Não foi possível carregar o histórico.");
  return (data as PosVendaHistorico[]) ?? [];
}

export async function addPosVendaHistorico(posVendaId: string, payload: { tipo?: string; descricao?: string }) {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pos_venda_historico")
    .insert({ pos_venda_id: posVendaId, usuario_id: user.id, ...payload })
    .select()
    .single();

  if (error) throw new Error("Não foi possível adicionar histórico.");
  return data as PosVendaHistorico;
}

export async function getPosVendaTarefas(posVendaId: string): Promise<PosVendaTarefa[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pos_venda_tarefas")
    .select("*")
    .eq("pos_venda_id", posVendaId)
    .eq("usuario_id", user.id)
    .order("data_prevista", { ascending: true });

  if (error) throw new Error("Não foi possível carregar as tarefas.");
  return (data as PosVendaTarefa[]) ?? [];
}

export async function createPosVendaTarefa(payload: PosVendaTarefaInsert): Promise<PosVendaTarefa> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pos_venda_tarefas")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível salvar a tarefa.");
  return data as PosVendaTarefa;
}

export async function updatePosVendaTarefa(id: string, payload: PosVendaTarefaUpdate): Promise<PosVendaTarefa> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pos_venda_tarefas")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível atualizar a tarefa.");
  return data as PosVendaTarefa;
}

export async function deletePosVendaTarefa(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { error } = await supabase.from("pos_venda_tarefas").delete().eq("id", id).eq("usuario_id", user.id);

  if (error) {
    throw new Error("Não foi possível excluir a tarefa.");
  }
}

export async function getPosVendaComunicacoes(posVendaId: string): Promise<PosVendaComunicacao[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pos_venda_comunicacoes")
    .select("*")
    .eq("pos_venda_id", posVendaId)
    .eq("usuario_id", user.id)
    .order("data", { ascending: false });

  if (error) throw new Error("Não foi possível carregar as comunicações.");
  return (data as PosVendaComunicacao[]) ?? [];
}

export async function createPosVendaComunicacao(payload: PosVendaComunicacaoInsert): Promise<PosVendaComunicacao> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pos_venda_comunicacoes")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível salvar a comunicação.");
  return data as PosVendaComunicacao;
}

export async function updatePosVendaComunicacao(id: string, payload: PosVendaComunicacaoUpdate): Promise<PosVendaComunicacao> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pos_venda_comunicacoes")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível atualizar a comunicação.");
  return data as PosVendaComunicacao;
}

export async function deletePosVendaComunicacao(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { error } = await supabase.from("pos_venda_comunicacoes").delete().eq("id", id).eq("usuario_id", user.id);

  if (error) {
    throw new Error("Não foi possível excluir a comunicação.");
  }
}