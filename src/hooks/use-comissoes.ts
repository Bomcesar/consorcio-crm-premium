import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ComissaoIndicador } from "@/repositories/client/comissoes-indicadores.repository";

const emptyForm = {
  indicador_id: "",
  cliente_id: "",
  negociacao_id: "",
  valor: "",
  status: "Prevista" as ComissaoIndicador["status"],
  tipo: "Venda" as ComissaoIndicador["tipo"],
  pix: "",
  data_prevista: "",
  data_pagamento: "",
  observacoes: "",
};

type FormData = typeof emptyForm;

export function useComissoes() {
  const { success, error } = useToast();
  const [comissoes, setComissoes] = useState<ComissaoIndicador[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filters = useMemo(() => ({
    indicadorId: formData.indicador_id || undefined,
    clienteId: formData.cliente_id || undefined,
    status: formData.status || undefined,
  }), [formData.indicador_id, formData.cliente_id, formData.status]);

  const resumo = useMemo(() => {
    const total = comissoes.reduce((sum, c) => sum + Number(c.valor), 0);
    const totalPendente = comissoes
      .filter((c) => c.status === "Pendente")
      .reduce((sum, c) => sum + Number(c.valor), 0);
    const totalPago = comissoes
      .filter((c) => c.status === "Paga")
      .reduce((sum, c) => sum + Number(c.valor), 0);
    const totalAReceber = comissoes
      .filter((c) => c.status === "A receber" || c.status === "Prevista")
      .reduce((sum, c) => sum + Number(c.valor), 0);

    return {
      total: Math.round(total * 100) / 100,
      totalPendente: Math.round(totalPendente * 100) / 100,
      totalPago: Math.round(totalPago * 100) / 100,
      totalAReceber: Math.round(totalAReceber * 100) / 100,
      quantidade: comissoes.length,
    };
  }, [comissoes]);

  const loadComissoes = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { getComissoesIndicadores } = await import("@/repositories/client/comissoes-indicadores.repository");
      const data = await getComissoesIndicadores(filters);
      setComissoes(data);
    } catch {
      setErrorMessage("Não foi possível carregar as comissões.");
      error("Não foi possível carregar as comissões.");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (comissao: ComissaoIndicador) => {
    setEditingId(comissao.id);
    setFormData({
      indicador_id: comissao.indicador_id,
      cliente_id: comissao.cliente_id || "",
      negociacao_id: comissao.negociacao_id || "",
      valor: String(comissao.valor ?? 0),
      status: comissao.status,
      tipo: comissao.tipo || "Venda",
      pix: comissao.pix || "",
      data_prevista: comissao.data_prevista || "",
      data_pagamento: comissao.data_pagamento || "",
      observacoes: comissao.observacoes || "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId && !formData.indicador_id) return;

    setIsSaving(true);
    try {
      const payload = {
        indicador_id: formData.indicador_id,
        cliente_id: formData.cliente_id || null,
        negociacao_id: formData.negociacao_id || null,
        valor: Number(formData.valor),
        status: formData.status,
        tipo: formData.tipo,
        pix: formData.pix,
        data_prevista: formData.data_prevista || null,
        data_pagamento: formData.data_pagamento || null,
        observacoes: formData.observacoes,
      };

      const { createComissaoIndicador, updateComissaoIndicador } = await import("@/repositories/client/comissoes-indicadores.repository");

      if (editingId) {
        const updated = await updateComissaoIndicador(editingId, payload);
        setComissoes((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        success("Comissão atualizada com sucesso.");
      } else {
        const created = await createComissaoIndicador(payload);
        setComissoes((prev) => [created, ...prev]);
        success("Comissão cadastrada com sucesso.");
      }

      setIsFormOpen(false);
      setFormData(emptyForm);
      setEditingId(null);
    } catch {
      error("Não foi possível salvar a comissão.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { deleteComissaoIndicador } = await import("@/repositories/client/comissoes-indicadores.repository");
      await deleteComissaoIndicador(id);
      setComissoes((prev) => prev.filter((c) => c.id !== id));
      success("Comissão excluída com sucesso.");
    } catch {
      error("Não foi possível excluir a comissão.");
    }
  };

  const refresh = async () => {
    await loadComissoes();
  };

  return {
    comissoes,
    resumo,
    isLoading,
    isSaving,
    errorMessage,
    formData,
    setFormData,
    isFormOpen,
    setIsFormOpen,
    editingId,
    openCreate,
    openEdit,
    handleSubmit,
    handleDelete,
    refresh,
    loadComissoes,
  };
}
