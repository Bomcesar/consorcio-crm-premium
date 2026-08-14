import { createClient } from "@/lib/supabase/client";
import type { EventoAgenda } from "@/repositories/agenda.repository";
import type { Database } from "@/types/database.types";

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

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient();

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
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("indicadores").select("*", { count: "exact", head: true }),
    supabase.from("clientes").select("*", { count: "exact", head: true }),
    supabase.from("agenda_eventos").select("*", { count: "exact", head: true }),
    supabase.from("negociacoes").select("*", { count: "exact", head: true }),
    supabase.from("negociacoes").select("*", { count: "exact", head: true }).eq("etapa", "Venda"),
    supabase.from("comissoes_indicadores").select("*", { count: "exact", head: true }),
    supabase.from("cobrancas").select("*", { count: "exact", head: true }),
    supabase.from("cobrancas").select("*", { count: "exact", head: true }).eq("status", "Pendente"),
    supabase.from("pos_venda").select("*", { count: "exact", head: true }),
  ]);

  if (leadsResult.error) throw new Error("Não foi possível carregar estatísticas de leads.");
  if (indicadoresResult.error) throw new Error("Não foi possível carregar estatísticas de indicadores.");
  if (clientesResult.error) throw new Error("Não foi possível carregar estatísticas de clientes.");
  if (reunioesResult.error) throw new Error("Não foi possível carregar estatísticas de reuniões.");
  if (negociacoesResult.error) throw new Error("Não foi possível carregar estatísticas de negociações.");
  if (vendasResult.error) throw new Error("Não foi possível carregar estatísticas de vendas.");
  if (comissoesResult.error) throw new Error("Não foi possível carregar estatísticas de comissões.");
  if (cobrancasResult.error) throw new Error("Não foi possível carregar estatísticas de cobranças.");
  if (pendenciasResult.error) throw new Error("Não foi possível carregar estatísticas de pendências.");
  if (posVendaResult.error) throw new Error("Não foi possível carregar estatísticas de pós-venda.");

  return {
    totalLeads: leadsResult.count ?? 0,
    totalIndicadores: indicadoresResult.count ?? 0,
    totalClientes: clientesResult.count ?? 0,
    totalReunioes: reunioesResult.count ?? 0,
    totalNegociacoes: negociacoesResult.count ?? 0,
    totalVendas: vendasResult.count ?? 0,
    totalComissoes: comissoesResult.count ?? 0,
    totalCobrancas: cobrancasResult.count ?? 0,
    totalPendencias: pendenciasResult.count ?? 0,
    totalPosVenda: posVendaResult.count ?? 0,
  };
}

export async function getAtividadesRecentes(limite = 10): Promise<DashboardAtividadeRecente[]> {
  const supabase = createClient();

  const atividades: DashboardAtividadeRecente[] = [];

  const [leadsRes, clientesRes, negociacoesRes, agendaRes] = await Promise.all([
    supabase
      .from("leads")
      .select("id, nome, created_at")
      .order("created_at", { ascending: false })
      .limit(limite),
    supabase
      .from("clientes")
      .select("id, nome, created_at")
      .order("created_at", { ascending: false })
      .limit(limite),
    supabase
      .from("negociacoes")
      .select("id, titulo, created_at")
      .order("created_at", { ascending: false })
      .limit(limite),
    supabase
      .from("agenda_eventos")
      .select("id, titulo, data_inicio, created_at")
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

export async function getEventosAgenda(): Promise<EventoAgenda[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("agenda_eventos")
    .select("*")
    .order("data_inicio", { ascending: true });

  if (error) {
    throw new Error("Não foi possível carregar os eventos da agenda.");
  }

  return (data as EventoAgenda[] | null) ?? [];
}

export async function getPipelineStats(): Promise<{ name: string; count: number; color: string; width: string }[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("negociacoes")
    .select("etapa");

  if (error) throw new Error("Não foi possível carregar o pipeline.");

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

