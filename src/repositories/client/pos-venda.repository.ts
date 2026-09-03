import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser, isAdminOrGestor } from "@/lib/auth-user";

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
export type PosVendaWithRelations = Database["public"]["Tables"]["pos_venda"]["Row"] & {
  cliente?: { id: string; nome: string; telefone: string; email: string };
};

type SupabaseError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function logSupabaseError(context: string, error: SupabaseError | null) {
  console.error(`[PosVenda] ${context} error:`, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
  });
}

function posVendaBaseQuery(supabase: ReturnType<typeof createClient>) {
  return supabase.from("pos_venda").select("*");
}

const ALLOWED_STATUS = [
  "Boas-vindas",
  "Comprovante",
  "Lembrete de vencimento",
  "Aplicativo do cliente",
  "Pagar o boleto",
  "Boleto em atraso",
  "Pago",
  "Cancelado",
  "Ativo",
  "Sorteio Loteria Federal",
  "Resultado número da Loteria Federal",
  "Resultado da Assembleia",
  "Dia da Assembleia",
  "Imóvel",
  "Motors",
  "Serviços",
  "Outros bens móveis",
  "Contemplei",
] as const;

const ALLOWED_CHANNELS = ["WhatsApp", "SMS", "Ligação"] as const;

function sanitizeStatus(status: unknown) {
  if (typeof status === "string" && (ALLOWED_STATUS as readonly string[]).includes(status)) {
    return status;
  }
  return "Boas-vindas";
}

function sanitizeChannel(channel: unknown) {
  if (typeof channel === "string" && (ALLOWED_CHANNELS as readonly string[]).includes(channel)) {
    return channel;
  }
  return "WhatsApp";
}

function normalizeOptionalId(value: unknown) {
  if (typeof value === "string" && value.trim() !== "") return value;
  return null;
}

function normalizePayload(payload: PosVendaInsert) {
  const now = new Date().toISOString();
  return {
    usuario_id: payload.usuario_id,
    cliente_id: normalizeOptionalId(payload.cliente_id),
    agenda_id: normalizeOptionalId(payload.agenda_id),
    status: sanitizeStatus(payload.status),
    priority: typeof payload.priority === "string" ? payload.priority : "normal",
    satisfaction: typeof payload.satisfaction === "number" && Number.isFinite(payload.satisfaction)
      ? Math.max(1, Math.min(5, Math.round(payload.satisfaction)))
      : 3,
    next_contact_at: payload.next_contact_at ?? null,
    last_contact_at: payload.last_contact_at ?? null,
    channel: sanitizeChannel(payload.channel),
    needs_attention: typeof payload.needs_attention === "boolean" ? payload.needs_attention : false,
    observacoes: typeof payload.observacoes === "string" ? payload.observacoes : "",
    boleto_url: typeof payload.boleto_url === "string" ? payload.boleto_url : "",
    lembrete_em: payload.lembrete_em ?? null,
    retencao_motivo: typeof payload.retencao_motivo === "string" ? payload.retencao_motivo : "",
    retencao_data: payload.retencao_data ?? null,
    created_at: now,
    updated_at: now,
  };
}

function normalizeUpdatePayload(payload: PosVendaUpdate) {
  const now = new Date().toISOString();
  const normalized: Record<string, unknown> = {
    status: sanitizeStatus(payload.status),
    priority: typeof payload.priority === "string" ? payload.priority : "normal",
    satisfaction: typeof payload.satisfaction === "number" && Number.isFinite(payload.satisfaction)
      ? Math.max(1, Math.min(5, Math.round(payload.satisfaction)))
      : 3,
    channel: sanitizeChannel(payload.channel),
    needs_attention: typeof payload.needs_attention === "boolean" ? payload.needs_attention : false,
    observacoes: typeof payload.observacoes === "string" ? payload.observacoes : "",
    boleto_url: typeof payload.boleto_url === "string" ? payload.boleto_url : "",
    retencao_motivo: typeof payload.retencao_motivo === "string" ? payload.retencao_motivo : "",
  };
  if (payload.cliente_id !== undefined) normalized.cliente_id = normalizeOptionalId(payload.cliente_id);
  if (payload.agenda_id !== undefined) normalized.agenda_id = normalizeOptionalId(payload.agenda_id);
  if (payload.next_contact_at !== undefined) normalized.next_contact_at = payload.next_contact_at ?? null;
  if (payload.last_contact_at !== undefined) normalized.last_contact_at = payload.last_contact_at ?? null;
  if (payload.lembrete_em !== undefined) normalized.lembrete_em = payload.lembrete_em ?? null;
  if (payload.retencao_data !== undefined) normalized.retencao_data = payload.retencao_data ?? null;
  normalized.updated_at = now;
  return normalized;
}

export async function getPosVendas(): Promise<PosVendaWithRelations[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pos_venda")
    .select("*")
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    logSupabaseError("getPosVendas", error);
    throw new Error("Não foi possível carregar as ações de pós-venda.");
  }
  return (data as PosVendaWithRelations[]) ?? [];
}

export async function getPosVenda(id: string): Promise<PosVenda | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = posVendaBaseQuery(supabase).eq("id", id);
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query.single();
  if (error) {
    logSupabaseError("getPosVenda", error);
    return null;
  }
  return data as PosVenda;
}

export async function createPosVenda(payload: PosVendaInsert): Promise<PosVenda> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const normalized = normalizePayload({ ...payload, usuario_id: user.id });
  const { data, error } = await supabase
    .from("pos_venda")
    .insert(normalized)
    .select()
    .single();

  if (error) {
    logSupabaseError("createPosVenda", error);
    throw new Error("Não foi possível salvar a ação de pós-venda.");
  }
  if (!data) throw new Error("Não foi possível salvar a ação de pós-venda.");
  return data as PosVenda;
}

export type ContatoOrigem = "cliente" | "lead" | "indicador" | "parceiro" | "recrutamento";

export interface ContatoBusca {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  origem: ContatoOrigem;
}

export async function searchContatos(telefone: string): Promise<ContatoBusca[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const digits = telefone.replace(/\D/g, "");
  if (!digits) return [];
  const pattern = `%${digits}%`;

  const results: ContatoBusca[] = [];

  const queries = [
    { table: "clientes", origem: "cliente" as const },
    { table: "leads", origem: "lead" as const },
    { table: "indicadores", origem: "indicador" as const },
    { table: "parceiros", origem: "parceiro" as const },
    { table: "recrutamento", origem: "recrutamento" as const },
  ];

  for (const { table, origem } of queries) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("id, nome, telefone, email")
        .or(`telefone.like.${pattern}`)
        .eq("usuario_id", user.id);

      if (error) {
        console.error(`[PosVenda] searchContatos ${table}:`, error.message);
        continue;
      }

      for (const row of (data ?? []) as { id: string; nome: string; telefone: string; email: string }[]) {
        results.push({ id: row.id, nome: row.nome, telefone: row.telefone, email: row.email, origem });
      }
    } catch (err) {
      console.error(`[PosVenda] searchContatos ${table} exception:`, err);
    }
  }

  return results;
}

export async function convertToCliente(contato: ContatoBusca): Promise<string | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();

  if (contato.origem === "cliente") return contato.id;

  const existing = await supabase
    .from("clientes")
    .select("id")
    .eq("telefone", contato.telefone)
    .eq("usuario_id", user.id)
    .single();

  if (!existing.error && existing.data) return (existing.data as { id: string }).id;

  const { data, error } = await supabase
    .from("clientes")
    .insert({
      nome: contato.nome,
      telefone: contato.telefone,
      email: contato.email || "",
      observacoes: `Convertido de ${contato.origem} no módulo de pós-venda.`,
      origem: contato.origem,
      status: "Ativo",
      usuario_id: user.id,
    })
    .select()
    .single();

  if (error) {
    logSupabaseError("convertToCliente", error);
    return null;
  }
  return (data as { id: string }).id;
}

export async function updatePosVenda(id: string, payload: PosVendaUpdate): Promise<PosVenda> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const normalized = normalizeUpdatePayload(payload);
  const base = supabase.from("pos_venda").update(normalized).eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { data, error } = await query.select().single();
  if (error) {
    logSupabaseError("updatePosVenda", error);
    throw new Error("Não foi possível atualizar a ação de pós-venda.");
  }
  if (!data) throw new Error("Não foi possível atualizar a ação de pós-venda.");
  return data as PosVenda;
}

export async function deletePosVenda(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("pos_venda").delete().eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { error } = await query;
  if (error) {
    logSupabaseError("deletePosVenda", error);
    throw new Error("Não foi possível excluir a ação de pós-venda.");
  }
}

export async function getPosVendaHistorico(posVendaId: string): Promise<PosVendaHistorico[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pos_venda_historico")
    .select("*")
    .eq("pos_venda_id", posVendaId)
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    logSupabaseError("getPosVendaHistorico", error);
    throw new Error("Não foi possível carregar o histórico.");
  }
  return (data as PosVendaHistorico[]) ?? [];
}

export async function addPosVendaHistorico(posVendaId: string, payload: { tipo?: string; descricao?: string }) {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pos_venda_historico")
    .insert({ pos_venda_id: posVendaId, usuario_id: user.id, ...payload })
    .select()
    .single();

  if (error) {
    logSupabaseError("addPosVendaHistorico", error);
    throw new Error("Não foi possível adicionar histórico.");
  }
  return data as PosVendaHistorico;
}

export async function getPosVendaTarefas(posVendaId: string): Promise<PosVendaTarefa[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pos_venda_tarefas")
    .select("*")
    .eq("pos_venda_id", posVendaId)
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    logSupabaseError("getPosVendaTarefas", error);
    throw new Error("Não foi possível carregar as tarefas.");
  }
  return (data as PosVendaTarefa[]) ?? [];
}

export async function createPosVendaTarefa(payload: PosVendaTarefaInsert): Promise<PosVendaTarefa> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pos_venda_tarefas")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error) {
    logSupabaseError("createPosVendaTarefa", error);
    throw new Error("Não foi possível salvar a tarefa.");
  }
  if (!data) throw new Error("Não foi possível salvar a tarefa.");
  return data as PosVendaTarefa;
}

export async function updatePosVendaTarefa(id: string, payload: PosVendaTarefaUpdate): Promise<PosVendaTarefa> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pos_venda_tarefas")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error) {
    logSupabaseError("updatePosVendaTarefa", error);
    throw new Error("Não foi possível atualizar a tarefa.");
  }
  if (!data) throw new Error("Não foi possível atualizar a tarefa.");
  return data as PosVendaTarefa;
}

export async function deletePosVendaTarefa(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { error } = await supabase.from("pos_venda_tarefas").delete().eq("id", id).eq("usuario_id", user.id);
  if (error) {
    logSupabaseError("deletePosVendaTarefa", error);
    throw new Error("Não foi possível excluir a tarefa.");
  }
}

export async function getPosVendaComunicacoes(posVendaId: string): Promise<PosVendaComunicacao[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pos_venda_comunicacoes")
    .select("*")
    .eq("pos_venda_id", posVendaId)
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    logSupabaseError("getPosVendaComunicacoes", error);
    throw new Error("Não foi possível carregar as comunicações.");
  }
  return (data as PosVendaComunicacao[]) ?? [];
}

export async function createPosVendaComunicacao(payload: PosVendaComunicacaoInsert): Promise<PosVendaComunicacao> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pos_venda_comunicacoes")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error) {
    logSupabaseError("createPosVendaComunicacao", error);
    throw new Error("Não foi possível salvar a comunicação.");
  }
  if (!data) throw new Error("Não foi possível salvar a comunicação.");
  return data as PosVendaComunicacao;
}

export async function updatePosVendaComunicacao(id: string, payload: PosVendaComunicacaoUpdate): Promise<PosVendaComunicacao> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pos_venda_comunicacoes")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error) {
    logSupabaseError("updatePosVendaComunicacao", error);
    throw new Error("Não foi possível atualizar a comunicação.");
  }
  if (!data) throw new Error("Não foi possível atualizar a comunicação.");
  return data as PosVendaComunicacao;
}

export async function deletePosVendaComunicacao(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { error } = await supabase.from("pos_venda_comunicacoes").delete().eq("id", id).eq("usuario_id", user.id);
  if (error) {
    logSupabaseError("deletePosVendaComunicacao", error);
    throw new Error("Não foi possível excluir a comunicação.");
  }
}
