import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import type { Database } from "@/types/database.types";

export type DashboardStats = {
  totalLeads: number;
  totalClientes: number;
  totalIndicadores: number;
  totalNegociacoes: number;
  totalComissoesPendentes: number;
  totalComissoesPagas: number;
  totalAgendamentos: number;
  totalMensagensPendentes: number;
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

export type DashboardAtividadeRecente = {
  id: string;
  tipo: string;
  descricao: string;
  data: string;
  link?: string;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const [
    leadsResult,
    clientesResult,
    indicadoresResult,
    negociacoesResult,
    comissoesResult,
    agendaResult,
    whatsappResult,
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("usuario_id", user.id),
    supabase.from("clientes").select("*", { count: "exact", head: true }).eq("usuario_id", user.id),
    supabase.from("indicadores").select("*", { count: "exact", head: true }).eq("usuario_id", user.id),
    supabase.from("negociacoes").select("*", { count: "exact", head: true }).eq("usuario_id", user.id),
    supabase
      .from("comissoes_indicadores")
      .select("valor, status")
      .eq("usuario_id", user.id)
      .then(({ data }) => {
        const totalPendente = (data ?? [])
          .filter((c) => c.status === "Pendente")
          .reduce((sum, c) => sum + Number(c.valor), 0);
        const totalPago = (data ?? [])
          .filter((c) => c.status === "Pago")
          .reduce((sum, c) => sum + Number(c.valor), 0);
        return Promise.resolve({ totalPendente, totalPago });
      }),
    supabase.from("agenda_eventos").select("*", { count: "exact", head: true }).eq("usuario_id", user.id),
    supabase
      .from("whatsapp_mensagens")
      .select("*", { count: "exact", head: true })
      .eq("status", "pendente")
      .eq("usuario_id", user.id),
  ]);

  if (leadsResult.error) throw new Error(`Não foi possível carregar estatísticas de leads: ${leadsResult.error.message}`);
  if (clientesResult.error) throw new Error(`Não foi possível carregar estatísticas de clientes: ${clientesResult.error.message}`);
  if (indicadoresResult.error) throw new Error(`Não foi possível carregar estatísticas de indicadores: ${indicadoresResult.error.message}`);
  if (negociacoesResult.error) throw new Error(`Não foi possível carregar estatísticas de negociações: ${negociacoesResult.error.message}`);
  if (agendaResult.error) throw new Error(`Não foi possível carregar estatísticas de agenda: ${agendaResult.error.message}`);
  if (whatsappResult.error) throw new Error(`Não foi possível carregar estatísticas de WhatsApp: ${whatsappResult.error.message}`);

  const comissoes = await comissoesResult;

  return {
    totalLeads: leadsResult.count ?? 0,
    totalClientes: clientesResult.count ?? 0,
    totalIndicadores: indicadoresResult.count ?? 0,
    totalNegociacoes: negociacoesResult.count ?? 0,
    totalComissoesPendentes: Math.round(comissoes.totalPendente * 100) / 100,
    totalComissoesPagas: Math.round(comissoes.totalPago * 100) / 100,
    totalAgendamentos: agendaResult.count ?? 0,
    totalMensagensPendentes: whatsappResult.count ?? 0,
  };
}

export async function getAtividadesRecentes(limite = 10): Promise<DashboardAtividadeRecente[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const atividades: DashboardAtividadeRecente[] = [];

  const [leadsRes, clientesRes, negociacoesRes, agendaRes] = await Promise.all([
    supabase
      .from("leads")
      .select("id, nome, created_at")
      .eq("usuario_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limite),
    supabase
      .from("clientes")
      .select("id, nome, created_at")
      .eq("usuario_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limite),
    supabase
      .from("negociacoes")
      .select("id, titulo, created_at")
      .eq("usuario_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limite),
    supabase
      .from("agenda_eventos")
      .select("id, titulo, data_inicio, created_at")
      .eq("usuario_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limite),
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

export async function getModuleReport(module: string): Promise<ModuleReportItem> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  switch (module) {
    case "leads": {
      const { data, error } = await supabase.from("leads").select("*").eq("usuario_id", user.id);
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
      const { data, error } = await supabase.from("clientes").select("*").eq("usuario_id", user.id);
      if (error) throw new Error(`Não foi possível carregar clientes: ${error.message}`);
      const items = (data ?? []) as Database["public"]["Tables"]["clientes"]["Row"][];
      const statusCounts = items.reduce<Record<string, number>>((acc, item) => {
        const status = item.status ?? "Sem status";
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      }, {});
      return {
        key: "clientes",
        label: "Clientes",
        total: items.length,
        details: statusCounts,
      };
    }
    case "indicadores": {
      const { data, error } = await supabase.from("indicadores").select("*").eq("usuario_id", user.id);
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
      const { data, error } = await supabase.from("negociacoes").select("*").eq("usuario_id", user.id);
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
      const { data, error } = await supabase
        .from("comissoes_indicadores")
        .select("valor, status")
        .eq("usuario_id", user.id);
      if (error) throw new Error(`Não foi possível carregar comissões: ${error.message}`);
      const items = (data ?? []) as { valor: string | number; status: string }[];
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
      const { count, error } = await supabase
        .from("agenda_eventos")
        .select("*", { count: "exact", head: true })
        .eq("usuario_id", user.id);
      if (error) throw new Error(`Não foi possível carregar agenda: ${error.message}`);
      return {
        key: "agenda",
        label: "Agenda",
        total: count ?? 0,
      };
    }
    case "whatsapp": {
      const { count, error } = await supabase
        .from("whatsapp_mensagens")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente")
        .eq("usuario_id", user.id);
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