import { useToast } from "@/hooks/use-toast";
import type { Indicador, IndicadorInsert, IndicadorUpdate } from "@/repositories/indicadores.repository";
import type { ContatoIndicado, ContatoIndicadoInsert, ContatoIndicadoUpdate } from "@/repositories/contatos-indicados.repository";
import type { ComissaoIndicador, ComissaoIndicadorInsert, ComissaoIndicadorUpdate } from "@/repositories/comissoes-indicadores.repository";

export function useIndicadores() {
  const { success, error } = useToast();

  const list = async () => {
    try {
      const { getIndicadores } = await import("@/repositories/indicadores.repository");
      return await getIndicadores();
    } catch {
      error("Não foi possível carregar os indicadores.");
      return [] as Indicador[];
    }
  };

  const get = async (id: string) => {
    try {
      const { getIndicador } = await import("@/repositories/indicadores.repository");
      return await getIndicador(id);
    } catch {
      error("Não foi possível carregar o indicador.");
      return null;
    }
  };

  const create = async (data: IndicadorInsert) => {
    try {
      const { createIndicador } = await import("@/repositories/indicadores.repository");
      const indicador = await createIndicador(data);
      success("Indicador cadastrado com sucesso.");
      return indicador;
    } catch {
      error("Não foi possível salvar o indicador.");
      throw new Error("Falha ao criar indicador.");
    }
  };

  const update = async (id: string, data: IndicadorUpdate) => {
    try {
      const { updateIndicador } = await import("@/repositories/indicadores.repository");
      const indicador = await updateIndicador(id, data);
      success("Indicador atualizado com sucesso.");
      return indicador;
    } catch {
      error("Não foi possível atualizar o indicador.");
      throw new Error("Falha ao atualizar indicador.");
    }
  };

  const remove = async (id: string) => {
    try {
      const { deleteIndicador } = await import("@/repositories/indicadores.repository");
      await deleteIndicador(id);
      success("Indicador excluído com sucesso.");
    } catch {
      error("Não foi possível excluir o indicador.");
      throw new Error("Falha ao excluir indicador.");
    }
  };

  return { list, get, create, update, remove };
}

export function useContatosIndicados() {
  const { success, error } = useToast();

  const listByIndicador = async (indicadorId: string) => {
    try {
      const { getContatosIndicados } = await import("@/repositories/contatos-indicados.repository");
      return await getContatosIndicados(indicadorId);
    } catch {
      error("Não foi possível carregar os contatos indicados.");
      return [] as ContatoIndicado[];
    }
  };

  const get = async (id: string) => {
    try {
      const { getContatoIndicado } = await import("@/repositories/contatos-indicados.repository");
      return await getContatoIndicado(id);
    } catch {
      error("Não foi possível carregar o contato indicado.");
      return null;
    }
  };

  const create = async (data: ContatoIndicadoInsert) => {
    try {
      const { createContatoIndicado } = await import("@/repositories/contatos-indicados.repository");
      const contato = await createContatoIndicado(data);
      success("Contato indicado cadastrado com sucesso.");
      return contato;
    } catch {
      error("Não foi possível salvar o contato indicado.");
      throw new Error("Falha ao criar contato indicado.");
    }
  };

  const update = async (id: string, data: ContatoIndicadoUpdate) => {
    try {
      const { updateContatoIndicado } = await import("@/repositories/contatos-indicados.repository");
      const contato = await updateContatoIndicado(id, data);
      success("Contato indicado atualizado com sucesso.");
      return contato;
    } catch {
      error("Não foi possível atualizar o contato indicado.");
      throw new Error("Falha ao atualizar contato indicado.");
    }
  };

  const remove = async (id: string) => {
    try {
      const { deleteContatoIndicado } = await import("@/repositories/contatos-indicados.repository");
      await deleteContatoIndicado(id);
      success("Contato indicado excluído com sucesso.");
    } catch {
      error("Não foi possível excluir o contato indicado.");
      throw new Error("Falha ao excluir contato indicado.");
    }
  };

  return { listByIndicador, get, create, update, remove };
}

export function useComissoesIndicadores() {
  const { success, error } = useToast();

  const listByIndicador = async (indicadorId: string) => {
    try {
      const { getComissoesIndicadores } = await import("@/repositories/comissoes-indicadores.repository");
      return await getComissoesIndicadores({ indicadorId });
    } catch {
      error("Não foi possível carregar as comissões.");
      return [] as ComissaoIndicador[];
    }
  };

  const get = async (id: string) => {
    try {
      const { getComissaoIndicador } = await import("@/repositories/comissoes-indicadores.repository");
      return await getComissaoIndicador(id);
    } catch {
      error("Não foi possível carregar a comissão.");
      return null;
    }
  };

  const create = async (data: ComissaoIndicadorInsert) => {
    try {
      const { createComissaoIndicador } = await import("@/repositories/comissoes-indicadores.repository");
      const comissao = await createComissaoIndicador(data);
      success("Comissão cadastrada com sucesso.");
      return comissao;
    } catch {
      error("Não foi possível salvar a comissão.");
      throw new Error("Falha ao criar comissão.");
    }
  };

  const update = async (id: string, data: ComissaoIndicadorUpdate) => {
    try {
      const { updateComissaoIndicador } = await import("@/repositories/comissoes-indicadores.repository");
      const comissao = await updateComissaoIndicador(id, data);
      success("Comissão atualizada com sucesso.");
      return comissao;
    } catch {
      error("Não foi possível atualizar a comissão.");
      throw new Error("Falha ao atualizar comissão.");
    }
  };

  const remove = async (id: string) => {
    try {
      const { deleteComissaoIndicador } = await import("@/repositories/comissoes-indicadores.repository");
      await deleteComissaoIndicador(id);
      success("Comissão excluída com sucesso.");
    } catch {
      error("Não foi possível excluir a comissão.");
      throw new Error("Falha ao excluir comissão.");
    }
  };

  return { listByIndicador, get, create, update, remove };
}
