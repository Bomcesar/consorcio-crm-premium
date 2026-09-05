import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser } from "@/lib/auth-user";

export type Proposta = Database["public"]["Tables"]["propostas"]["Row"];
export type PropostaInsert = Database["public"]["Tables"]["propostas"]["Insert"];
export type PropostaUpdate = Database["public"]["Tables"]["propostas"]["Update"];
export type PropostaEvento = Database["public"]["Tables"]["proposta_eventos"]["Row"];
export type PropostaFollowup = Database["public"]["Tables"]["proposta_followups"]["Row"];

export type PropostaTipo = "Imovel" | "Veiculo" | "Servicos" | "Outros bens moveis";
export type ValorTipo = "Cheio" | "Reduzida";

type SupabaseError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function logSupabaseError(context: string, error: SupabaseError | null) {
  console.error(`[Proposta] ${context} error:`, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
  });
}

export async function getPropostas(negociacaoId?: string): Promise<Proposta[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = supabase
    .from("propostas")
    .select("*")
    .eq("usuario_id", user.id);
  if (negociacaoId) {
    query = query.eq("negociacao_id", negociacaoId);
  }
  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) {
    logSupabaseError("getPropostas", error);
    throw new Error("Não foi possível carregar as propostas.");
  }
  return (data as Proposta[]) ?? [];
}

export async function getProposta(id: string): Promise<Proposta | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("propostas")
    .select("*")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();

  if (error) {
    logSupabaseError("getProposta", error);
    return null;
  }
  return data as Proposta;
}

export async function createProposta(payload: PropostaInsert): Promise<Proposta> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("propostas")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error) {
    logSupabaseError("createProposta", error);
    throw new Error("Não foi possível salvar a proposta.");
  }
  if (!data) throw new Error("Não foi possível salvar a proposta.");
  return data as Proposta;
}

export async function updateProposta(id: string, payload: PropostaUpdate): Promise<Proposta> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("propostas")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error) {
    logSupabaseError("updateProposta", error);
    throw new Error("Não foi possível atualizar a proposta.");
  }
  if (!data) throw new Error("Não foi possível atualizar a proposta.");
  return data as Proposta;
}

export async function deleteProposta(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { error } = await supabase
    .from("propostas")
    .delete()
    .eq("id", id)
    .eq("usuario_id", user.id);

  if (error) {
    logSupabaseError("deleteProposta", error);
    throw new Error("Não foi possível excluir a proposta.");
  }
}

export async function getPropostaEventos(propostaId: string): Promise<PropostaEvento[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("proposta_eventos")
    .select("*")
    .eq("proposta_id", propostaId)
    .order("created_at", { ascending: false });

  if (error) {
    logSupabaseError("getPropostaEventos", error);
    throw new Error("Não foi possível carregar os eventos da proposta.");
  }
  return (data as PropostaEvento[]) ?? [];
}

export async function getPropostaByToken(token: string): Promise<Proposta | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("propostas")
    .select("*")
    .eq("link_token", token)
    .single();

  if (error) {
    logSupabaseError("getPropostaByToken", error);
    return null;
  }
  return data as Proposta;
}

export async function registrarVisualizacaoProposta(
  propostaId: string,
  detalhes?: { ip?: string; userAgent?: string; origem?: string },
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("proposta_eventos").insert({
    proposta_id: propostaId,
    evento: "visualizacao",
    detalhes: detalhes?.origem ?? null,
    ip_origem: detalhes?.ip ?? null,
    user_agent: detalhes?.userAgent ?? null,
  });

  if (error) {
    logSupabaseError("registrarVisualizacaoProposta", error);
  }
}

export async function incrementarAcessoProposta(propostaId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("increment_proposta_acessos", { proposta_id: propostaId });

  if (error) {
    logSupabaseError("incrementarAcessoProposta", error);
  }
}

export async function getPropostaComEventos(propostaId: string): Promise<{ proposta: Proposta; eventos: PropostaEvento[] }> {
  const proposta = await getProposta(propostaId);
  if (!proposta) throw new Error("Proposta não encontrada.");
  const eventos = await getPropostaEventos(propostaId);
  return { proposta, eventos };
}

export function generatePropostaLink(proposta: Proposta): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
  return `${baseUrl}/proposta/${proposta.link_token}`;
}

export function generateConsorcioTemplate(dados: {
  titulo: string;
  valor: number;
  tipo: PropostaTipo;
  valorTipo?: ValorTipo;
  administradora?: string;
  numeroParcelas?: number;
  valorEntrada?: number;
  valorParcela?: number;
  taxaAdministracao?: number;
  observacoes?: string;
}): string {
  const valorTotal = dados.valor;
  const entrada = dados.valorEntrada ?? 0;
  const restante = valorTotal - entrada;
  const parcelas = dados.numeroParcelas ?? 12;
  const parcela = dados.valorParcela ?? restante / parcelas;
  const taxa = dados.taxaAdministracao ?? 0;
  const tipoLabel = dados.tipo === "Imovel" ? "Imóvel" : dados.tipo === "Veiculo" ? "Veículo" : dados.tipo === "Servicos" ? "Serviços" : "Outros bens móveis";

  return `# PROPOSTA DE CONSÓRCIO - ${tipoLabel.toUpperCase()}

**Administradora:** ${dados.administradora || "Não especificada"}
**Título da Proposta:** ${dados.titulo}

**TIPO DE BEM:** ${tipoLabel}
**VALOR DO BEM:** R$ ${valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}

**ENTRADA:** R$ ${entrada.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
**SALDO RESTANTE:** R$ ${restante.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}

**NÚMERO DE PARCELAS:** ${parcelas}
**VALOR DE CADA PARCELA:** R$ ${parcela.toFixed(2)}

**TAXA DE ADMINISTRAÇÃO:** ${taxa}%
**VALOR TOTAL A PAGAR:** R$ ${(valorTotal + (valorTotal * taxa / 100)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}

${dados.observacoes ? `**Observações:**\n${dados.observacoes}\n` : ""}

---
*Proposta gerada automaticamente pelo CRM Consórcio Premium*
*Esta proposta é válida por 7 dias a partir da data de envio.*`
    .trim();
}

export function generateCartaCreditoTemplate(dados: {
  titulo: string;
  valor: number;
  tipo: PropostaTipo;
  valorTipo?: ValorTipo;
  clienteNome?: string;
  administradora?: string;
  banco?: string;
  taxaJuros?: number;
  numeroParcelas?: number;
  valorParcela?: number;
  prazo?: number;
  observacoes?: string;
}): string {
  const parcelas = dados.numeroParcelas ?? 12;
  const parcela = dados.valorParcela ?? dados.valor / parcelas;
  const juros = dados.taxaJuros ?? 0;
  const prazo = dados.prazo ?? 0;
  const tipoLabel = dados.tipo === "Imovel" ? "Imóvel" : dados.tipo === "Veiculo" ? "Veículo" : dados.tipo === "Servicos" ? "Serviços" : "Outros bens móveis";

  return `# CARTA DE CRÉDITO CONSIGNADO - ${tipoLabel.toUpperCase()}

**Administradora:** ${dados.administradora || "Não especificada"}
**Banco:** ${dados.banco || "Não especificado"}
**Cliente:** ${dados.clienteNome || "Não especificado"}
**Título da Proposta:** ${dados.titulo}

**TIPO DE BEM:** ${tipoLabel}
**VALOR DO BEM:** R$ ${dados.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}

**TAXA DE JUROS:** ${juros}% a.a.
**NÚMERO DE PARCELAS:** ${parcelas}
**VALOR DE CADA PARCELA:** R$ ${parcela.toFixed(2)}
**PRAZO TOTAL:** ${prazo} meses

${dados.observacoes ? `**Observações:**\n${dados.observacoes}\n` : ""}

---
*Carta de crédito gerada automaticamente pelo CRM Consórcio Premium*
*Documentação válida por 7 dias a partir da data de envio.*`
    .trim();
}

export async function createPropostaFollowup(propostaId: string, payload: { tipo?: string; canal?: string; observacao?: string }): Promise<PropostaFollowup> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("proposta_followups")
    .insert({
      proposta_id: propostaId,
      usuario_id: user.id,
      tipo: payload.tipo || "nao_fechou",
      canal: payload.canal || "whatsapp",
      observacao: payload.observacao || "",
      data_contato: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    logSupabaseError("createPropostaFollowup", error);
    throw new Error("Não foi possível registrar o follow-up.");
  }
  if (!data) throw new Error("Não foi possível registrar o follow-up.");
  return data as PropostaFollowup;
}

export async function getPropostaFollowups(propostaId: string): Promise<PropostaFollowup[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("proposta_followups")
    .select("*")
    .eq("proposta_id", propostaId)
    .order("data_contato", { ascending: false });

  if (error) {
    logSupabaseError("getPropostaFollowups", error);
    throw new Error("Não foi possível carregar os follow-ups.");
  }
  return (data as PropostaFollowup[]) ?? [];
}

export async function createPropostaReduzida(propostaId: string, payload: { titulo?: string; valor_parcela_reduzida?: number; observacoes?: string }): Promise<Proposta> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();

  const original = await getProposta(propostaId);
  if (!original) throw new Error("Proposta original não encontrada.");

  const novaProposta = await createProposta({
    negociacao_id: original.negociacao_id,
    titulo: payload.titulo || `${original.titulo} - Parcela Reduzida`,
    tipo: original.tipo,
    conteudo: generateCartaCreditoTemplate({
      titulo: payload.titulo || `${original.titulo} - Parcela Reduzida`,
      valor: Number(original.conteudo.match(/VALOR DO CRÉDITO: R\$ ([\d.,]+)/)?.[1]?.replace(/\./g, "").replace(",", ".")) || 0,
      tipo: original.tipo as "Imovel" | "Veiculo" | "Servicos" | "Outros bens moveis",
      valorTipo: "Reduzida",
      administradora: original.conteudo.match(/Administradora: (.+)/)?.[1],
      banco: original.conteudo.match(/Banco: (.+)/)?.[1],
      taxaJuros: Number(original.conteudo.match(/TAXA DE JUROS: (\d+\.?\d*)%/)?.[1]),
      numeroParcelas: Number(original.conteudo.match(/NÚMERO DE PARCELAS: (\d+)/)?.[1]),
      valorParcela: payload.valor_parcela_reduzida,
      prazo: Number(original.conteudo.match(/PRAZO TOTAL: (\d+) meses/)?.[1]),
      observacoes: `${payload.observacoes || ""}\n\nProposta gerada a partir de proposta anterior (parcela reduzida).`,
    }),
    status: "rascunho",
    banner_caminho: original.banner_caminho,
    valor_parcela_cheia: original.valor_parcela_cheia,
    valor_parcela_reduzida: payload.valor_parcela_reduzida ? String(payload.valor_parcela_reduzida) : null,
  });

  await supabase
    .from("propostas")
    .update({ status: "followup_enviado", follow_up_at: new Date().toISOString() })
    .eq("id", propostaId);

  return novaProposta;
}
