import { useToast } from "@/hooks/use-toast";
import type { Negociacao, NegociacaoInsert, NegociacaoUpdate, NegociacaoHistorico, NegociacaoAnexo } from "@/repositories/client/negociacoes.repository";

export function useNegociacoes() {
  const { success, error } = useToast();

  const list = async () => {
    try {
      const { getNegociacoes } = await import("@/repositories/client/negociacoes.repository");
      return await getNegociacoes();
    } catch {
      error("Não foi possível carregar as negociações.");
      return [] as Negociacao[];
    }
  };

  const get = async (id: string) => {
    try {
      const { getNegociacao } = await import("@/repositories/client/negociacoes.repository");
      return await getNegociacao(id);
    } catch {
      error("Não foi possível carregar a negociação.");
      return null;
    }
  };

  const create = async (data: NegociacaoInsert) => {
    try {
      const { createNegociacao } = await import("@/repositories/client/negociacoes.repository");
      const negociacao = await createNegociacao(data);
      success("Negociação cadastrada com sucesso.");
      return negociacao;
    } catch {
      error("Não foi possível salvar a negociação.");
      throw new Error("Falha ao criar negociação.");
    }
  };

  const update = async (id: string, data: NegociacaoUpdate) => {
    try {
      const { updateNegociacao } = await import("@/repositories/client/negociacoes.repository");
      const negociacao = await updateNegociacao(id, data);
      success("Negociação atualizada com sucesso.");
      return negociacao;
    } catch {
      error("Não foi possível atualizar a negociação.");
      throw new Error("Falha ao atualizar negociação.");
    }
  };

  const remove = async (id: string) => {
    try {
      const { deleteNegociacao } = await import("@/repositories/client/negociacoes.repository");
      await deleteNegociacao(id);
      success("Negociação excluída com sucesso.");
    } catch {
      error("Não foi possível excluir a negociação.");
      throw new Error("Falha ao excluir negociação.");
    }
  };

  const getHistorico = async (negociacaoId: string) => {
    try {
      const { getNegociacaoHistorico } = await import("@/repositories/client/negociacoes.repository");
      return await getNegociacaoHistorico(negociacaoId);
    } catch {
      error("Não foi possível carregar o histórico.");
      return [] as NegociacaoHistorico[];
    }
  };

  const addHistorico = async (negociacaoId: string, payload: { tipo?: string; descricao?: string }) => {
    try {
      const { addNegociacaoHistorico } = await import("@/repositories/client/negociacoes.repository");
      const item = await addNegociacaoHistorico(negociacaoId, payload);
      success("Histórico adicionado.");
      return item;
    } catch {
      error("Não foi possível adicionar histórico.");
      throw new Error("Falha ao adicionar histórico.");
    }
  };

  const getAnexos = async (negociacaoId: string) => {
    try {
      const { getNegociacaoAnexos } = await import("@/repositories/client/negociacoes.repository");
      return await getNegociacaoAnexos(negociacaoId);
    } catch {
      error("Não foi possível carregar os anexos.");
      return [] as NegociacaoAnexo[];
    }
  };

  const addAnexo = async (negociacaoId: string, file: File) => {
    try {
      const { addNegociacaoAnexo } = await import("@/repositories/client/negociacoes.repository");
      const item = await addNegociacaoAnexo(negociacaoId, file);
      success("Anexo adicionado.");
      return item;
    } catch {
      error("Não foi possível adicionar anexo.");
      throw new Error("Falha ao adicionar anexo.");
    }
  };

  const removeAnexo = async (id: string) => {
    try {
      const { removeNegociacaoAnexo } = await import("@/repositories/client/negociacoes.repository");
      await removeNegociacaoAnexo(id);
      success("Anexo removido.");
    } catch {
      error("Não foi possível remover anexo.");
      throw new Error("Falha ao remover anexo.");
    }
  };

  return { list, get, create, update, remove, getHistorico, addHistorico, getAnexos, addAnexo, removeAnexo };
}
