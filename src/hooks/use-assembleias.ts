import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Assembleia, AssembleiaInsert, AssembleiaAviso, AssembleiaAvisoInsert, AssembleiaHistorico } from "@/repositories/client/assembleias.repository";

const emptyForm: AssembleiaInsert = {
  cliente_id: null,
  grupo: "",
  cota: 0,
  data: "",
  numero_assembleia: 1,
  situacao: "Pendente",
  usuario_id: "",
};

export function useAssembleias() {
  const { success, error } = useToast();
  const [assembleias, setAssembleias] = useState<Assembleia[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<AssembleiaInsert>(emptyForm);
  const [selectedAssembleia, setSelectedAssembleia] = useState<Assembleia | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [avisos, setAvisos] = useState<AssembleiaAviso[]>([]);
  const [historico, setHistorico] = useState<AssembleiaHistorico[]>([]);
  const [isAvisosLoading, setIsAvisosLoading] = useState(false);
  const [isHistoricoLoading, setIsHistoricoLoading] = useState(false);

  const loadAssembleias = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { getAssembleias } = await import("@/repositories/client/assembleias.repository");
      const data = await getAssembleias();
      setAssembleias(data);
    } catch {
      setErrorMessage("Não foi possível carregar as assembleias.");
      error("Não foi possível carregar as assembleias.");
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  const loadAvisos = useCallback(async (assembleiaId: string) => {
    setIsAvisosLoading(true);
    try {
      const { getAssembleiaAvisos } = await import("@/repositories/client/assembleias.repository");
      const data = await getAssembleiaAvisos(assembleiaId);
      setAvisos(data);
    } catch {
      error("Não foi possível carregar os avisos.");
      setAvisos([]);
    } finally {
      setIsAvisosLoading(false);
    }
  }, [error]);

  const loadHistorico = useCallback(async (assembleiaId: string) => {
    setIsHistoricoLoading(true);
    try {
      const { getAssembleiaHistorico } = await import("@/repositories/client/assembleias.repository");
      const data = await getAssembleiaHistorico(assembleiaId);
      setHistorico(data);
    } catch {
      error("Não foi possível carregar o histórico.");
      setHistorico([]);
    } finally {
      setIsHistoricoLoading(false);
    }
  }, [error]);

  const openCreate = () => {
    setSelectedAssembleia(null);
    setFormData(emptyForm);
    setAvisos([]);
    setHistorico([]);
    setIsFormOpen(true);
  };

  const openEdit = (assembleia: Assembleia) => {
    setSelectedAssembleia(assembleia);
    setFormData({
      id: assembleia.id,
      cliente_id: assembleia.cliente_id,
      grupo: assembleia.grupo,
      cota: assembleia.cota,
      data: assembleia.data,
      numero_assembleia: assembleia.numero_assembleia,
      situacao: assembleia.situacao,
      usuario_id: assembleia.usuario_id,
      created_at: assembleia.created_at,
      updated_at: assembleia.updated_at,
    });
    setIsFormOpen(true);
    void loadAvisos(assembleia.id);
    void loadHistorico(assembleia.id);
  };

  const openDelete = (assembleia: Assembleia) => {
    setSelectedAssembleia(assembleia);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.grupo?.trim() && !selectedAssembleia) return;

    setIsSaving(true);
    try {
      const payload: AssembleiaInsert = {
        cliente_id: formData.cliente_id || null,
        grupo: formData.grupo?.trim() || "",
        cota: Number(formData.cota) || 0,
        data: formData.data,
        numero_assembleia: Number(formData.numero_assembleia) || 1,
        situacao: formData.situacao,
        usuario_id: formData.usuario_id,
      };

      const { createAssembleia, updateAssembleia } = await import("@/repositories/client/assembleias.repository");

      if (selectedAssembleia) {
        const updated = await updateAssembleia(selectedAssembleia.id, payload);
        setAssembleias((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        success("Assembleia atualizada com sucesso.");
      } else {
        const created = await createAssembleia(payload);
        setAssembleias((prev) => [created, ...prev]);
        success("Assembleia cadastrada com sucesso.");
      }
      setIsFormOpen(false);
      setFormData(emptyForm);
      setSelectedAssembleia(null);
    } catch {
      error("Não foi possível salvar a assembleia.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAssembleia) return;
    try {
      const { deleteAssembleia } = await import("@/repositories/client/assembleias.repository");
      await deleteAssembleia(selectedAssembleia.id);
      setAssembleias((prev) => prev.filter((a) => a.id !== selectedAssembleia.id));
      success("Assembleia excluída com sucesso.");
      setIsDeleteOpen(false);
      setSelectedAssembleia(null);
    } catch {
      error("Não foi possível excluir a assembleia.");
    }
  };

  const addAviso = async (payload: AssembleiaAvisoInsert) => {
    try {
      const { createAssembleiaAviso } = await import("@/repositories/client/assembleias.repository");
      const item = await createAssembleiaAviso(payload);
      setAvisos((prev) => [item, ...prev]);
      success("Aviso adicionado.");
      return item;
    } catch {
      error("Não foi possível adicionar aviso.");
      throw new Error("Falha ao adicionar aviso.");
    }
  };

  const addHistorico = async (assembleiaId: string, payload: { tipo?: string; descricao?: string }) => {
    try {
      const { addAssembleiaHistorico } = await import("@/repositories/client/assembleias.repository");
      const item = await addAssembleiaHistorico(assembleiaId, payload);
      setHistorico((prev) => [item, ...prev]);
      success("Histórico adicionado.");
      return item;
    } catch {
      error("Não foi possível adicionar histórico.");
      throw new Error("Falha ao adicionar histórico.");
    }
  };

  const refresh = async () => {
    await loadAssembleias();
  };

  useEffect(() => {
    void loadAssembleias();
  }, [loadAssembleias]);

  return {
    assembleias,
    isLoading,
    isSaving,
    errorMessage,
    formData,
    setFormData,
    selectedAssembleia,
    setSelectedAssembleia,
    isFormOpen,
    setIsFormOpen,
    isDeleteOpen,
    setIsDeleteOpen,
    avisos,
    historico,
    isAvisosLoading,
    isHistoricoLoading,
    openCreate,
    openEdit,
    openDelete,
    handleSubmit,
    handleDelete,
    addAviso,
    addHistorico,
    refresh,
    loadAvisos,
    loadHistorico,
  };
}
