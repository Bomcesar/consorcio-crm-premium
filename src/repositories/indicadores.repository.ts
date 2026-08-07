import { getBrowserSupabase } from "@/repositories/supabase-browser";
import type { Commission, Contact, Indicator } from "@/types/crm";

const LOCAL_STORAGE_KEY = "crm-indicadores-local";

export type IndicatorInsertInput = {
  nome: string;
  telefone: string;
  whatsapp: string;
  email: string;
  cidade: string;
  estado: string;
  cpf: string;
  pix: string;
  origem: string;
  profissao: string;
  data_entrada: string;
  status: string;
  observacoes: string;
  ativo: boolean;
  usuario_id: string;
};

export type ContactInsertInput = {
  indicador_id: string;
  nome: string;
  telefone: string;
  cidade: string;
  status: string;
  observacoes: string;
  usuario_id: string;
};

export type DashboardSummarySource = {
  indicators: Array<{ id: string; nome: string; ativo: boolean; status: string }>;
  contacts: Array<{ indicador_id: string }>;
  commissions: Array<{ indicador_id: string; status: string; valor: number }>;
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

function readLocalIndicators(): Indicator[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as Indicator[];
  } catch {
    return [];
  }
}

function writeLocalIndicators(indicators: Indicator[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(indicators));
}

function sortIndicatorsByCreatedAt(indicators: Indicator[]): Indicator[] {
  return [...indicators].sort((left, right) => {
    const dateLeft = new Date(left.created_at ?? 0).getTime();
    const dateRight = new Date(right.created_at ?? 0).getTime();
    return dateRight - dateLeft;
  });
}

function mergeIndicators(remote: Indicator[], local: Indicator[]): Indicator[] {
  const merged = new Map<string, Indicator>();

  for (const indicator of remote) {
    merged.set(indicator.id, indicator);
  }

  for (const indicator of local) {
    if (!merged.has(indicator.id)) {
      merged.set(indicator.id, indicator);
    }
  }

  return sortIndicatorsByCreatedAt(Array.from(merged.values()));
}

function mergeSummaryIndicators(
  remote: Array<{ id: string; nome: string; ativo: boolean; status: string }>,
  local: Indicator[],
): Array<{ id: string; nome: string; ativo: boolean; status: string }> {
  const merged = new Map<string, { id: string; nome: string; ativo: boolean; status: string }>();

  for (const indicator of remote) {
    merged.set(indicator.id, indicator);
  }

  for (const indicator of local) {
    if (!merged.has(indicator.id)) {
      merged.set(indicator.id, {
        id: indicator.id,
        nome: indicator.nome,
        ativo: indicator.ativo,
        status: indicator.status,
      });
    }
  }

  return Array.from(merged.values());
}

function findLocalIndicator(indicatorId: string): Indicator | undefined {
  return readLocalIndicators().find((indicator) => indicator.id === indicatorId);
}

function createLocalIndicator(payload: IndicatorInsertInput): Indicator {
  const now = new Date().toISOString();
  return {
    id: `local-${crypto.randomUUID()}`,
    created_at: now,
    updated_at: now,
    nome: payload.nome,
    telefone: payload.telefone,
    whatsapp: payload.whatsapp,
    email: payload.email,
    cidade: payload.cidade,
    estado: payload.estado,
    cpf: payload.cpf,
    pix: payload.pix,
    origem: payload.origem,
    profissao: payload.profissao,
    data_entrada: payload.data_entrada,
    status: payload.status,
    observacoes: payload.observacoes,
    ativo: payload.ativo,
    usuario_id: payload.usuario_id,
  };
}

export async function getAuthenticatedUserRepository() {
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;
  return data.user;
}

export async function listIndicatorsRepository(): Promise<Indicator[]> {
  const supabase = getBrowserSupabase();
  const localIndicators = readLocalIndicators();

  try {
    const { data, error } = await supabase.from("indicadores").select("*").order("created_at", { ascending: false });

    if (error) throw error;

    return mergeIndicators((data as Indicator[]) ?? [], localIndicators);
  } catch (error) {
    if (isSchemaCacheError(error)) {
      return sortIndicatorsByCreatedAt(localIndicators);
    }

    throw error;
  }
}

export async function getDashboardSummarySourceRepository(): Promise<DashboardSummarySource> {
  const supabase = getBrowserSupabase();
  const localIndicators = readLocalIndicators();

  try {
    const [{ data: indicatorsData, error: indicatorsError }, { data: contactsData, error: contactsError }, { data: commissionsData, error: commissionsError }] = await Promise.all([
      supabase.from("indicadores").select("id, nome, ativo, status").order("created_at", { ascending: false }),
      supabase.from("contatos_indicados").select("indicador_id"),
      supabase.from("comissoes_indicadores").select("indicador_id, status, valor"),
    ]);

    if (indicatorsError) throw indicatorsError;
    if (contactsError) throw contactsError;
    if (commissionsError) throw commissionsError;

    const mergedIndicators = mergeSummaryIndicators(
      (indicatorsData as Array<{ id: string; nome: string; ativo: boolean; status: string }>) ?? [],
      localIndicators,
    );

    return {
      indicators: mergedIndicators,
      contacts: (contactsData as Array<{ indicador_id: string }>) ?? [],
      commissions: (commissionsData as Array<{ indicador_id: string; status: string; valor: number }>) ?? [],
    };
  } catch (error) {
    if (!isSchemaCacheError(error)) throw error;

    const indicators = readLocalIndicators();
    return {
      indicators: indicators.map((indicator) => ({
        id: indicator.id,
        nome: indicator.nome,
        ativo: indicator.ativo,
        status: indicator.status,
      })),
      contacts: [],
      commissions: [],
    };
  }
}

export async function saveIndicatorRepository(payload: IndicatorInsertInput, id?: string): Promise<Indicator> {
  const supabase = getBrowserSupabase();
  const localIndicator = id ? findLocalIndicator(id) : undefined;

  if (id && localIndicator) {
    const nextIndicators = readLocalIndicators().map((indicator) =>
      indicator.id === id ? { ...indicator, ...payload, updated_at: new Date().toISOString() } : indicator,
    );
    const updated = nextIndicators.find((indicator) => indicator.id === id);
    if (!updated) {
      throw new Error("Nao foi possivel localizar o indicador local para atualizacao.");
    }

    writeLocalIndicators(nextIndicators);
    return updated;
  }

  const runSave = async (includePipelineStage: boolean) => {
    const dbPayload = includePipelineStage
      ? { ...payload, pipeline_stage: payload.status }
      : payload;

    const query = id
      ? supabase.from("indicadores").update(dbPayload).eq("id", id).select().single()
      : supabase.from("indicadores").insert(dbPayload).select().single();

    return query;
  };

  try {
    const { data, error } = await runSave(false);
    if (!error) {
      return data as Indicator;
    }

    const message = (error.message || "").toLowerCase();
    const details = (error.details || "").toLowerCase();
    const shouldRetryWithPipelineStage =
      message.includes("pipeline_stage") || details.includes("pipeline_stage");

    if (!shouldRetryWithPipelineStage) {
      throw error;
    }

    const { data: retryData, error: retryError } = await runSave(true);
    if (retryError) throw retryError;
    return retryData as Indicator;
  } catch (error) {
    if (!isSchemaCacheError(error)) throw error;

    const currentIndicators = readLocalIndicators();

    if (id) {
      const nextIndicators = currentIndicators.map((indicator) =>
        indicator.id === id ? { ...indicator, ...payload, updated_at: new Date().toISOString() } : indicator,
      );
      const updated = nextIndicators.find((indicator) => indicator.id === id);
      if (!updated) throw error;
      writeLocalIndicators(nextIndicators);
      return updated;
    }

    const created = createLocalIndicator(payload);
    writeLocalIndicators([created, ...currentIndicators]);
    return created;
  }
}

export async function deleteIndicatorRepository(id: string): Promise<void> {
  const localIndicators = readLocalIndicators();
  const hasLocalIndicator = localIndicators.some((indicator) => indicator.id === id);

  if (hasLocalIndicator) {
    writeLocalIndicators(localIndicators.filter((indicator) => indicator.id !== id));
  }

  const supabase = getBrowserSupabase();
  try {
    const { error } = await supabase.from("indicadores").delete().eq("id", id);

    if (error) throw error;
  } catch (error) {
    if (!isSchemaCacheError(error) && !hasLocalIndicator) throw error;
  }
}

export async function moveIndicatorStageRepository(indicatorId: string, stage: string): Promise<Indicator> {
  const localIndicator = findLocalIndicator(indicatorId);

  if (localIndicator) {
    const updated = {
      ...localIndicator,
      status: stage,
      updated_at: new Date().toISOString(),
    };
    const nextIndicators = readLocalIndicators().map((indicator) =>
      indicator.id === indicatorId ? updated : indicator,
    );
    writeLocalIndicators(nextIndicators);
    return updated;
  }

  const supabase = getBrowserSupabase();
  try {
    const { data, error } = await supabase
      .from("indicadores")
      .update({ status: stage })
      .eq("id", indicatorId)
      .select()
      .single();

    if (error) throw error;
    return data as Indicator;
  } catch (error) {
    if (!isSchemaCacheError(error)) throw error;

    const fallbackIndicator = findLocalIndicator(indicatorId);
    if (!fallbackIndicator) throw error;

    const updated = {
      ...fallbackIndicator,
      status: stage,
      updated_at: new Date().toISOString(),
    };
    writeLocalIndicators(
      readLocalIndicators().map((indicator) => (indicator.id === indicatorId ? updated : indicator)),
    );
    return updated;
  }
}

export function subscribeIndicatorsRealtimeRepository(onChange: () => void): () => void {
  const supabase = getBrowserSupabase();

  const channel = supabase
    .channel("indicadores-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "indicadores" },
      () => onChange(),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "contatos_indicados" },
      () => onChange(),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "comissoes_indicadores" },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function listContactsRepository(indicatorId: string): Promise<Contact[]> {
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase
    .from("contatos_indicados")
    .select("*")
    .eq("indicador_id", indicatorId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as Contact[]) ?? [];
}

export async function saveContactRepository(input: ContactInsertInput, contactId?: string): Promise<Contact> {
  const supabase = getBrowserSupabase();
  const dbUpdateInput = {
    nome: input.nome,
    telefone: input.telefone,
    cidade: input.cidade,
    status: input.status,
    observacoes: input.observacoes,
  };

  const query = contactId
    ? supabase
        .from("contatos_indicados")
        .update(dbUpdateInput)
        .eq("id", contactId)
        .select()
        .single()
    : supabase.from("contatos_indicados").insert(input).select().single();

  const { data, error } = await query;
  if (error) throw error;
  return data as Contact;
}

export async function deleteContactRepository(contactId: string): Promise<void> {
  const supabase = getBrowserSupabase();
  const { error } = await supabase.from("contatos_indicados").delete().eq("id", contactId);

  if (error) throw error;
}

export async function listCommissionsRepository(indicatorId: string): Promise<Commission[]> {
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase
    .from("comissoes_indicadores")
    .select("*")
    .eq("indicador_id", indicatorId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as Commission[]) ?? [];
}

export async function markCommissionAsPaidRepository(commissionId: string): Promise<void> {
  const supabase = getBrowserSupabase();
  const { error } = await supabase
    .from("comissoes_indicadores")
    .update({
      status: "Pago",
      data_pagamento: new Date().toISOString().slice(0, 10),
    })
    .eq("id", commissionId);

  if (error) throw error;
}
