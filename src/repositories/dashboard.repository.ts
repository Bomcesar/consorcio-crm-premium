import { getBrowserSupabase } from "@/repositories/supabase-browser";

const LOCAL_CLIENTES_KEY = "crm-clientes-local";
const LOCAL_INDICADORES_KEY = "crm-indicadores-local";
const LOCAL_AGENDAS_KEY = "crm-agendas-local";

export type DashboardSource = {
  leads: Array<{ id: string; nome: string; status: string; created_at: string | null }>;
  clientes: Array<{ id: string; nome: string; status: string; created_at: string | null }>;
  indicadores: Array<{ id: string; nome: string; status: string; created_at: string | null }>;
  comissoes: Array<{ id: string; valor: number; status: string; created_at: string | null }>;
  agendas: Array<{
    id: string;
    titulo: string;
    tipo: string;
    data_hora: string;
    indicadores: Array<{ nome: string | null }> | null;
    clientes: Array<{ nome: string | null }> | null;
  }>;
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

function normalizeFallbackSource(): DashboardSource {
  const clientes = readLocalJson<{ id: string; nome: string; status: string; created_at?: string | null }>(LOCAL_CLIENTES_KEY);
  const indicadores = readLocalJson<{ id: string; nome: string; status: string; ativo?: boolean; created_at?: string | null }>(LOCAL_INDICADORES_KEY);
  const agendas = readLocalJson<{
    id: string;
    titulo: string;
    tipo: string;
    data_hora: string;
    indicador_nome?: string | null;
    cliente_nome?: string | null;
  }>(LOCAL_AGENDAS_KEY);

  return {
    leads: [],
    clientes: clientes.map((cliente) => ({
      id: cliente.id,
      nome: cliente.nome,
      status: cliente.status,
      created_at: cliente.created_at ?? null,
    })),
    indicadores: indicadores.map((indicador) => ({
      id: indicador.id,
      nome: indicador.nome,
      status: indicador.status,
      created_at: indicador.created_at ?? null,
    })),
    comissoes: [],
    agendas: agendas.map((agenda) => ({
      id: agenda.id,
      titulo: agenda.titulo,
      tipo: agenda.tipo,
      data_hora: agenda.data_hora,
      indicadores: agenda.indicador_nome ? [{ nome: agenda.indicador_nome }] : null,
      clientes: agenda.cliente_nome ? [{ nome: agenda.cliente_nome }] : null,
    })),
  };
}

export async function getDashboardSourceRepository(): Promise<DashboardSource> {
  const supabase = getBrowserSupabase();
  try {
    const [
      { data: leadsData, error: leadsError },
      { data: clientesData, error: clientesError },
      { data: indicadoresData, error: indicadoresError },
      { data: comissoesData, error: comissoesError },
      { data: agendasData, error: agendasError },
    ] = await Promise.all([
      supabase.from("leads").select("id, nome, status, created_at").order("created_at", { ascending: false }),
      supabase.from("clientes").select("id, nome, status, created_at").order("created_at", { ascending: false }),
      supabase.from("indicadores").select("id, nome, status, created_at").order("created_at", { ascending: false }),
      supabase.from("comissoes_indicadores").select("id, valor, status, created_at").order("created_at", { ascending: false }),
      supabase.from("agendas").select("id, titulo, tipo, data_hora, indicadores(nome), clientes(nome)").order("data_hora", { ascending: true }),
    ]);

    if (leadsError) throw leadsError;
    if (clientesError) throw clientesError;
    if (indicadoresError) throw indicadoresError;
    if (comissoesError) throw comissoesError;
    if (agendasError) throw agendasError;

    return {
      leads: (leadsData as Array<{ id: string; nome: string; status: string; created_at: string | null }>) ?? [],
      clientes: (clientesData as Array<{ id: string; nome: string; status: string; created_at: string | null }>) ?? [],
      indicadores: (indicadoresData as Array<{ id: string; nome: string; status: string; created_at: string | null }>) ?? [],
      comissoes: (comissoesData as Array<{ id: string; valor: number; status: string; created_at: string | null }>) ?? [],
      agendas:
        (agendasData as Array<{
          id: string;
          titulo: string;
          tipo: string;
          data_hora: string;
          indicadores: Array<{ nome: string | null }> | null;
          clientes: Array<{ nome: string | null }> | null;
        }>) ?? [],
    };
  } catch (error) {
    if (!isSchemaCacheError(error)) throw error;
    return normalizeFallbackSource();
  }
}
