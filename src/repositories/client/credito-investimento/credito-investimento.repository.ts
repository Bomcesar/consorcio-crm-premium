import { createClient } from '@/lib/supabase/client';
import { getAuthenticatedUser, isAdminOrGestor } from '@/lib/auth-user';
import type { CreditoInvestimento, CreditoEtapa, CreditoHistorico, CreditoTarefa, CreditoReuniao, CreditosSimulacao, CreditoMensagemRegistrada, PlaybookMensagem, PlaybookAtendimento } from '@/lib/credito-investimento/types';

function logError(context: string, error: unknown) {
  console.error(`[CreditoInvestimento] ${context}:`, error);
}

export async function getCreditos(): Promise<CreditoInvestimento[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = supabase.from('creditos_investimento').select('*').order('atualizado_em', { ascending: false });
  if (!isAdminOrGestor(user)) query = query.eq('usuario_id', user.id);
  const { data, error } = await query;
  if (error) { logError('getCreditos', error); throw new Error('Nao foi possível carregar os creditos.'); }
  return (data as CreditoInvestimento[]) ?? [];
}

export async function getCreditosPorEtapa(): Promise<Record<string, CreditoInvestimento[]>> {
  const creditos = await getCreditos();
  const agrupado: Record<string, CreditoInvestimento[]> = {};
  for (const c of creditos) {
    if (!agrupado[c.etapa]) agrupado[c.etapa] = [];
    agrupado[c.etapa].push(c);
  }
  return agrupado;
}

export async function criarCredito(payload: Omit<CreditoInvestimento, 'id' | 'criado_em' | 'atualizado_em'>): Promise<CreditoInvestimento> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from('creditos_investimento').insert({ ...payload, usuario_id: user.id }).select().single();
  if (error || !data) { logError('criarCredito', error); throw new Error('Nao foi possível criar o credito.'); }
  return data as CreditoInvestimento;
}

export async function atualizarCredito(id: string, payload: Partial<CreditoInvestimento>): Promise<CreditoInvestimento> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from('creditos_investimento').update(payload).eq('id', id);
  const query = isAdminOrGestor(user) ? base : base.eq('usuario_id', user.id);
  const { data, error } = await query.select().single();
  if (error || !data) { logError('atualizarCredito', error); throw new Error('Nao foi possível atualizar o credito.'); }
  return data as CreditoInvestimento;
}

export async function moverCreditoEtapa(id: string, novaEtapa: CreditoEtapa, observacao?: string): Promise<CreditoInvestimento> {
  return atualizarCredito(id, { etapa: novaEtapa } as Partial<CreditoInvestimento>);
}

export async function getCreditosHistorico(creditoId: string): Promise<CreditoHistorico[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('credito_historico').select('*').eq('credito_id', creditoId).order('criado_em', { ascending: false });
  if (error) { logError('getCreditosHistorico', error); throw new Error('Nao foi possível carregar o historico.'); }
  return (data as CreditoHistorico[]) ?? [];
}

export async function getCreditosTarefas(creditoId: string): Promise<CreditoTarefa[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('credito_tarefas').select('*').eq('credito_id', creditoId).order('data_prevista', { ascending: true });
  if (error) { logError('getCreditosTarefas', error); throw new Error('Nao foi possível carregar as tarefas.'); }
  return (data as CreditoTarefa[]) ?? [];
}

export async function criarTarefa(payload: Omit<CreditoTarefa, 'id' | 'criado_em' | 'atualizado_em'>): Promise<CreditoTarefa> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from('credito_tarefas').insert({ ...payload, usuario_id: user.id }).select().single();
  if (error || !data) { logError('criarTarefa', error); throw new Error('Nao foi possível criar a tarefa.'); }
  return data as CreditoTarefa;
}

export async function concluirTarefa(id: string): Promise<CreditoTarefa> {
  const supabase = createClient();
  const { data, error } = await supabase.from('credito_tarefas').update({ concluida: true, concluida_em: new Date().toISOString() }).eq('id', id).select().single();
  if (error || !data) { logError('concluirTarefa', error); throw new Error('Nao foi possível concluir a tarefa.'); }
  return data as CreditoTarefa;
}

export async function criarReuniao(payload: Omit<CreditoReuniao, 'id' | 'criado_em' | 'atualizado_em'>): Promise<CreditoReuniao> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from('credito_reunioes').insert({ ...payload, usuario_id: user.id }).select().single();
  if (error || !data) { logError('criarReuniao', error); throw new Error('Nao foi possível agendar a reuniao.'); }
  return data as CreditoReuniao;
}

export async function getCreditosReunioes(creditoId: string): Promise<CreditoReuniao[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('credito_reunioes').select('*').eq('credito_id', creditoId).order('data_hora', { ascending: false });
  if (error) { logError('getCreditosReunioes', error); throw new Error('Nao foi possível carregar as reunioes.'); }
  return (data as CreditoReuniao[]) ?? [];
}
export async function registrarSimulacao(payload: Omit<CreditosSimulacao, 'id' | 'criado_em'>): Promise<CreditosSimulacao> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from('creditos_simulacoes').insert({ ...payload, usuario_id: user.id }).select().single();
  if (error || !data) { logError('registrarSimulacao', error); throw new Error('Nao foi possível registrar a simulacao.'); }
  return data as CreditosSimulacao;
}

export async function registrarMensagemRegistrada(payload: Omit<CreditoMensagemRegistrada, 'id' | 'copiado_em'>): Promise<CreditoMensagemRegistrada> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from('credito_mensagens_registradas').insert({ ...payload, usuario_id: user.id }).select().single();
  if (error || !data) { logError('registrarMensagemRegistrada', error); throw new Error('Nao foi possível registrar a mensagem.'); }
  return data as CreditoMensagemRegistrada;
}

export async function getCreditosMensagens(creditoId: string): Promise<CreditoMensagemRegistrada[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('credito_mensagens_registradas').select('*').eq('credito_id', creditoId).order('copiado_em', { ascending: false });
  if (error) { logError('getCreditosMensagens', error); throw new Error('Nao foi possível carregar as mensagens.'); }
  return (data as CreditoMensagemRegistrada[]) ?? [];
}

export async function getPlaybookMensagens(etapa?: string, tipo?: string): Promise<PlaybookMensagem[]> {
  const supabase = createClient();
  let query = supabase.from('playbook_mensagens').select('*').eq('ativo', true).order('ordem', { ascending: true });
  if (etapa) query = query.eq('etapa', etapa);
  if (tipo) query = query.eq('tipo', tipo);
  const { data, error } = await query;
  if (error) { logError('getPlaybookMensagens', error); throw new Error('Nao foi possível carregar as mensagens do playbook.'); }
  return (data as PlaybookMensagem[]) ?? [];
}

export async function getPlaybooks(): Promise<PlaybookAtendimento[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('playbooks_atendimento').select('*').eq('ativo', true);
  if (error) { logError('getPlaybooks', error); throw new Error('Nao foi possível carregar os playbooks.'); }
  return (data as PlaybookAtendimento[]) ?? [];
}
