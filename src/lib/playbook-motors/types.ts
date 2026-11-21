export type MotorsEtapa =
  | "novo_lead"
  | "conexao_realizada"
  | "em_qualificacao"
  | "diagnostico"
  | "educacao"
  | "simulacao"
  | "proposta_apresentada"
  | "negociacao"
  | "fechamento"
  | "pos_venda"
  | "perdido"
  | "sem_interesse";

export type MotorsMsgTipo =
  | "abertura"
  | "quebra_padrao"
  | "interesse"
  | "qualificacao"
  | "educacao_financeira"
  | "apresentacao_credito"
  | "convite_reuniao"
  | "confirmacao_reuniao"
  | "trata_objecoes"
  | "envio_proposta"
  | "fechamento"
  | "reativacao";

export type MotorsFollowUpDia = 1 | 3 | 5 | 7 | 15 | 30;

export const MOTORS_ETAPAS: MotorsEtapa[] = [
  "novo_lead",
  "conexao_realizada",
  "em_qualificacao",
  "diagnostico",
  "educacao",
  "simulacao",
  "proposta_apresentada",
  "negociacao",
  "fechamento",
  "pos_venda",
  "perdido",
  "sem_interesse",
];

export const MOTORS_ETAPA_LABEL: Record<MotorsEtapa, string> = {
  novo_lead: "Novo lead",
  conexao_realizada: "Conexão realizada",
  em_qualificacao: "Em qualificação",
  diagnostico: "Diagnóstico",
  educacao: "Educação",
  simulacao: "Simulação",
  proposta_apresentada: "Proposta apresentada",
  negociacao: "Negociação",
  fechamento: "Fechamento",
  pos_venda: "Pós-venda",
  perdido: "Perdido",
  sem_interesse: "Sem interesse",
};

export const MOTORS_ETAPA_COR: Record<MotorsEtapa, string> = {
  novo_lead: "bg-slate-100",
  conexao_realizada: "bg-blue-50",
  em_qualificacao: "bg-cyan-50",
  diagnostico: "bg-green-50",
  educacao: "bg-yellow-50",
  simulacao: "bg-orange-50",
  proposta_apresentada: "bg-purple-50",
  negociacao: "bg-pink-50",
  fechamento: "bg-emerald-50",
  pos_venda: "bg-teal-50",
  perdido: "bg-red-50",
  sem_interesse: "bg-gray-50",
};

export const MOTORS_FOLLOW_UP_DIAS: MotorsFollowUpDia[] = [1, 3, 5, 7, 15, 30];

export const MOTORS_VALOR_MIN = 10000;
export const MOTORS_VALOR_MAX = 1000000;

export interface MotorsLead {
  id: string;
  usuario_id: string;
  lead_id: string | null;
  cliente_id: string | null;
  nome: string;
  telefone: string;
  email: string | null;
  origem_lead: string | null;
  valor_desejado: number;
  capacidade_mensal: number;
  objetivo: string | null;
  modelo_veiculo: string | null;
  marca_veiculo: string | null;
  ano_veiculo: string | null;
  urgencia_aquisicao: string | null;
  disponibilidade_lance: boolean;
  canal_comunicacao_pref: string | null;
  objecoes_identificadas: string | null;
  proxima_acao: string | null;
  data_retorno: string | null;
  observacoes: string | null;
  etapa: MotorsEtapa;
  probabilidade: number;
  criado_em: string;
  atualizado_em: string;
}

export interface MotorsLeadInsert {
  nome: string;
  telefone: string;
  email?: string | null;
  lead_id?: string | null;
  cliente_id?: string | null;
  origem_lead?: string | null;
  valor_desejado: number;
  capacidade_mensal?: number;
  objetivo?: string | null;
  modelo_veiculo?: string | null;
  marca_veiculo?: string | null;
  ano_veiculo?: string | null;
  urgencia_aquisicao?: string | null;
  disponibilidade_lance?: boolean;
  canal_comunicacao_pref?: string | null;
  objecoes_identificadas?: string | null;
  proxima_acao?: string | null;
  data_retorno?: string | null;
  observacoes?: string | null;
  etapa?: MotorsEtapa;
  probabilidade?: number;
}

export interface MotorsFollowUp {
  id: string;
  motors_lead_id: string;
  usuario_id: string;
  dia: number;
  data_contato: string | null;
  contato_realizado: boolean;
  resultado: string | null;
  proxima_acao: string | null;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface MotorsFollowUpInsert {
  motors_lead_id: string;
  dia: number;
  data_contato?: string | null;
  contato_realizado?: boolean;
  resultado?: string | null;
  proxima_acao?: string | null;
  observacoes?: string | null;
}

export interface MotorsMensagemRegistrada {
  id: string;
  motors_lead_id: string;
  playbook_msg_id: string | null;
  mensagem_texto: string;
  tipo: MotorsMsgTipo | null;
  copiado_em: string;
  usuario_id: string;
}

export interface MotorsMensagemRegistradaInsert {
  motors_lead_id: string;
  playbook_msg_id?: string | null;
  mensagem_texto: string;
  tipo?: MotorsMsgTipo | null;
}

export interface MotorsSimulacao {
  id: string;
  motors_lead_id: string;
  usuario_id: string;
  valor: number;
  grupo: string | null;
  cota: number | null;
  prazo: number | null;
  taxa: number | null;
  observacoes: string | null;
  criado_em: string;
}

export interface MotorsSimulacaoInsert {
  motors_lead_id: string;
  valor: number;
  grupo?: string | null;
  cota?: number | null;
  prazo?: number | null;
  taxa?: number | null;
  observacoes?: string | null;
}

export interface MotorsProposta {
  id: string;
  motors_lead_id: string;
  usuario_id: string;
  valor: number;
  cota: number | null;
  prazo: number | null;
  taxa: number | null;
  observacoes: string | null;
  status: string;
  criado_em: string;
  atualizado_em: string;
}

export interface MotorsPropostaInsert {
  motors_lead_id: string;
  valor: number;
  cota?: number | null;
  prazo?: number | null;
  taxa?: number | null;
  observacoes?: string | null;
  status?: string;
}

export interface MotorsHistorico {
  id: string;
  motors_lead_id: string;
  etapa_anterior: MotorsEtapa | null;
  etapa_nova: MotorsEtapa;
  usuario_id: string | null;
  observacao: string | null;
  criado_em: string;
}