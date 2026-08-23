import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser, isAdminOrGestor } from "@/lib/auth-user";

export type Cliente = Database["public"]["Tables"]["clientes"]["Row"];
export type ClienteInsert = Database["public"]["Tables"]["clientes"]["Insert"];
export type ClienteUpdate = Database["public"]["Tables"]["clientes"]["Update"];
export type ClienteHistorico = Database["public"]["Tables"]["cliente_historico"]["Row"];
export type ClienteContato = Database["public"]["Tables"]["cliente_contatos"]["Row"];

function clienteBaseQuery(supabase: ReturnType<typeof createClient>) {
  return supabase.from("clientes").select("*");
}

export async function getClientes(): Promise<Cliente[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = clienteBaseQuery(supabase).order("created_at", { ascending: false });
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar os clientes.");
  return (data as Cliente[]) ?? [];
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = clienteBaseQuery(supabase).eq("id", id);
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query.single();
  if (error || !data) return null;
  return data as Cliente;
}

export async function createCliente(payload: ClienteInsert): Promise<Cliente> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const insertPayload = { ...payload, usuario_id: user.id };
  console.log("[clientes.repository] createCliente payload", insertPayload);
  const { data, error } = await supabase
    .from("clientes")
    .insert(insertPayload)
    .select()
    .single();
  if (error) {
    console.error("[clientes.repository] createCliente error detalhe:", error);
    throw new Error(`Não foi possível salvar o cliente: ${error.message}`);
  }
  if (!data) throw new Error("Não foi possível salvar o cliente.");
  return data as Cliente;
}

export async function updateCliente(id: string, payload: ClienteUpdate): Promise<Cliente> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("clientes").update(payload).eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { data, error } = await query.select().single();
  if (error || !data) throw new Error("Não foi possível atualizar o cliente.");
  return data as Cliente;
}

export async function deleteCliente(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("clientes").delete().eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { error } = await query;
  if (error) throw new Error("Não foi possível excluir o cliente.");
}

export async function searchClientes(query: string): Promise<Cliente[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const normalized = query.trim();
  if (!normalized) return [];
  const escaped = normalized.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  const pattern = `%${escaped}%`;
  let q = clienteBaseQuery(supabase)
    .or(`nome.ilike.${pattern},telefone.ilike.${pattern},cidade.ilike.${pattern},origem.ilike.${pattern},observacoes.ilike.${pattern}`)
    .order("created_at", { ascending: false });
  if (!isAdminOrGestor(user)) {
    q = q.eq("usuario_id", user.id);
  }
  const { data, error } = await q;
  if (error) throw new Error("Não foi possível pesquisar clientes.");
  return (data as Cliente[]) ?? [];
}

export async function filterClientesByStatus(status: string): Promise<Cliente[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = clienteBaseQuery(supabase).eq("status", status).order("created_at", { ascending: false });
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível filtrar clientes.");
  return (data as Cliente[]) ?? [];
}

export async function getClienteHistorico(clienteId: string): Promise<ClienteHistorico[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cliente_historico")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar o histórico.");
  return (data as ClienteHistorico[]) ?? [];
}

export async function addClienteHistorico(clienteId: string, payload: { tipo?: string; descricao?: string }) {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cliente_historico")
    .insert({ cliente_id: clienteId, usuario_id: user.id, ...payload })
    .select()
    .single();
  if (error) throw new Error("Não foi possível adicionar histórico.");
  return data as ClienteHistorico;
}

export async function getClienteContatos(clienteId: string): Promise<ClienteContato[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cliente_contatos")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os contatos.");
  return (data as ClienteContato[]) ?? [];
}

export async function addClienteContato(clienteId: string, payload: { nome: string; telefone: string; email: string; tipo: string; observacoes: string }) {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cliente_contatos")
    .insert({ cliente_id: clienteId, usuario_id: user.id, ...payload })
    .select()
    .single();
  if (error) throw new Error("Não foi possível adicionar contato.");
  return data as ClienteContato;
}

export async function updateClienteContato(id: string, payload: { nome?: string; telefone?: string; email?: string; tipo?: string; observacoes?: string }) {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cliente_contatos")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();
  if (error || !data) throw new Error("Não foi possível atualizar o contato.");
  return data as ClienteContato;
}

export async function deleteClienteContato(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { error } = await supabase
    .from("cliente_contatos")
    .delete()
    .eq("id", id)
    .eq("usuario_id", user.id);
  if (error) throw new Error("Não foi possível remover o contato.");
}

