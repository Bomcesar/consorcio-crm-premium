import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Treinamento, TreinamentoInsert } from "@/repositories/client/treinamentos.repository";

const emptyForm: TreinamentoInsert = {
  nome: "",
  descricao: "",
  categoria: "",
  link: "",
  status: "Ativo",
  usuario_id: "",
};

export function useTreinamentos() {
  const { success, error } = useToast();
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<TreinamentoInsert>(emptyForm);
  const [selectedTreinamento, setSelectedTreinamento] = useState<Treinamento | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");

  const errorRef = useRef(error);
  errorRef.current = error;

  const loadTreinamentos = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { getTreinamentos } = await import("@/repositories/client/treinamentos.repository");
      const data = await getTreinamentos();
      setTreinamentos(data);
    } catch {
      setErrorMessage("Não foi possível carregar os treinamentos.");
      errorRef.current("Não foi possível carregar os treinamentos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTreinamentos();
  }, []);

  const openCreate = () => {
    setSelectedTreinamento(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (treinamento: Treinamento) => {
    setSelectedTreinamento(treinamento);
    setFormData({
      id: treinamento.id,
      nome: treinamento.nome,
      descricao: treinamento.descricao,
      categoria: treinamento.categoria,
      link: treinamento.link,
      status: treinamento.status,
      usuario_id: treinamento.usuario_id,
      created_at: treinamento.created_at,
      updated_at: treinamento.updated_at,
    });
    setIsFormOpen(true);
  };

  const openDelete = (treinamento: Treinamento) => {
    setSelectedTreinamento(treinamento);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!(formData.nome?.trim()) && !selectedTreinamento) return;

    setIsSaving(true);
    try {
      const payload: TreinamentoInsert = {
        nome: formData.nome?.trim() || "",
        descricao: formData.descricao?.trim() || "",
        categoria: formData.categoria?.trim() || "",
        link: formData.link?.trim() || "",
        status: formData.status,
        usuario_id: formData.usuario_id,
      };

      console.log("[Treinamento] submit payload", payload);

      const { createTreinamento, updateTreinamento } = await import("@/repositories/client/treinamentos.repository");

      if (selectedTreinamento) {
        const updated = await updateTreinamento(selectedTreinamento.id, payload);
        console.log("[Treinamento] updated", updated);
        setTreinamentos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        success("Treinamento atualizado com sucesso.");
      } else {
        const created = await createTreinamento(payload);
        console.log("[Treinamento] created", created);
        setTreinamentos((prev) => [created, ...prev]);
        success("Treinamento cadastrado com sucesso.");
      }
      await loadTreinamentos();
      setIsFormOpen(false);
      setFormData(emptyForm);
      setSelectedTreinamento(null);
    } catch (e) {
      console.error("[Treinamento] submit error", e);
      error("Não foi possível salvar o treinamento.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTreinamento) return;
    try {
      const { deleteTreinamento } = await import("@/repositories/client/treinamentos.repository");
      await deleteTreinamento(selectedTreinamento.id);
      console.log("[Treinamento] deleted", selectedTreinamento.id);
      await loadTreinamentos();
      success("Treinamento excluído com sucesso.");
      setIsDeleteOpen(false);
      setSelectedTreinamento(null);
    } catch (e) {
      console.error("[Treinamento] delete error", e);
      error("Não foi possível excluir o treinamento.");
    }
  };

  const filteredTreinamentos = treinamentos.filter((t) => {
    const matchesSearch = t.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.descricao.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategoria = filterCategoria === "" || t.categoria === filterCategoria;
    return matchesSearch && matchesCategoria;
  });

  const categorias = Array.from(new Set(treinamentos.map((t) => t.categoria)));

  return {
    treinamentos: filteredTreinamentos,
    allTreinamentos: treinamentos,
    isLoading,
    isSaving,
    errorMessage,
    formData,
    setFormData,
    selectedTreinamento,
    setSelectedTreinamento,
    isFormOpen,
    setIsFormOpen,
    isDeleteOpen,
    setIsDeleteOpen,
    searchQuery,
    setSearchQuery,
    filterCategoria,
    setFilterCategoria,
    categorias,
    openCreate,
    openEdit,
    openDelete,
    handleSubmit,
    handleDelete,
    refresh: loadTreinamentos,
  };
}
