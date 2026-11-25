export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/leads": ["leads.ver"],
  "/central-de-indicadores": ["indicadores.ver"],
  "/clientes": ["clientes.ver"],
  "/contatos": ["contatos.ver"],
  "/agenda": ["agenda.ver"],
  "/whatsapp": ["whatsapp.ver"],
  "/comunicacao": ["comunicacao.ver"],
  "/negociacoes": ["negociacoes.ver"],
  "/cobranca": ["cobranca.ver"],
  "/comissoes": ["comissoes.ver_proprias", "comissoes.ver_todas"],
  "/pos-venda": ["pos_venda.ver"],
  "/parceiros": ["parceiros.ver"],
  "/recrutamento": ["recrutamento.ver"],
  "/biblioteca": ["biblioteca.ver"],
  "/treinamentos": ["treinamentos.ver"],
  "/materiais-consultores": ["materiais.ver"],
  "/links-uteis": ["links_uteis.visualizar"],
  "/relatorios": ["relatorios.ver"],
  "/metas": ["metas.ver"],
  "/credito-investimento": ["credito_investimento.visualizar"],
};

export const ADMIN_ONLY_ROUTES = new Set<string>();