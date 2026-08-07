import { getBrowserSupabase } from "@/repositories/supabase-browser";
import type { Agenda } from "@/types/crm";
import type { Database } from "@/types/database.types";

const LOCAL_AGENDAS_KEY = "crm-agendas-local";
const LOCAL_INDICADORES_KEY = "crm-indicadores-local";
const LOCAL_CLIENTES_KEY = "crm-clientes-local";

export type AgendaInsertInput = {
  usuario_id: string;
  indicador_id?: string | null;
  cliente_id?: string | null;
  titulo: string;
  descricao: string;
  data_hora: string;
  duracao_minutos: number;
  tipo: string;
  status: string;
  local_online: string;
  notas_conclusao: string;
};

export type AgendaUpdateInput = Partial<Omit<AgendaInsertInput, "usuario_id">>;

type AgendaRow = Database["public"]["Tables"]["agendas"]["Row"] & {
  indicadores?: Array<{ nome: string | null }> | null;
  clientes?: Array<{ nome: string | null }> | null;
};

type LocalIndicator = {
  id: string;
  nome: string;
};

type LocalCliente = {
  id: string;
  nome: string;
};

function isSchemaCacheError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null
        ? String((error as { message?: unknown }).message ?? "")
        : "";

  return /schema cache|could not find the table|relation .* does not exist/i.test(message);
}

function readLocalJson<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function writeLocalAgendas(agendas: Agenda[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_AGENDAS_KEY, JSON.stringify(agendas));
}

function getLocalIndicators(): LocalIndicator[] {
  return readLocalJson<LocalIndicator>(LOCAL_INDICADORES_KEY);
}

function getLocalClientes(): LocalCliente[] {
  return readLocalJson<LocalCliente>(LOCAL_CLIENTES_KEY);
}

function getIndicatorName(indicadorId: string): string | null {
  const indicator = getLocalIndicators().find((item) => item.id === indicadorId);
  return indicator?.nome ?? null;
}

function getClienteName(clienteId: string): string | null {
  const cliente = getLocalClientes().find((item) => item.id === clienteId);
  return cliente?.nome ?? null;
}

function sortAgendasByDateAsc(agendas: Agenda[]): Agenda[] {
  return [...agendas].sort((left, right) => {
    const dateLeft = new Date(left.data_hora).getTime();
    const dateRight = new Date(right.data_hora).getTime();
    return dateLeft - dateRight;
  });
}

function readLocalAgendas(): Agenda[] {
  return sortAgendasByDateAsc(readLocalJson<Agenda>(LOCAL_AGENDAS_KEY));
}

function mergeAgendas(remote: Agenda[], local: Agenda[]): Agenda[] {
  const merged = new Map<string, Agenda>();

  for (const agenda of remote) {
    merged.set(agenda.id, agenda);
  }

  for (const agenda of local) {
    if (!merged.has(agenda.id)) {
      merged.set(agenda.id, agenda);
    }
  }

  return sortAgendasByDateAsc(Array.from(merged.values()));
}

function createLocalAgenda(input: AgendaInsertInput): Agenda {
  const now = new Date().toISOString();

  return {
    id: `local-${crypto.randomUUID()}`,
    usuario_id: input.usuario_id,
    indicador_id: input.indicador_id ?? null,
    cliente_id: input.cliente_id ?? null,
    indicador_nome: input.indicador_id ? getIndicatorName(input.indicador_id) : null,
    cliente_nome: input.cliente_id ? getClienteName(input.cliente_id) : null,
    titulo: input.titulo,
    descricao: input.descricao,
    data_hora: input.data_hora,
    duracao_minutos: input.duracao_minutos,
    tipo: input.tipo,
    status: input.status,
    local_online: input.local_online,
    notas_conclusao: input.notas_conclusao,
    created_at: now,
    updated_at: now,
  };
}

function mapAgendaRow(row: AgendaRow): Agenda {
  return {
    id: row.id,
    usuario_id: row.usuario_id,
    indicador_id: row.indicador_id,
    cliente_id: row.cliente_id,
    indicador_nome: row.indicadores?.[0]?.nome ?? null,
    cliente_nome: row.clientes?.[0]?.nome ?? null,
    titulo: row.titulo,
    descricao: row.descricao,
    data_hora: row.data_hora,
    duracao_minutos: row.duracao_minutos,
    tipo: row.tipo,
    status: row.status,
    local_online: row.local_online,
    notas_conclusao: row.notas_conclusao,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listAgendasRepository(): Promise<Agenda[]> {
  const supabase = getBrowserSupabase();
  const localAgendas = readLocalAgendas();

  try {
    const { data, error } = await supabase
      .from("agendas")
      .select("*, indicadores(nome), clientes(nome)")
      .order("data_hora", { ascending: true });

    if (error) throw error;

    return mergeAgendas(((data as AgendaRow[] | null) ?? []).map(mapAgendaRow), localAgendas);
  } catch (error) {
    if (!isSchemaCacheError(error)) throw error;
    return localAgendas;
  }
}

export async function saveAgendaRepository(input: AgendaInsertInput, id?: string): Promise<Agenda> {
  const localAgendas = readLocalAgendas();
  const localAgenda = id ? localAgendas.find((item) => item.id === id) : undefined;

  if (id && localAgenda) {
    const updatedAgenda: Agenda = {
      ...localAgenda,
      indicador_id: input.indicador_id ?? null,
      cliente_id: input.cliente_id ?? null,
      indicador_nome: input.indicador_id ? getIndicatorName(input.indicador_id) : null,
      cliente_nome: input.cliente_id ? getClienteName(input.cliente_id) : null,
      titulo: input.titulo,
      descricao: input.descricao,
      data_hora: input.data_hora,
      duracao_minutos: input.duracao_minutos,
      tipo: input.tipo,
      status: input.status,
      local_online: input.local_online,
      notas_conclusao: input.notas_conclusao,
      updated_at: new Date().toISOString(),
    };

    writeLocalAgendas(localAgendas.map((item) => (item.id === id ? updatedAgenda : item)));
    return updatedAgenda;
  }

  const supabase = getBrowserSupabase();
  const payload = {
    indicador_id: input.indicador_id ?? null,
    cliente_id: input.cliente_id ?? null,
    titulo: input.titulo,
    descricao: input.descricao,
    data_hora: input.data_hora,
    duracao_minutos: input.duracao_minutos,
    tipo: input.tipo,
    status: input.status,
    local_online: input.local_online,
    notas_conclusao: input.notas_conclusao,
  };

  const query = id
    ? supabase
        .from("agendas")
        .update(payload)
        .eq("id", id)
        .select("*, indicadores(nome), clientes(nome)")
        .single()
    : supabase
        .from("agendas")
        .insert({ ...payload, usuario_id: input.usuario_id })
        .select("*, indicadores(nome), clientes(nome)")
        .single();

  try {
    const { data, error } = await query;
    if (error) throw error;
    return mapAgendaRow(data as AgendaRow);
  } catch (error) {
    if (!isSchemaCacheError(error)) throw error;

    if (id) {
      const updatedAgenda = localAgendas.find((item) => item.id === id);
      if (!updatedAgenda) throw error;
      return updatedAgenda;
    }

    const createdAgenda = createLocalAgenda(input);
    writeLocalAgendas([...localAgendas, createdAgenda]);
    return createdAgenda;
  }
}

export async function deleteAgendaRepository(id: string): Promise<void> {
  const localAgendas = readLocalAgendas();
  const hasLocalAgenda = localAgendas.some((item) => item.id === id);

  if (hasLocalAgenda) {
    writeLocalAgendas(localAgendas.filter((item) => item.id !== id));
  }

  const supabase = getBrowserSupabase();
  try {
    const { error } = await supabase.from("agendas").delete().eq("id", id);

    if (error) throw error;
  } catch (error) {
    if (!isSchemaCacheError(error) && !hasLocalAgenda) throw error;
  }
}

export function subscribeAgendasRealtimeRepository(onChange: () => void): () => void {
  const supabase = getBrowserSupabase();

  const channel = supabase
    .channel("agendas-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "agendas" }, () => onChange())
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
