import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Contemplacao, ContemplacaoInsert, ContemplacaoHistorico } from "@/repositories/client/contemplacoes.repository";

const emptyForm: ContemplacaoInsert = {
  cliente_id: null,
  grupo: "",
  cota: 0,
  assembleia_id: null,
  data: "",
  tipo: "Lance",
  resultado: "",
  documentos: "",
  observacoes: "",
  usuario_id: "",
};

export function useContemplacoes() {
  const { success, error } = useToast();
  const [contemplacoes, setContemplacoes] = useState<Contemplacao[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<ContemplacaoInsert>(emptyForm);
  const [selectedContemplacao, setSelectedContemplacao] = useState<Contemplacao | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [historico, setHistorico] = useState<ContemplacaoHistorico[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const loadContemplacoes = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { getContemplacoes } = await import("@/repositories/client/contemplacoes.repository");
      const data = await getContemplacoes();
      setContemplacoes(data);
    } catch {
      setErrorMessage("Não foi possível carregar as contemplações.");
      error("Não foi possível carregar as contemplações.");
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  const loadHistorico = useCallback(async (contemplacaoId: string) => {
    setIsHistoryLoading(true);
    try {
      const { getContemplacaoHistorico } = await import("@/repositories/client/contemplacoes.repository");
      const data = await getContemplacaoHistorico(contemplacaoId);
      setHistorico(data);
    } catch {
      error("Não foi possível carregar o histórico.");
      setHistorico([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [error]);

  const openCreate = () => {
    setSelectedContemplacao(null);
    setFormData(emptyForm);
    setHistorico([]);
    setIsFormOpen(true);
  };

  const openEdit = (contemplacao: Contemplacao) => {
    setSelectedContemplacao(contemplacao);
    setFormData({
      id: contemplacao.id,
      cliente_id: contemplacao.cliente_id,
      grupo: contemplacao.grupo,
      cota: contemplacao.cota,
      assembleia_id: contemplacao.assembleia_id,
      data: contemplacao.data,
      tipo: contemplacao.tipo,
      resultado: contemplacao.resultado,
      documentos: contemplacao.documentos,
      observacoes: contemplacao.observacoes,
      usuario_id: contemplacao.usuario_id,
      created_at: contemplacao.created_at,
      updated_at: contemplacao.updated_at,
    });
    setIsFormOpen(true);
    void loadHistorico(contemplacao.id);
  };

  const openDelete = (contemplacao: Contemplacao) => {
    setSelectedContemplacao(contemplacao);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.grupo?.trim() && !selectedContemplacao) return;

    setIsSaving(true);
    try {
      const payload: ContemplacaoInsert = {
        cliente_id: formData.cliente_id || null,
        grupo: formData.grupo?.trim() || "",
        cota: Number(formData.cota) || 0,
        assembleia_id: formData.assembleia_id || null,
        data: formData.data,
        tipo: formData.tipo,
        resultado: formData.resultado?.trim() || "",
        documentos: formData.documentos?.trim() || "",
        observacoes: formData.observacoes?.trim() || "",
        usuario_id: formData.usuario_id,
      };

      const { createContemplacao, updateContemplacao } = await import("@/repositories/client/contemplacoes.repository");

      if (selectedContemplacao) {
        const updated = await updateContemplacao(selectedContemplacao.id, payload);
        setContemplacoes((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        success("Contemplação atualizada com sucesso.");
      } else {
        const created = await createContemplacao(payload);
        setContemplacoes((prev) => [created, ...prev]);
        success("Contemplação cadastrada com sucesso.");
      }
      setIsFormOpen(false);
      setFormData(emptyForm);
      setSelectedContemplacao(null);
    } catch {
      error("Não foi possível salvar a contemplação.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedContemplacao) return;
    try {
      const { deleteContemplacao } = await import("@/repositories/client/contemplacoes.repository");
      await deleteContemplacao(selectedContemplacao.id);
      setContemplacoes((prev) => prev.filter((c) => c.id !== selectedContemplacao.id));
      success("Contemplação excluída com sucesso.");
      setIsDeleteOpen(false);
      setSelectedContemplacao(null);
    } catch {
      error("Não foi possível excluir a contemplação.");
    }
  };

  const addHistorico = async (contemplacaoId: string, payload: { tipo?: string; descricao?: string }) => {
    try {
      const { addContemplacaoHistorico } = await import("@/repositories/client/contemplacoes.repository");
      const item = await addContemplacaoHistorico(contemplacaoId, payload);
      setHistorico((prev) => [item, ...prev]);
      success("Histórico adicionado.");
      return item;
    } catch {
      error("Não foi possível adicionar histórico.");
      throw new Error("Falha ao adicionar histórico.");
    }
  };

  const refresh = async () => {
    await loadContemplacoes();
  };

  useEffect(() => {
    void loadContemplacoes();
  }, [loadContemplacoes]);

  return {
    contemplacoes,
    isLoading,
    isSaving,
    errorMessage,
    formData,
    setFormData,
    selectedContemplacao,
    setSelectedContemplacao,
    isFormOpen,
    setIsFormOpen,
    isDeleteOpen,
    setIsDeleteOpen,
    historico,
    isHistoryLoading,
    openCreate,
    openEdit,
    openDelete,
    handleSubmit,
    handleDelete,
    addHistorico,
    refresh,
    loadHistorico,
  };
}
