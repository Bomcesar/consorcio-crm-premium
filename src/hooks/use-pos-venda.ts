import { useCallback, useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import type { PosVenda, PosVendaInsert, PosVendaHistorico, PosVendaTarefa, PosVendaTarefaInsert, PosVendaTarefaUpdate, PosVendaComunicacao, PosVendaComunicacaoInsert, PosVendaComunicacaoUpdate, PosVendaWithRelations } from "@/repositories/client/pos-venda.repository";

const emptyForm: PosVendaInsert = {
  status: "Boas-vindas",
  priority: "normal",
  satisfaction: 0,
  channel: "WhatsApp",
  needs_attention: false,
  observacoes: "",
  cliente_id: "",
  agenda_id: null,
  next_contact_at: null,
  last_contact_at: null,
  boleto_url: "",
  lembrete_em: null,
  retencao_motivo: "",
  retencao_data: null,
};

export function usePosVenda() {
  const { success, error } = useToast();
  const [posVendas, setPosVendas] = useState<PosVendaWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<PosVendaInsert>(emptyForm);
  const [selectedPosVenda, setSelectedPosVenda] = useState<PosVenda | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [historico, setHistorico] = useState<PosVendaHistorico[]>([]);
  const [tarefas, setTarefas] = useState<PosVendaTarefa[]>([]);
  const [comunicacoes, setComunicacoes] = useState<PosVendaComunicacao[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [isCommsLoading, setIsCommsLoading] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteSearchResults, setClienteSearchResults] = useState<{ id: string; nome: string; telefone: string; status: string }[]>([]);
  const [isClienteSearchLoading, setIsClienteSearchLoading] = useState(false);

  const errorRef = useRef(error);
  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  const loadPosVendas = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { getPosVendas } = await import("@/repositories/client/pos-venda.repository");
      const data = await getPosVendas();
      setPosVendas(data);
    } catch {
      setErrorMessage("Não foi possível carregar as ações de pós-venda.");
      errorRef.current("Não foi possível carregar as ações de pós-venda.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadHistorico = useCallback(async (posVendaId: string) => {
    setIsHistoryLoading(true);
    try {
      const { getPosVendaHistorico } = await import("@/repositories/client/pos-venda.repository");
      const data = await getPosVendaHistorico(posVendaId);
      setHistorico(data);
    } catch {
      errorRef.current("Não foi possível carregar o histórico.");
      setHistorico([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const loadTarefas = useCallback(async (posVendaId: string) => {
    setIsTasksLoading(true);
    try {
      const { getPosVendaTarefas } = await import("@/repositories/client/pos-venda.repository");
      const data = await getPosVendaTarefas(posVendaId);
      setTarefas(data);
    } catch {
      errorRef.current("Não foi possível carregar as tarefas.");
      setTarefas([]);
    } finally {
      setIsTasksLoading(false);
    }
  }, []);

  const loadComunicacoes = useCallback(async (posVendaId: string) => {
    setIsCommsLoading(true);
    try {
      const { getPosVendaComunicacoes } = await import("@/repositories/client/pos-venda.repository");
      const data = await getPosVendaComunicacoes(posVendaId);
      setComunicacoes(data);
    } catch {
      errorRef.current("Não foi possível carregar as comunicações.");
      setComunicacoes([]);
    } finally {
      setIsCommsLoading(false);
    }
  }, []);

  const searchClientes = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setClienteSearchResults([]);
      return;
    }
    setIsClienteSearchLoading(true);
    try {
      const { searchClientes: buscar } = await import("@/repositories/client/clientes.repository");
      const data = await buscar(trimmed);
      setClienteSearchResults(
        data.map((c) => ({
          id: c.id,
          nome: c.nome,
          telefone: c.telefone,
          status: c.status,
        })),
      );
    } catch {
      errorRef.current("Não foi possível pesquisar os clientes.");
      setClienteSearchResults([]);
    } finally {
      setIsClienteSearchLoading(false);
    }
  }, []);

  const openCreate = () => {
    setSelectedPosVenda(null);
    setFormData(emptyForm);
    setHistorico([]);
    setTarefas([]);
    setComunicacoes([]);
    setClienteSearch("");
    setClienteSearchResults([]);
    setIsFormOpen(true);
  };

  const openEdit = (posVenda: PosVenda) => {
    setSelectedPosVenda(posVenda);
    setFormData({
      id: posVenda.id,
      status: posVenda.status,
      priority: posVenda.priority,
      satisfaction: posVenda.satisfaction,
      next_contact_at: posVenda.next_contact_at,
      last_contact_at: posVenda.last_contact_at,
      channel: posVenda.channel,
      needs_attention: posVenda.needs_attention,
      observacoes: posVenda.observacoes,
      cliente_id: posVenda.cliente_id,
      agenda_id: posVenda.agenda_id,
      boleto_url: posVenda.boleto_url,
      lembrete_em: posVenda.lembrete_em,
      retencao_motivo: posVenda.retencao_motivo,
      retencao_data: posVenda.retencao_data,
      created_at: posVenda.created_at,
      updated_at: posVenda.updated_at,
      usuario_id: posVenda.usuario_id,
    });
    setClienteSearchResults([]);
    setIsFormOpen(true);
    setIsDetailsOpen(false);
    void loadHistorico(posVenda.id);
    void loadTarefas(posVenda.id);
    void loadComunicacoes(posVenda.id);
  };

  const openDelete = (posVenda: PosVenda) => {
    setSelectedPosVenda(posVenda);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.observacoes?.trim() && !formData.status?.trim()) return;
    if (!formData.cliente_id) {
      error("Selecione um cliente antes de salvar.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: PosVendaInsert = {
        status: formData.status || "Boas-vindas",
        priority: formData.priority || "normal",
        satisfaction: formData.satisfaction ?? 0,
        channel: formData.channel || "WhatsApp",
        needs_attention: formData.needs_attention ?? false,
        observacoes: formData.observacoes?.trim() || "",
        cliente_id: formData.cliente_id || "",
        agenda_id: formData.agenda_id || null,
        next_contact_at: formData.next_contact_at || null,
        last_contact_at: formData.last_contact_at || null,
        boleto_url: formData.boleto_url?.trim() || "",
        lembrete_em: formData.lembrete_em || null,
        retencao_motivo: formData.retencao_motivo?.trim() || "",
        retencao_data: formData.retencao_data || null,
      };

      const { createPosVenda, updatePosVenda } = await import("@/repositories/client/pos-venda.repository");

      if (selectedPosVenda) {
        const updated = await updatePosVenda(selectedPosVenda.id, payload);
        setPosVendas((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        success("Ação de pós-venda atualizada com sucesso.");
      } else {
        const created = await createPosVenda(payload);
        setPosVendas((prev) => [created, ...prev]);
        success("Ação de pós-venda cadastrada com sucesso.");
      }
      setIsFormOpen(false);
      setFormData(emptyForm);
      setSelectedPosVenda(null);
      setClienteSearch("");
      setClienteSearchResults([]);
    } catch (err) {
      console.error("[PosVenda] handleSubmit error:", err);
      error("Não foi possível salvar a ação de pós-venda.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPosVenda) return;
    try {
      const { deletePosVenda } = await import("@/repositories/client/pos-venda.repository");
      await deletePosVenda(selectedPosVenda.id);
      setPosVendas((prev) => prev.filter((p) => p.id !== selectedPosVenda.id));
      success("Ação de pós-venda excluída com sucesso.");
      setIsDeleteOpen(false);
      setSelectedPosVenda(null);
    } catch {
      error("Não foi possível excluir a ação de pós-venda.");
    }
  };

  const addHistorico = async (posVendaId: string, payload: { tipo?: string; descricao?: string }) => {
    try {
      const { addPosVendaHistorico } = await import("@/repositories/client/pos-venda.repository");
      const item = await addPosVendaHistorico(posVendaId, payload);
      setHistorico((prev) => [item, ...prev]);
      success("Histórico adicionado.");
      return item;
    } catch {
      error("Não foi possível adicionar histórico.");
      throw new Error("Falha ao adicionar histórico.");
    }
  };

  const addTarefa = async (payload: PosVendaTarefaInsert) => {
    try {
      const { createPosVendaTarefa } = await import("@/repositories/client/pos-venda.repository");
      const item = await createPosVendaTarefa(payload);
      setTarefas((prev) => [...prev, item]);
      success("Tarefa adicionada.");
      return item;
    } catch {
      error("Não foi possível adicionar tarefa.");
      throw new Error("Falha ao adicionar tarefa.");
    }
  };

  const updateTarefa = async (id: string, payload: PosVendaTarefaUpdate) => {
    try {
      const { updatePosVendaTarefa } = await import("@/repositories/client/pos-venda.repository");
      const item = await updatePosVendaTarefa(id, payload);
      setTarefas((prev) => prev.map((t) => (t.id === item.id ? item : t)));
      success("Tarefa atualizada.");
      return item;
    } catch {
      error("Não foi possível atualizar tarefa.");
      throw new Error("Falha ao atualizar tarefa.");
    }
  };

  const deleteTarefa = async (id: string) => {
    try {
      const { deletePosVendaTarefa } = await import("@/repositories/client/pos-venda.repository");
      await deletePosVendaTarefa(id);
      setTarefas((prev) => prev.filter((t) => t.id !== id));
      success("Tarefa excluída.");
    } catch {
      error("Não foi possível excluir tarefa.");
    }
  };

  const addComunicacao = async (payload: PosVendaComunicacaoInsert) => {
    try {
      const { createPosVendaComunicacao } = await import("@/repositories/client/pos-venda.repository");
      const item = await createPosVendaComunicacao(payload);
      setComunicacoes((prev) => [item, ...prev]);
      success("Comunicação registrada.");
      return item;
    } catch {
      error("Não foi possível registrar comunicação.");
      throw new Error("Falha ao registrar comunicação.");
    }
  };

  const refresh = async () => {
    await loadPosVendas();
  };

  useEffect(() => {
    void loadPosVendas();
  }, [loadPosVendas]);

  return {
    posVendas,
    isLoading,
    isSaving,
    errorMessage,
    formData,
    setFormData,
    selectedPosVenda,
    setSelectedPosVenda,
    isFormOpen,
    setIsFormOpen,
    isDeleteOpen,
    setIsDeleteOpen,
    isDetailsOpen,
    setIsDetailsOpen,
    historico,
    tarefas,
    comunicacoes,
    isHistoryLoading,
    isTasksLoading,
    isCommsLoading,
    clienteSearch,
    setClienteSearch,
    clienteSearchResults,
    setClienteSearchResults,
    isClienteSearchLoading,
    searchClientes,
    openCreate,
    openEdit,
    openDelete,
    handleSubmit,
    handleDelete,
    addHistorico,
    addTarefa,
    updateTarefa,
    deleteTarefa,
    addComunicacao,
    refresh,
    loadHistorico,
    loadTarefas,
    loadComunicacoes,
  };
}
