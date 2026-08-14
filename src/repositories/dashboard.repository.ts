import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-user";

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

  if (leadsResult.error) throw new Error("Não foi possível carregar estatísticas de leads.");
  if (clientesResult.error) throw new Error("Não foi possível carregar estatísticas de clientes.");
  if (indicadoresResult.error) throw new Error("Não foi possível carregar estatísticas de indicadores.");
  if (negociacoesResult.error) throw new Error("Não foi possível carregar estatísticas de negociações.");
  if (agendaResult.error) throw new Error("Não foi possível carregar estatísticas de agenda.");
  if (whatsappResult.error) throw new Error("Não foi possível carregar estatísticas de WhatsApp.");

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