export {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  type Lead,
  type LeadInsert,
  type LeadUpdate,
} from "./leads.repository";

export {
  getIndicadores,
  getIndicador,
  createIndicador,
  updateIndicador,
  deleteIndicador,
  getIndicadoresComContatos,
  type Indicador,
  type IndicadorInsert,
  type IndicadorUpdate,
} from "./indicadores.repository";

export {
  getContatosIndicados,
  getContatoIndicado,
  createContatoIndicado,
  updateContatoIndicado,
  deleteContatoIndicado,
  type ContatoIndicado,
  type ContatoIndicadoInsert,
  type ContatoIndicadoUpdate,
} from "./contatos-indicados.repository";

export {
  getComissoesIndicadores,
  getComissaoIndicador,
  createComissaoIndicador,
  updateComissaoIndicador,
  deleteComissaoIndicador,
  getComissoesResumo,
  type ComissaoIndicador,
  type ComissaoIndicadorInsert,
  type ComissaoIndicadorUpdate,
} from "./comissoes-indicadores.repository";

export {
  getClientes,
  getCliente,
  createCliente,
  updateCliente,
  deleteCliente,
  type Cliente,
  type ClienteInsert,
  type ClienteUpdate,
} from "./clientes.repository";

export {
  getEventosAgenda,
  getEventoAgenda,
  createEventoAgenda,
  updateEventoAgenda,
  deleteEventoAgenda,
  type EventoAgenda,
  type EventoAgendaInsert,
  type EventoAgendaUpdate,
} from "./agenda.repository";

export {
  getMensagensWhatsApp,
  createMensagemWhatsApp,
  updateMensagemWhatsApp,
  deleteMensagemWhatsApp,
  type WhatsAppMensagem,
  type WhatsAppMensagemInsert,
  type WhatsAppMensagemUpdate,
} from "./whatsapp.repository";

export {
  getNegociacoes,
  getNegociacao,
  createNegociacao,
  updateNegociacao,
  deleteNegociacao,
  type Negociacao,
  type NegociacaoInsert,
  type NegociacaoUpdate,
} from "./negociacoes.repository";

export {
  getPosVendas,
  getPosVenda,
  createPosVenda,
  updatePosVenda,
  deletePosVenda,
  type PosVenda,
  type PosVendaInsert,
  type PosVendaUpdate,
} from "./pos-venda.repository";

export {
  getCobrancas,
  getCobranca,
  createCobranca,
  updateCobranca,
  deleteCobranca,
  type Cobranca,
  type CobrancaInsert,
  type CobrancaUpdate,
} from "./cobranca.repository";

export {
  getDashboardStats,
  getAtividadesRecentes,
  type DashboardStats,
  type DashboardAtividadeRecente,
} from "./dashboard.repository";

export {
  getPastas,
  getPasta,
  createPasta,
  updatePasta,
  deletePasta,
  getPastaItens,
  addClienteToPasta,
  updatePastaItem,
  removeClienteFromPasta,
  getProspeccaoHistorico,
  addProspeccaoHistorico,
  getProspeccaoStats,
  type Pasta,
  type PastaInsert,
  type PastaUpdate,
  type PastaItem,
  type PastaItemInsert,
  type PastaItemUpdate,
  type ProspeccaoHistorico,
  type ProspeccaoHistoricoInsert,
  type ProspeccaoHistoricoUpdate,
} from "./client/pastas.repository";
