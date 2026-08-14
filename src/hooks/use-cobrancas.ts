import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Cobranca, CobrancaInsert, CobrancaHistorico } from "@/repositories/client/cobranca.repository";

const emptyForm: CobrancaInsert = {
  valor: 0,
  valor_pago: 0,
  metodo_pagamento: "",
  data_vencimento: "",
  data_pagamento: null,
  status: "Pendente",
  cliente_id: null,
  observacoes: "",
  numero_parcela: 1,
  total_parcelas: 1,
  boleto_url: "",
  lembrete_em: null,
  cliente_origem_id: null,
};

export function useCobrancas() {
  const { success, error } = useToast();
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<CobrancaInsert>(emptyForm);
  const [selectedCobranca, setSelectedCobranca] = useState<Cobranca | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [historico, setHistorico] = useState<CobrancaHistorico[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const loadCobrancas = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { getCobrancas } = await import("@/repositories/client/cobranca.repository");
      const data = await getCobrancas();
      setCobrancas(data);
    } catch {
      setErrorMessage("Não foi possível carregar as cobranças.");
      error("Não foi possível carregar as cobranças.");
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  const loadHistorico = useCallback(async (cobrancaId: string) => {
    setIsHistoryLoading(true);
    try {
      const { getCobrancaHistorico } = await import("@/repositories/client/cobranca.repository");
      const data = await getCobrancaHistorico(cobrancaId);
      setHistorico(data);
    } catch {
      error("Não foi possível carregar o histórico.");
      setHistorico([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [error]);

  const openCreate = () => {
    setSelectedCobranca(null);
    setFormData(emptyForm);
    setHistorico([]);
    setIsFormOpen(true);
  };

  const openEdit = (cobranca: Cobranca) => {
    setSelectedCobranca(cobranca);
    setFormData({
      id: cobranca.id,
      valor: cobranca.valor,
      valor_pago: cobranca.valor_pago,
      metodo_pagamento: cobranca.metodo_pagamento,
      data_vencimento: cobranca.data_vencimento,
      data_pagamento: cobranca.data_pagamento,
      status: cobranca.status,
      cliente_id: cobranca.cliente_id,
      observacoes: cobranca.observacoes,
      numero_parcela: cobranca.numero_parcela,
      total_parcelas: cobranca.total_parcelas,
      boleto_url: cobranca.boleto_url,
      lembrete_em: cobranca.lembrete_em,
      cliente_origem_id: cobranca.cliente_origem_id,
      created_at: cobranca.created_at,
      updated_at: cobranca.updated_at,
    });
    setIsFormOpen(true);
    void loadHistorico(cobranca.id);
  };

  const openDelete = (cobranca: Cobranca) => {
    setSelectedCobranca(cobranca);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.valor && !selectedCobranca) return;

    setIsSaving(true);
    try {
      const payload: CobrancaInsert = {
        valor: Number(formData.valor) || 0,
        valor_pago: Number(formData.valor_pago) || 0,
        metodo_pagamento: formData.metodo_pagamento?.trim() || "",
        data_vencimento: formData.data_vencimento,
        data_pagamento: formData.data_pagamento || null,
        status: formData.status,
        cliente_id: formData.cliente_id || null,
        observacoes: formData.observacoes?.trim() || "",
        numero_parcela: Number(formData.numero_parcela) || 1,
        total_parcelas: Number(formData.total_parcelas) || 1,
        boleto_url: formData.boleto_url?.trim() || "",
        lembrete_em: formData.lembrete_em || null,
        cliente_origem_id: formData.cliente_origem_id || null,
      };

      const { createCobranca, updateCobranca } = await import("@/repositories/client/cobranca.repository");

      if (selectedCobranca) {
        const updated = await updateCobranca(selectedCobranca.id, payload);
        setCobrancas((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        success("Cobrança atualizada com sucesso.");
      } else {
        const created = await createCobranca(payload);
        setCobrancas((prev) => [created, ...prev]);
        success("Cobrança cadastrada com sucesso.");
      }
      setIsFormOpen(false);
      setFormData(emptyForm);
      setSelectedCobranca(null);
    } catch {
      error("Não foi possível salvar a cobrança.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCobranca) return;
    try {
      const { deleteCobranca } = await import("@/repositories/client/cobranca.repository");
      await deleteCobranca(selectedCobranca.id);
      setCobrancas((prev) => prev.filter((c) => c.id !== selectedCobranca.id));
      success("Cobrança excluída com sucesso.");
      setIsDeleteOpen(false);
      setSelectedCobranca(null);
    } catch {
      error("Não foi possível excluir a cobrança.");
    }
  };

  const addHistorico = async (cobrancaId: string, payload: { tipo?: string; descricao?: string }) => {
    try {
      const { addCobrancaHistorico } = await import("@/repositories/client/cobranca.repository");
      const item = await addCobrancaHistorico(cobrancaId, payload);
      setHistorico((prev) => [item, ...prev]);
      success("Histórico adicionado.");
      return item;
    } catch {
      error("Não foi possível adicionar histórico.");
      throw new Error("Falha ao adicionar histórico.");
    }
  };

  const refresh = async () => {
    await loadCobrancas();
  };

  useEffect(() => {
    void loadCobrancas();
  }, [loadCobrancas]);

  return {
    cobrancas,
    isLoading,
    isSaving,
    errorMessage,
    formData,
    setFormData,
    selectedCobranca,
    setSelectedCobranca,
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
