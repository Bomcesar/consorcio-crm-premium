import { createClient } from "@/lib/supabase/client";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { withTimeout } from "@/lib/supabase-timeout";
import type { Database } from "@/types/database.types";
import type { EventoAgenda } from "@/repositories/agenda.repository";

export type DashboardStats = {
  totalLeads: number;
  totalIndicadores: number;
  totalClientes: number;
  totalReunioes: number;
  totalNegociacoes: number;
  totalVendas: number;
  totalComissoes: number;
  totalCobrancas: number;
  totalPendencias: number;
  totalPosVenda: number;
};

export type DashboardAtividadeRecente = {
  id: string;
  tipo: string;
  descricao: string;
  data: string;
  link?: string;
};

export type ModuleReportItem = {
  key: string;
  label: string;
  total: number;
  details?: Record<string, unknown>;
};

export type RelatorioPayload = {
  generatedAt: string;
  modules: string[];
  stats: Record<string, unknown>;
};

export async function getModuleReport(module: string): Promise<ModuleReportItem> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const isAdminOrGestor = user.perfil === "Administrador" || user.perfil === "Gestor";

  switch (module) {
    case "leads": {
      const query = isAdminOrGestor
        ? supabase.from("leads").select("*")
        : supabase.from("leads").select("*").eq("usuario_id", user.id);
      const { data, error } = await query;
      if (error) throw new Error(`Não foi possível carregar leads: ${error.message}`);
      const items = (data ?? []) as Database["public"]["Tables"]["leads"]["Row"][];
      const statusCounts = items.reduce<Record<string, number>>((acc, item) => {
        const status = item.status ?? "Sem status";
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      }, {});
      return {
        key: "leads",
        label: "Leads",
        total: items.length,
        details: statusCounts,
      };
    }
    case "clientes": {
      const query = isAdminOrGestor
        ? supabase.from("clientes").select("*")
        : supabase.from("clientes").select("*").eq("usuario_id", user.id);
      const { data, error } = await query;
      if (error) throw new Error(`Não foi possível carregar clientes: ${error.message}`);
      const items = (data ?? []) as Database["public"]["Tables"]["clientes"]["Row"][];
      const clientesReais = items.filter((item) => item.origem !== "Contatos" && !item.destino_conversao);
      const statusCounts = clientesReais.reduce<Record<string, number>>((acc, item) => {
        const status = item.status ?? "Sem status";
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      }, {});
      return {
        key: "clientes",
        label: "Clientes",
        total: clientesReais.length,
        details: statusCounts,
      };
    }
    case "indicadores": {
      const query = isAdminOrGestor
        ? supabase.from("indicadores").select("*")
        : supabase.from("indicadores").select("*").eq("usuario_id", user.id);
      const { data, error } = await query;
      if (error) throw new Error(`Não foi possível carregar indicadores: ${error.message}`);
      const items = (data ?? []) as Database["public"]["Tables"]["indicadores"]["Row"][];
      const statusCounts = items.reduce<Record<string, number>>((acc, item) => {
        const status = item.status ?? "Sem status";
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      }, {});
      return {
        key: "indicadores",
        label: "Indicadores",
        total: items.length,
        details: statusCounts,
      };
    }
    case "negociacoes": {
      const query = isAdminOrGestor
        ? supabase.from("negociacoes").select("*")
        : supabase.from("negociacoes").select("*").eq("usuario_id", user.id);
      const { data, error } = await query;
      if (error) throw new Error(`Não foi possível carregar negociações: ${error.message}`);
      const items = (data ?? []) as Database["public"]["Tables"]["negociacoes"]["Row"][];
      const statusCounts = items.reduce<Record<string, number>>((acc, item) => {
        const status = item.etapa ?? "Sem etapa";
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      }, {});
      return {
        key: "negociacoes",
        label: "Negociações",
        total: items.length,
        details: statusCounts,
      };
    }
    case "comissoes": {
      const query = isAdminOrGestor
        ? supabase.from("comissoes_indicadores").select("valor, status")
        : supabase.from("comissoes_indicadores").select("valor, status").eq("usuario_id", user.id);
      const { data, error } = await query;
      if (error) throw new Error(`Não foi possível carregar comissões: ${error.message}`);
      const items = (data ?? []) as Database["public"]["Tables"]["comissoes_indicadores"]["Row"][];
      const totalPendente = items
        .filter((c) => c.status === "Pendente")
        .reduce((sum, c) => sum + Number(c.valor), 0);
      const totalPago = items
        .filter((c) => c.status === "Paga")
        .reduce((sum, c) => sum + Number(c.valor), 0);
      return {
        key: "comissoes",
        label: "Comissões",
        total: items.length,
        details: {
          totalPendente: Math.round(totalPendente * 100) / 100,
          totalPago: Math.round(totalPago * 100) / 100,
        },
      };
    }
    case "agenda": {
      const query = isAdminOrGestor
        ? supabase.from("agenda_eventos").select("*", { count: "exact", head: true })
        : supabase.from("agenda_eventos").select("*", { count: "exact", head: true }).eq("usuario_id", user.id);
      const { count, error } = await query;
      if (error) throw new Error(`Não foi possível carregar agenda: ${error.message}`);
      return {
        key: "agenda",
        label: "Agenda",
        total: count ?? 0,
      };
    }
    case "whatsapp": {
      const query = isAdminOrGestor
        ? supabase.from("whatsapp_mensagens").select("*", { count: "exact", head: true }).eq("status", "pendente")
        : supabase.from("whatsapp_mensagens").select("*", { count: "exact", head: true }).eq("status", "pendente").eq("usuario_id", user.id);
      const { count, error } = await query;
      if (error) throw new Error(`Não foi possível carregar WhatsApp: ${error.message}`);
      return {
        key: "whatsapp",
        label: "WhatsApp",
        total: count ?? 0,
      };
    }
    default:
      return {
        key: module,
        label: module,
        total: 0,
      };
  }
}

export async function getRelatorioPayload(modules: string[]): Promise<RelatorioPayload> {
  const reports = await Promise.all(modules.map((module) => getModuleReport(module)));
  const stats = reports.reduce<Record<string, unknown>>((acc, report) => {
    acc[report.key] = {
      label: report.label,
      total: report.total,
      details: report.details,
    };
    return acc;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    modules,
    stats,
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const isAdminOrGestor = user.perfil === "Administrador" || user.perfil === "Gestor";

  const leadsQuery = isAdminOrGestor
    ? supabase.from("leads").select("*", { count: "exact", head: true })
    : supabase.from("leads").select("*", { count: "exact", head: true }).eq("usuario_id", user.id);

  const indicadoresQuery = isAdminOrGestor
    ? supabase.from("indicadores").select("*", { count: "exact", head: true })
    : supabase.from("indicadores").select("*", { count: "exact", head: true }).eq("usuario_id", user.id);

  const clientesQuery = isAdminOrGestor
    ? supabase.from("clientes").select("*", { count: "exact", head: true })
    : supabase.from("clientes").select("*", { count: "exact", head: true }).eq("usuario_id", user.id);

  const reunioesQuery = isAdminOrGestor
    ? supabase.from("agenda_eventos").select("*", { count: "exact", head: true })
    : supabase.from("agenda_eventos").select("*", { count: "exact", head: true }).eq("usuario_id", user.id);

  const negociacoesQuery = isAdminOrGestor
    ? supabase.from("negociacoes").select("*", { count: "exact", head: true })
    : supabase.from("negociacoes").select("*", { count: "exact", head: true }).eq("usuario_id", user.id);

  const vendasQuery = isAdminOrGestor
    ? supabase.from("negociacoes").select("*", { count: "exact", head: true }).eq("etapa", "Venda")
    : supabase.from("negociacoes").select("*", { count: "exact", head: true }).eq("usuario_id", user.id).eq("etapa", "Venda");

  const comissoesQuery = isAdminOrGestor
    ? supabase.from("comissoes_indicadores").select("*", { count: "exact", head: true })
    : supabase.from("comissoes_indicadores").select("*", { count: "exact", head: true }).eq("usuario_id", user.id);

  const cobrancasQuery = isAdminOrGestor
    ? supabase.from("cobrancas").select("*", { count: "exact", head: true })
    : supabase.from("cobrancas").select("*", { count: "exact", head: true }).eq("usuario_id", user.id);

  const pendenciasQuery = isAdminOrGestor
    ? supabase.from("cobrancas").select("*", { count: "exact", head: true }).eq("status", "Pendente")
    : supabase.from("cobrancas").select("*", { count: "exact", head: true }).eq("usuario_id", user.id).eq("status", "Pendente");

  const posVendaQuery = isAdminOrGestor
    ? supabase.from("pos_venda").select("*", { count: "exact", head: true })
    : supabase.from("pos_venda").select("*", { count: "exact", head: true }).eq("usuario_id", user.id);

  const [
    leadsResult,
    indicadoresResult,
    clientesResult,
    reunioesResult,
    negociacoesResult,
    vendasResult,
    comissoesResult,
    cobrancasResult,
    pendenciasResult,
    posVendaResult,
  ] = await Promise.all([
    withTimeout(leadsQuery, 10000, { count: 0, error: null, data: null }),
    withTimeout(indicadoresQuery, 10000, { count: 0, error: null, data: null }),
    withTimeout(clientesQuery, 10000, { count: 0, error: null, data: null }),
    withTimeout(reunioesQuery, 10000, { count: 0, error: null, data: null }),
    withTimeout(negociacoesQuery, 10000, { count: 0, error: null, data: null }),
    withTimeout(vendasQuery, 10000, { count: 0, error: null, data: null }),
    withTimeout(comissoesQuery, 10000, { count: 0, error: null, data: null }),
    withTimeout(cobrancasQuery, 10000, { count: 0, error: null, data: null }),
    withTimeout(pendenciasQuery, 10000, { count: 0, error: null, data: null }),
    withTimeout(posVendaQuery, 10000, { count: 0, error: null, data: null }),
  ]);

  const safeCount = (result: { count: number | null; error?: { message: string } | null }) =>
    result.error ? 0 : (result.count ?? 0);

  return {
    totalLeads: safeCount(leadsResult),
    totalIndicadores: safeCount(indicadoresResult),
    totalClientes: safeCount(clientesResult),
    totalReunioes: safeCount(reunioesResult),
    totalNegociacoes: safeCount(negociacoesResult),
    totalVendas: safeCount(vendasResult),
    totalComissoes: safeCount(comissoesResult),
    totalCobrancas: safeCount(cobrancasResult),
    totalPendencias: safeCount(pendenciasResult),
    totalPosVenda: safeCount(posVendaResult),
  };
}

export async function getAtividadesRecentes(limite = 10): Promise<DashboardAtividadeRecente[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const isAdminOrGestor = user.perfil === "Administrador" || user.perfil === "Gestor";

  const atividades: DashboardAtividadeRecente[] = [];

  const [leadsRes, clientesRes, negociacoesRes, agendaRes] = await Promise.all([
    isAdminOrGestor
      ? supabase.from("leads").select("id, nome, created_at").order("created_at", { ascending: false }).limit(limite)
      : supabase.from("leads").select("id, nome, created_at").eq("usuario_id", user.id).order("created_at", { ascending: false }).limit(limite),
    isAdminOrGestor
      ? supabase.from("clientes").select("id, nome, created_at").order("created_at", { ascending: false }).limit(limite)
      : supabase.from("clientes").select("id, nome, created_at").eq("usuario_id", user.id).order("created_at", { ascending: false }).limit(limite),
    isAdminOrGestor
      ? supabase.from("negociacoes").select("id, titulo, created_at").order("created_at", { ascending: false }).limit(limite)
      : supabase.from("negociacoes").select("id, titulo, created_at").eq("usuario_id", user.id).order("created_at", { ascending: false }).limit(limite),
    isAdminOrGestor
      ? supabase.from("agenda_eventos").select("id, titulo, data_inicio, created_at").order("created_at", { ascending: false }).limit(limite)
      : supabase.from("agenda_eventos").select("id, titulo, data_inicio, created_at").eq("usuario_id", user.id).order("created_at", { ascending: false }).limit(limite),
  ]);

  if (leadsRes.data) {
    atividades.push(
      ...leadsRes.data.map((lead) => ({
        id: `lead-${lead.id}`,
        tipo: "lead" as const,
        descricao: `Novo lead cadastrado: ${lead.nome}`,
        data: lead.created_at,
        link: "/leads",
      }))
    );
  }

  if (clientesRes.data) {
    atividades.push(
      ...clientesRes.data.map((cliente) => ({
        id: `cliente-${cliente.id}`,
        tipo: "cliente" as const,
        descricao: `Novo cliente cadastrado: ${cliente.nome}`,
        data: cliente.created_at,
        link: "/clientes",
      }))
    );
  }

  if (negociacoesRes.data) {
    atividades.push(
      ...negociacoesRes.data.map((neg) => ({
        id: `negociacao-${neg.id}`,
        tipo: "negociacao" as const,
        descricao: `Nova negociação: ${neg.titulo}`,
        data: neg.created_at,
        link: "/negociacoes",
      }))
    );
  }

  if (agendaRes.data) {
    atividades.push(
      ...agendaRes.data.map((evento) => ({
        id: `agenda-${evento.id}`,
        tipo: "agenda" as const,
        descricao: `Agendamento: ${evento.titulo}`,
        data: evento.created_at,
        link: "/agenda",
      }))
    );
  }

  return atividades.sort((a, b) => (a.data > b.data ? -1 : a.data < b.data ? 1 : 0)).slice(0, limite);
}

export async function getEventosAgenda(): Promise<EventoAgenda[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();

  const { data, error } = await supabase
    .from("agenda_eventos")
    .select("*")
    .eq("usuario_id", user.id)
    .order("data_inicio", { ascending: true });

  if (error) {
    return [];
  }

  return (data as EventoAgenda[] | null) ?? [];
}

export async function getPipelineStats(): Promise<{ name: string; count: number; color: string; width: string }[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();

  const { data, error } = await supabase
    .from("negociacoes")
    .select("etapa")
    .eq("usuario_id", user.id);

  if (error) return [];

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as Database["public"]["Tables"]["negociacoes"]["Row"][]) {
    counts[row.etapa] = (counts[row.etapa] || 0) + 1;
  }

  const novoCount = (counts["Novo"] || 0) + (counts["Contato"] || 0);
  const qualificadosCount = (counts["Reunião"] || 0) + (counts["Negociação"] || 0);
  const propostaCount = counts["Proposta"] || 0;
  const fechamentoCount = (counts["Fechamento"] || 0) + (counts["Venda"] || 0);

  const maxCount = Math.max(novoCount, qualificadosCount, propostaCount, fechamentoCount, 1);

  const stages = [
    { name: "Novos Leads", count: novoCount, color: "bg-blue-500" },
    { name: "Qualificados", count: qualificadosCount, color: "bg-violet-500" },
    { name: "Proposta", count: propostaCount, color: "bg-amber-500" },
    { name: "Fechamento", count: fechamentoCount, color: "bg-emerald-500" },
  ];

  return stages.map((stage) => ({
    ...stage,
    width: `${Math.round((stage.count / maxCount) * 100)}%`,
  }));
}
