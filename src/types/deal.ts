export type DealStage =
  | 'NOVO_LEAD'
  | 'QUALIFICANDO'
  | 'PROPOSTA_ENVIADA'
  | 'EM_NEGOCIACAO'
  | 'COLETA_DOCUMENTOS'
  | 'DADOS_CADASTRAIS'
  | 'ANALISE_BEM_CREDITO'
  | 'ASSINATURA_ALIENACAO'
  | 'AGUARDANDO_PAGAMENTO'
  | 'CONCLUIDO_SUCESSO'
  | 'ENVIAR_PARA_POS_VENDA';

export type DealStatus = 'ATIVO' | 'PERDIDO_DESISTENCIA' | 'RECUSADO_ADMINISTRADORA' | 'DEIXOU_PARA_DEPOIS';

export interface DealDocumentCheckItem {
  id: string;
  label: string;
  checado: boolean;
}

export interface Deal {
  id: string;
  leadId: string;
  clienteId: string | null;
  clienteNome: string;
  etapa: DealStage;
  status: DealStatus;
  valorCredito: number;
  grupo: number;
  cota: number;
  prazo: number;
  taxa: number;
  valorLanceEntrada: number;
  tipoCartaCredito: 'NOVA_COTA' | 'CONTEMPLADA';
  parcelaCheia: number;
  parcelaReduzida: number;
  administradora: string;
  tipoBem: 'IMOVEL' | 'VEICULO' | 'OUTRO_BENS_MOVEIS' | 'SERVICOS';
  comissaoEstimadaEmPorcentagem: number;
  documentosDadosCadastraisChecklist: DealDocumentCheckItem[];
  updatedAt: Date;
}
