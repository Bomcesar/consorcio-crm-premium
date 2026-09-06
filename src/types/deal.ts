export type DealStage =
  | 'NOVO_LEAD'
  | 'QUALIFICACAO'
  | 'PROPOSTA_ENVIADA'
  | 'NEGOCIACAO_COMERCIAL'
  | 'COLETA_DOCUMENTOS'
  | 'ANALISE_BEM_CREDITO'
  | 'ASSINATURA_ALIENACAO'
  | 'AGUARDANDO_LIQUIDACAO'
  | 'CONCLUIDO_SUCESSO';

export type DealStatus = 'ATIVO' | 'PERDIDO_DESISTENCIA' | 'RECUSADO_ADMINISTRADORA' | 'EM_ESPERA';

export interface DealDocumentCheckItem {
  id: string;
  label: string;
  checado: boolean;
}

export interface Deal {
  id: string;
  clienteNome: string;
  etapa: DealStage;
  status: DealStatus;
  valorCarta: number;
  valorLanceEntrada: number;
  tipoCarta: 'NOVA_COTA' | 'CONTEMPLADA';
  administradora: string;
  tipoBem: 'IMOVEL' | 'VEICULO' | 'PESADOS' | 'SERVICOS';
  comissaoEstimada: number;
  documentosChecklist: DealDocumentCheckItem[];
  updatedAt: Date;
}
