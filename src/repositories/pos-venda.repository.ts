import { getBrowserSupabase } from "@/repositories/supabase-browser";
import { deleteAgendaRepository, saveAgendaRepository } from "@/repositories/agendas.repository";
import { listClientesRepository } from "@/repositories/clientes.repository";
import type { Cliente, PosVendaRecord, PosVendaUpsertInput } from "@/types/crm";
import type { Database } from "@/types/database.types";

const LOCAL_POS_VENDA_KEY = "crm-pos-venda-local";

type PosVendaRow = Database["public"]["Tables"]["pos_venda"]["Row"] & {
  clientes?: Array<{
    nome: string | null;
    telefone: string | null;
    cidade: string | null;
  }> | null;
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

function readLocalRecords(): PosVendaRecord[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(LOCAL_POS_VENDA_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as PosVendaRecord[];
  } catch {
    return [];
  }
}

function writeLocalRecords(records: PosVendaRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_POS_VENDA_KEY, JSON.stringify(records));
}

function sortRecords(records: PosVendaRecord[]): PosVendaRecord[] {
  return [...records].sort((left, right) => {
    const leftAttention = left.needs_attention ? 1 : 0;
    const rightAttention = right.needs_attention ? 1 : 0;
    if (leftAttention !== rightAttention) {
      return rightAttention - leftAttention;
    }

    const leftNext = left.next_contact_at ? new Date(left.next_contact_at).getTime() : Number.MAX_SAFE_INTEGER;
    const rightNext = right.next_contact_at ? new Date(right.next_contact_at).getTime() : Number.MAX_SAFE_INTEGER;
    if (leftNext !== rightNext) {
      return leftNext - rightNext;
    }

    const leftUpdated = left.updated_at ? new Date(left.updated_at).getTime() : 0;
    const rightUpdated = right.updated_at ? new Date(right.updated_at).getTime() : 0;
    return rightUpdated - leftUpdated;
  });
}

function toDefaultRecord(cliente: Cliente): PosVendaRecord {
  const now = new Date().toISOString();

  return {
    id: `posvenda-${cliente.id}`,
    usuario_id: "",
    cliente_id: cliente.id,
    agenda_id: null,
    cliente_nome: cliente.nome,
    telefone: cliente.telefone,
    cidade: cliente.cidade,
    status: "Boas-vindas",
    priority: "Media",
    satisfaction: 3,
    next_contact_at: null,
    last_contact_at: cliente.updated_at ?? cliente.created_at ?? now,
    channel: "Telefone",
    needs_attention: false,
    observacoes: cliente.observacoes ?? "",
    created_at: cliente.created_at ?? now,
    updated_at: cliente.updated_at ?? now,
  };
}

function mapPosVendaRow(row: PosVendaRow): PosVendaRecord {
  const cliente = row.clientes?.[0];
  return {
    id: row.id,
    usuario_id: row.usuario_id,
    cliente_id: row.cliente_id,
    agenda_id: row.agenda_id,
    cliente_nome: cliente?.nome ?? "Cliente",
    telefone: cliente?.telefone ?? "",
    cidade: cliente?.cidade ?? "",
    status: row.status as PosVendaRecord["status"],
    priority: row.priority as PosVendaRecord["priority"],
    satisfaction: row.satisfaction,
    next_contact_at: row.next_contact_at,
    last_contact_at: row.last_contact_at,
    channel: row.channel,
    needs_attention: row.needs_attention,
    observacoes: row.observacoes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function syncAgendaForPosVenda(input: PosVendaUpsertInput, currentAgendaId?: string | null) {
  if (!input.next_contact_at) {
    if (currentAgendaId) {
      await deleteAgendaRepository(currentAgendaId);
    }
    return null;
  }

  const agenda = await saveAgendaRepository(
    {
      usuario_id: input.usuario_id,
      cliente_id: input.cliente_id,
      indicador_id: null,
      titulo: `Follow-up pós-venda - ${input.cliente_nome}`,
      descricao: input.observacoes || `Acompanhamento de pós-venda via ${input.channel}.`,
      data_hora: input.next_contact_at,
      duracao_minutos: 30,
      tipo: "Pos-venda",
      status: "Agendado",
      local_online: "",
      notas_conclusao: "",
    },
    currentAgendaId ?? undefined,
  );

  return agenda.id;
}

function mergeClientesWithRecords(clientes: Cliente[], records: PosVendaRecord[]): PosVendaRecord[] {
  const map = new Map<string, PosVendaRecord>();

  for (const cliente of clientes) {
    const existing = records.find((record) => record.cliente_id === cliente.id);
    map.set(
      cliente.id,
      existing
        ? {
            ...existing,
            cliente_nome: cliente.nome,
            telefone: cliente.telefone,
            cidade: cliente.cidade,
            observacoes: existing.observacoes || cliente.observacoes || "",
            updated_at: existing.updated_at ?? cliente.updated_at ?? cliente.created_at ?? new Date().toISOString(),
          }
        : toDefaultRecord(cliente),
    );
  }

  for (const record of records) {
    if (!map.has(record.cliente_id)) {
      map.set(record.cliente_id, record);
    }
  }

  return sortRecords(Array.from(map.values()));
}

export async function listPosVendaRepository(): Promise<PosVendaRecord[]> {
  const clientes = await listClientesRepository();
  const records = readLocalRecords();
  const supabase = getBrowserSupabase();

  try {
    const { data, error } = await supabase
      .from("pos_venda")
      .select("*, clientes(nome, telefone, cidade)")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const remote = ((data as PosVendaRow[] | null) ?? []).map(mapPosVendaRow);
    const merged = mergeClientesWithRecords(clientes, [...remote, ...records]);
    writeLocalRecords(merged);
    return merged;
  } catch (error) {
    if (!isSchemaCacheError(error)) throw error;

    const merged = mergeClientesWithRecords(clientes, records);
    writeLocalRecords(merged);
    return merged;
  }
}

export async function savePosVendaRepository(input: PosVendaUpsertInput, id?: string): Promise<PosVendaRecord> {
  const records = readLocalRecords();
  const now = new Date().toISOString();
  const currentRecord = id ? records.find((record) => record.id === id) : records.find((record) => record.cliente_id === input.cliente_id);
  const syncedAgendaId = await syncAgendaForPosVenda(input, currentRecord?.agenda_id ?? null);

  const supabase = getBrowserSupabase();

  try {
    const payload = {
      usuario_id: input.usuario_id,
      cliente_id: input.cliente_id,
      agenda_id: syncedAgendaId,
      status: input.status,
      priority: input.priority,
      satisfaction: input.satisfaction,
      next_contact_at: input.next_contact_at,
      last_contact_at: input.last_contact_at,
      channel: input.channel,
      needs_attention: input.needs_attention,
      observacoes: input.observacoes,
    };

    const { data, error } = await supabase
      .from("pos_venda")
      .upsert(payload, { onConflict: "usuario_id,cliente_id" })
      .select("*, clientes(nome, telefone, cidade)")
      .single();

    if (error) throw error;

    const saved = mapPosVendaRow(data as PosVendaRow);
    const nextRecords = records.filter((record) => record.cliente_id !== saved.cliente_id && record.id !== saved.id);
    writeLocalRecords(sortRecords([saved, ...nextRecords]));
    return saved;
  } catch (error) {
    if (!isSchemaCacheError(error)) throw error;
  }

  if (id) {
    const nextRecords = records.map((record) =>
      record.id === id
        ? {
            ...record,
            ...input,
            agenda_id: syncedAgendaId,
            updated_at: now,
          }
        : record,
    );
    const updated = nextRecords.find((record) => record.id === id);
    if (!updated) {
      throw new Error("Registro de pós-venda não encontrado.");
    }
    writeLocalRecords(sortRecords(nextRecords));
    return updated;
  }

  const created: PosVendaRecord = {
    id: `posvenda-${crypto.randomUUID()}`,
    ...input,
    agenda_id: syncedAgendaId,
    created_at: now,
    updated_at: now,
  };
  writeLocalRecords(sortRecords([created, ...records]));
  return created;
}

export async function deletePosVendaRepository(id: string): Promise<void> {
  const records = readLocalRecords();
  const current = records.find((record) => record.id === id);

  if (current?.agenda_id) {
    await deleteAgendaRepository(current.agenda_id);
  }

  writeLocalRecords(records.filter((record) => record.id !== id));

  const supabase = getBrowserSupabase();
  try {
    const { error } = await supabase.from("pos_venda").delete().eq("id", id);
    if (error) throw error;
  } catch (error) {
    if (!isSchemaCacheError(error)) throw error;
  }
}