import { getErrorMessage } from "@/lib/errors";
import { appLog } from "@/lib/logger";
import { getDashboardSourceRepository } from "@/repositories/dashboard.repository";
import type { DashboardActivity, DashboardData, DashboardScheduleItem, DashboardStat, PipelineStage } from "@/types/crm";

function getMonthRange(date: Date) {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthCount(items: Array<{ created_at: string | null }>, offsetMonths: number) {
  const base = new Date();
  base.setUTCMonth(base.getUTCMonth() + offsetMonths);
  const target = getMonthRange(base);

  return items.filter((item) => {
    const d = parseDate(item.created_at);
    if (!d) return false;
    const r = getMonthRange(d);
    return r.year === target.year && r.month === target.month;
  }).length;
}

function monthSum(items: Array<{ created_at: string | null; valor: number }>, offsetMonths: number) {
  const base = new Date();
  base.setUTCMonth(base.getUTCMonth() + offsetMonths);
  const target = getMonthRange(base);

  return items
    .filter((item) => {
      const d = parseDate(item.created_at);
      if (!d) return false;
      const r = getMonthRange(d);
      return r.year === target.year && r.month === target.month;
    })
    .reduce((sum, item) => sum + Number(item.valor || 0), 0);
}

function getTrend(current: number, previous: number): { change: string; trend: "up" | "down" } {
  if (previous <= 0) {
    if (current <= 0) return { change: "0%", trend: "up" };
    return { change: "+100%", trend: "up" };
  }

  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(Math.abs(pct));
  return {
    change: `${pct >= 0 ? "+" : "-"}${rounded}%`,
    trend: pct >= 0 ? "up" : "down",
  };
}

function relativeTime(value: string | null): string {
  const date = parseDate(value);
  if (!date) return "Agora";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `Ha ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Ha ${hours} h`;

  const days = Math.floor(hours / 24);
  return `Ha ${days} d`;
}

function formatHour(value: string): string {
  const date = parseDate(value);
  if (!date) return "--:--";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function isSameLocalDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export async function getDashboardDataService(): Promise<DashboardData> {
  try {
    const source = await getDashboardSourceRepository();

    const leadsThisMonth = monthCount(source.leads, 0);
    const leadsPrevMonth = monthCount(source.leads, -1);
    const leadsTrend = getTrend(leadsThisMonth, leadsPrevMonth);

    const clientesThisMonth = monthCount(source.clientes, 0);
    const clientesPrevMonth = monthCount(source.clientes, -1);
    const clientesTrend = getTrend(clientesThisMonth, clientesPrevMonth);

    const negociacoesAtivas = source.indicadores.filter((item) => {
      const s = item.status.toLowerCase();
      return s.includes("contato") || s.includes("anal") || s.includes("qual") || s.includes("negoc");
    }).length;
    const indicadoresThisMonth = monthCount(source.indicadores, 0);
    const indicadoresPrevMonth = monthCount(source.indicadores, -1);
    const indicadoresTrend = getTrend(indicadoresThisMonth, indicadoresPrevMonth);

    const volumeTotal = source.comissoes.reduce((sum, item) => sum + Number(item.valor || 0), 0);
    const volumeThisMonth = monthSum(source.comissoes, 0);
    const volumePrevMonth = monthSum(source.comissoes, -1);
    const volumeTrend = getTrend(volumeThisMonth, volumePrevMonth);

    const stats: DashboardStat[] = [
      {
        title: "Leads Ativos",
        value: source.leads.length,
        change: leadsTrend.change,
        trend: leadsTrend.trend,
        description: "vs. mes anterior",
      },
      {
        title: "Clientes",
        value: source.clientes.length,
        change: clientesTrend.change,
        trend: clientesTrend.trend,
        description: "base total",
      },
      {
        title: "Negociacoes",
        value: negociacoesAtivas,
        change: indicadoresTrend.change,
        trend: indicadoresTrend.trend,
        description: "em andamento",
      },
      {
        title: "Volume (R$)",
        value: volumeTotal,
        change: volumeTrend.change,
        trend: volumeTrend.trend,
        description: "carteira ativa",
        isCurrency: true,
      },
    ];

    const activityEntries = [
      ...source.leads.slice(0, 4).map((item) => ({
        id: `lead-${item.id}`,
        client: item.nome,
        action: "Lead cadastrado",
        type: "Lead",
        value: item.status,
        created_at: item.created_at,
      })),
      ...source.clientes.slice(0, 4).map((item) => ({
        id: `cliente-${item.id}`,
        client: item.nome,
        action: "Cliente atualizado",
        type: "Cliente",
        value: item.status,
        created_at: item.created_at,
      })),
      ...source.indicadores.slice(0, 4).map((item) => ({
        id: `indicador-${item.id}`,
        client: item.nome,
        action: "Indicador movimentado",
        type: "Indicador",
        value: item.status,
        created_at: item.created_at,
      })),
    ]
      .sort((a, b) => {
        const da = parseDate(a.created_at)?.getTime() ?? 0;
        const db = parseDate(b.created_at)?.getTime() ?? 0;
        return db - da;
      })
      .slice(0, 5);

    const activities: DashboardActivity[] = activityEntries.map((item) => ({
      id: item.id,
      client: item.client,
      action: item.action,
      type: item.type,
      value: item.value,
      time: relativeTime(item.created_at),
    }));

    const totalLeads = Math.max(1, source.leads.length);
    const novos = source.leads.filter((lead) => lead.status.toLowerCase().includes("novo")).length;
    const qualificados = source.leads.filter((lead) => {
      const s = lead.status.toLowerCase();
      return s.includes("qual") || s.includes("anal");
    }).length;
    const proposta = source.leads.filter((lead) => {
      const s = lead.status.toLowerCase();
      return s.includes("prop") || s.includes("contato");
    }).length;
    const fechamento = source.leads.filter((lead) => {
      const s = lead.status.toLowerCase();
      return s.includes("fech") || s.includes("convert") || s.includes("cliente");
    }).length;

    const pipeline: PipelineStage[] = [
      {
        name: "Novos Leads",
        count: novos,
        color: "bg-blue-500",
        width: `${Math.max(6, Math.round((novos / totalLeads) * 100))}%`,
      },
      {
        name: "Qualificados",
        count: qualificados,
        color: "bg-violet-500",
        width: `${Math.max(6, Math.round((qualificados / totalLeads) * 100))}%`,
      },
      {
        name: "Proposta",
        count: proposta,
        color: "bg-amber-500",
        width: `${Math.max(6, Math.round((proposta / totalLeads) * 100))}%`,
      },
      {
        name: "Fechamento",
        count: fechamento,
        color: "bg-emerald-500",
        width: `${Math.max(6, Math.round((fechamento / totalLeads) * 100))}%`,
      },
    ];

    const today = new Date();
    const upcomingSchedule: DashboardScheduleItem[] = source.agendas
      .filter((item) => {
        const date = parseDate(item.data_hora);
        if (!date) return false;
        return isSameLocalDate(date, today);
      })
      .slice(0, 8)
      .map((item) => {
        const indicatorName = item.indicadores?.[0]?.nome?.trim();
        const clienteName = item.clientes?.[0]?.nome?.trim();
        return {
          id: item.id,
          time: formatHour(item.data_hora),
          title: item.titulo.trim() || indicatorName || clienteName || "Compromisso",
          type: item.tipo || "Agenda",
          origin: clienteName ? "Pós-venda" : "Indicador",
          originLabel: clienteName ? "Cliente em acompanhamento" : "Indicador vinculado",
        };
      });

    return {
      stats,
      activities,
      pipeline,
      upcomingSchedule,
    };
  } catch (error) {
    appLog("error", "dashboard.data.failed", error);
    throw new Error(getErrorMessage(error, "Nao foi possivel carregar o dashboard."));
  }
}
