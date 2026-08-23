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
