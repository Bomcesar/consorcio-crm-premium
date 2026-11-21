export type CreditoEtapa =
  | "novo_lead"
  | "primeiro_contato"
  | "em_conversa"
  | "qualificado"
  | "reuniao_agendada"
  | "apresentacao_realizada"
  | "proposta_enviada"
  | "em_negociacao"
  | "venda_realizada"
  | "pos_venda"
  | "perdido"
  | "sem_interesse";

export type PlaybookSegmento = "motors" | "credito_investimento";

export type MsgWhatsappTipo =
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

export const CREDITO_ETAPAS: CreditoEtapa[] = [
  "novo_lead",
  "primeiro_contato",
  "em_conversa",
  "qualificado",
  "reuniao_agendada",
  "apresentacao_realizada",
  "proposta_enviada",
  "em_negociacao",
  "venda_realizada",
  "pos_venda",
  "perdido",
  "sem_interesse",
];

export const CREDITO_ETAPA_LABEL: Record<CreditoEtapa, string> = {
  novo_lead: "Novo lead",
  primeiro_contato: "Primeiro contato",
  em_conversa: "Em conversa",
  qualificado: "Qualificado",
  reuniao_agendada: "Reuniao agendada",
  apresentacao_realizada: "Apresentacao realizada",
  proposta_enviada: "Proposta enviada",
  em_negociacao: "Em negociacao",
  venda_realizada: "Venda realizada",
  pos_venda: "Pos-venda",
  perdido: "Perdido",
  sem_interesse: "Sem interesse",
};

export interface CreditoInvestimento {
  id: string;
  usuario_id: string;
  lead_id: string | null;
  cliente_id: string | null;
  nome: string;
  telefone: string;
  origem_lead: string | null;
  valor_desejado: number;
  capacidade_mensal: number;
  objetivo: string | null;
  modelo_veiculo: string | null;
  urgencia_aquisicao: string | null;
  disponibilidade_lance: boolean;
  canal_comunicacao_pref: string | null;
  objecoes_identificadas: string | null;
  proxima_acao: string | null;
  data_retorno: string | null;
  observacoes: string | null;
  etapa: CreditoEtapa;
  probabilidade: number;
  criado_em: string;
  atualizado_em: string;
}

export interface PlaybookAtendimento {
  id: string;
  nome: string;
  segmento: PlaybookSegmento;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface PlaybookMensagem {
  id: string;
  playbook_id: string;
  etapa: CreditoEtapa;
  tipo: MsgWhatsappTipo;
  titulo: string;
  conteudo: string;
  ordem: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface CreditoHistorico {
  id: string;
  credito_id: string;
  etapa_anterior: CreditoEtapa | null;
  etapa_nova: CreditoEtapa;
  usuario_id: string | null;
  observacao: string | null;
  criado_em: string;
}

export interface CreditoMensagemRegistrada {
  id: string;
  credito_id: string;
  playbook_msg_id: string | null;
  mensagem_texto: string;
  tipo: MsgWhatsappTipo | null;
  copiado_em: string;
  usuario_id: string;
}

export interface CreditoTarefa {
  id: string;
  credito_id: string;
  usuario_id: string;
  titulo: string;
  observacao: string | null;
  data_prevista: string;
  concluida: boolean;
  concluida_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface CreditoReuniao {
  id: string;
  credito_id: string;
  usuario_id: string;
  titulo: string;
  data_hora: string;
  local: string | null;
  google_meet_link: string | null;
  confirmado: boolean;
  compareceu: boolean | null;
  resultado: string | null;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface CreditosSimulacao {
  id: string;
  credito_id: string;
  usuario_id: string;
  valor: number;
  grupo: string | null;
  cota: number | null;
  prazo: number | null;
  taxa: number | null;
  observacoes: string | null;
  criado_em: string;
}