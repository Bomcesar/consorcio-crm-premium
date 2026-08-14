import { useToast } from "@/hooks/use-toast";
import type {
  Comunicacao,
  ComunicacaoInsert,
  ComunicacaoUpdate,
  ComunicacaoTemplate,
  ComunicacaoTemplateInsert,
  ComunicacaoTemplateUpdate,
} from "@/repositories/client/comunicacao.repository";

export function useComunicacao() {
  const { success, error } = useToast();

  const listComunicacoes = async () => {
    try {
      const { getComunicacoes } = await import("@/repositories/client/comunicacao.repository");
      return await getComunicacoes();
    } catch {
      error("Não foi possível carregar as comunicações.");
      return [] as Comunicacao[];
    }
  };

  const getComunicacao = async (id: string) => {
    try {
      const { getComunicacao } = await import("@/repositories/client/comunicacao.repository");
      return await getComunicacao(id);
    } catch {
      error("Não foi possível carregar a comunicação.");
      return null;
    }
  };

  const createComunicacao = async (payload: ComunicacaoInsert) => {
    try {
      const { createComunicacao } = await import("@/repositories/client/comunicacao.repository");
      const item = await createComunicacao(payload);
      success("Comunicação registrada com sucesso.");
      return item;
    } catch {
      error("Não foi possível salvar a comunicação.");
      throw new Error("Falha ao criar comunicação.");
    }
  };

  const updateComunicacao = async (id: string, payload: ComunicacaoUpdate) => {
    try {
      const { updateComunicacao } = await import("@/repositories/client/comunicacao.repository");
      const item = await updateComunicacao(id, payload);
      success("Comunicação atualizada com sucesso.");
      return item;
    } catch {
      error("Não foi possível atualizar a comunicação.");
      throw new Error("Falha ao atualizar comunicação.");
    }
  };

  const removeComunicacao = async (id: string) => {
    try {
      const { deleteComunicacao } = await import("@/repositories/client/comunicacao.repository");
      await deleteComunicacao(id);
      success("Comunicação excluída com sucesso.");
    } catch {
      error("Não foi possível excluir a comunicação.");
      throw new Error("Falha ao excluir comunicação.");
    }
  };

  const listTemplates = async () => {
    try {
      const { getTemplates } = await import("@/repositories/client/comunicacao.repository");
      return await getTemplates();
    } catch {
      error("Não foi possível carregar os templates.");
      return [] as ComunicacaoTemplate[];
    }
  };

  const getTemplate = async (id: string) => {
    try {
      const { getTemplate } = await import("@/repositories/client/comunicacao.repository");
      return await getTemplate(id);
    } catch {
      error("Não foi possível carregar o template.");
      return null;
    }
  };

  const createTemplate = async (payload: ComunicacaoTemplateInsert) => {
    try {
      const { createTemplate } = await import("@/repositories/client/comunicacao.repository");
      const item = await createTemplate(payload);
      success("Template cadastrado com sucesso.");
      return item;
    } catch {
      error("Não foi possível salvar o template.");
      throw new Error("Falha ao criar template.");
    }
  };

  const updateTemplate = async (id: string, payload: ComunicacaoTemplateUpdate) => {
    try {
      const { updateTemplate } = await import("@/repositories/client/comunicacao.repository");
      const item = await updateTemplate(id, payload);
      success("Template atualizado com sucesso.");
      return item;
    } catch {
      error("Não foi possível atualizar o template.");
      throw new Error("Falha ao atualizar template.");
    }
  };

  const removeTemplate = async (id: string) => {
    try {
      const { deleteTemplate } = await import("@/repositories/client/comunicacao.repository");
      await deleteTemplate(id);
      success("Template excluído com sucesso.");
    } catch {
      error("Não foi possível excluir o template.");
      throw new Error("Falha ao excluir template.");
    }
  };

  return {
    listComunicacoes,
    getComunicacao,
    createComunicacao,
    updateComunicacao,
    removeComunicacao,
    listTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    removeTemplate,
  };
}
