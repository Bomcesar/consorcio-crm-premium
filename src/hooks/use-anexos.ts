import { useToast } from "@/hooks/use-toast";
import type { Anexo } from "@/repositories/client/anexos.repository";

export function useAnexos() {
  const { success, error } = useToast();

  const list = async (entityType: string, entityId: string) => {
    try {
      const { getAnexos } = await import("@/repositories/client/anexos.repository");
      return await getAnexos(entityType, entityId);
    } catch {
      error("Não foi possível carregar os anexos.");
      return [] as Anexo[];
    }
  };

  const get = async (id: string) => {
    try {
      const { getAnexo } = await import("@/repositories/client/anexos.repository");
      return await getAnexo(id);
    } catch {
      error("Não foi possível carregar o anexo.");
      return null;
    }
  };

  const upload = async (entityType: string, entityId: string, file: File, options?: { nome?: string }) => {
    try {
      const { uploadAnexo } = await import("@/repositories/client/anexos.repository");
      const anexo = await uploadAnexo(entityType, entityId, file, options);
      success("Anexo enviado com sucesso.");
      return anexo;
    } catch {
      error("Não foi possível enviar o anexo.");
      throw new Error("Falha ao enviar anexo.");
    }
  };

  const remove = async (id: string) => {
    try {
      const { deleteAnexo } = await import("@/repositories/client/anexos.repository");
      await deleteAnexo(id);
      success("Anexo excluído com sucesso.");
    } catch {
      error("Não foi possível excluir o anexo.");
      throw new Error("Falha ao excluir anexo.");
    }
  };

  const getDownloadUrl = async (caminho: string) => {
    try {
      const { getDownloadUrl } = await import("@/repositories/client/anexos.repository");
      return await getDownloadUrl(caminho);
    } catch {
      error("Não foi possível gerar o link de download.");
      throw new Error("Falha ao gerar link de download.");
    }
  };

  return {
    list,
    get,
    upload,
    remove,
    getDownloadUrl,
  };
}
