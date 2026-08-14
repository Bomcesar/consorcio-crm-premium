import type { Indicador, IndicadorInsert, IndicadorUpdate } from "@/repositories/indicadores.repository";
import type { ContatoIndicado, ContatoIndicadoInsert, ContatoIndicadoUpdate } from "@/repositories/contatos-indicados.repository";
import type { ComissaoIndicador, ComissaoIndicadorInsert, ComissaoIndicadorUpdate } from "@/repositories/comissoes-indicadores.repository";

export interface IndicadorService {
  list(): Promise<Indicador[]>;
  get(id: string): Promise<Indicador | null>;
  create(data: IndicadorInsert): Promise<Indicador>;
  update(id: string, data: IndicadorUpdate): Promise<Indicador>;
  delete(id: string): Promise<void>;
}

export interface ContatoIndicadoService {
  listByIndicador(indicadorId: string): Promise<ContatoIndicado[]>;
  get(id: string): Promise<ContatoIndicado | null>;
  create(data: ContatoIndicadoInsert): Promise<ContatoIndicado>;
  update(id: string, data: ContatoIndicadoUpdate): Promise<ContatoIndicado>;
  delete(id: string): Promise<void>;
}

export interface ComissaoIndicadorService {
  listByIndicador(filtro?: { indicadorId?: string; clienteId?: string; status?: string }): Promise<ComissaoIndicador[]>;
  get(id: string): Promise<ComissaoIndicador | null>;
  create(data: ComissaoIndicadorInsert): Promise<ComissaoIndicador>;
  update(id: string, data: ComissaoIndicadorUpdate): Promise<ComissaoIndicador>;
  delete(id: string): Promise<void>;
}

export async function getIndicadorService(): Promise<IndicadorService> {
  const {
    getIndicadores,
    getIndicador,
    createIndicador,
    updateIndicador,
    deleteIndicador,
  } = await import("@/repositories/indicadores.repository");

  return {
    list: getIndicadores,
    get: getIndicador,
    create: createIndicador,
    update: updateIndicador,
    delete: deleteIndicador,
  };
}

export async function getContatoIndicadoService(): Promise<ContatoIndicadoService> {
  const {
    getContatosIndicados,
    getContatoIndicado,
    createContatoIndicado,
    updateContatoIndicado,
    deleteContatoIndicado,
  } = await import("@/repositories/contatos-indicados.repository");

  return {
    listByIndicador: getContatosIndicados,
    get: getContatoIndicado,
    create: createContatoIndicado,
    update: updateContatoIndicado,
    delete: deleteContatoIndicado,
  };
}

export async function getComissaoIndicadorService(): Promise<ComissaoIndicadorService> {
  const {
    getComissoesIndicadores,
    getComissaoIndicador,
    createComissaoIndicador,
    updateComissaoIndicador,
    deleteComissaoIndicador,
  } = await import("@/repositories/comissoes-indicadores.repository");

  return {
    listByIndicador: getComissoesIndicadores,
    get: getComissaoIndicador,
    create: createComissaoIndicador,
    update: updateComissaoIndicador,
    delete: deleteComissaoIndicador,
  };
}
