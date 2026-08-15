import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Recrutamento, RecrutamentoInsert } from "@/repositories/client/recrutamento.repository";

const emptyForm: RecrutamentoInsert = {
  nome: "",
  email: "",
  telefone: "",
  origem: "",
  status: "Novo",
  observacoes: "",
  usuario_id: "",
};

export function useRecrutamento() {
  const { success, error } = useToast();
  const [candidatos, setCandidatos] = useState<Recrutamento[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<RecrutamentoInsert>(emptyForm);
  const [selected, setSelected] = useState<Recrutamento | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const errorRef = useRef(error);
  errorRef.current = error;

  const load = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { getRecrutamentos } = await import("@/repositories/client/recrutamento.repository");
      const data = await getRecrutamentos();
      setCandidatos(data);
    } catch {
      setErrorMessage("Não foi possível carregar os candidatos.");
      errorRef.current("Não foi possível carregar os candidatos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setSelected(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (item: Recrutamento) => {
    setSelected(item);
    setFormData({
      id: item.id,
      nome: item.nome,
      email: item.email,
      telefone: item.telefone,
      origem: item.origem,
      status: item.status,
      observacoes: item.observacoes,
      usuario_id: item.usuario_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
    });
    setIsFormOpen(true);
  };

  const openDelete = (item: Recrutamento) => {
    setSelected(item);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!(formData.nome?.trim()) && !selected) return;

    setIsSaving(true);
    try {
      const payload: RecrutamentoInsert = {
        nome: formData.nome?.trim() || "",
        email: formData.email?.trim() || "",
        telefone: formData.telefone?.trim() || "",
        origem: formData.origem?.trim() || "",
        status: formData.status,
        observacoes: formData.observacoes?.trim() || "",
        usuario_id: formData.usuario_id,
      };

      console.log("[Recrutamento] submit payload", payload);

      const { createRecrutamento, updateRecrutamento } = await import("@/repositories/client/recrutamento.repository");

      if (selected) {
        const updated = await updateRecrutamento(selected.id, payload);
        console.log("[Recrutamento] updated", updated);
        setCandidatos((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        success("Candidato atualizado com sucesso.");
      } else {
        const created = await createRecrutamento(payload);
        console.log("[Recrutamento] created", created);
        setCandidatos((prev) => [created, ...prev]);
        success("Candidato cadastrado com sucesso.");
      }

      await load();
      setIsFormOpen(false);
      setFormData(emptyForm);
      setSelected(null);
    } catch (e) {
      console.error("[Recrutamento] submit error", e);
      error("Não foi possível salvar o candidato.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      const { deleteRecrutamento } = await import("@/repositories/client/recrutamento.repository");
      await deleteRecrutamento(selected.id);
      console.log("[Recrutamento] deleted", selected.id);
      await load();
      success("Candidato excluído com sucesso.");
      setIsDeleteOpen(false);
      setSelected(null);
    } catch (e) {
      console.error("[Recrutamento] delete error", e);
      error("Não foi possível excluir o candidato.");
    }
  };

  const filtered = candidatos.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.nome.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.origem.toLowerCase().includes(q)
    );
  });

  return {
    candidatos: filtered,
    allCandidatos: candidatos,
    isLoading,
    isSaving,
    errorMessage,
    formData,
    setFormData,
    selected,
    setSelected,
    isFormOpen,
    setIsFormOpen,
    isDeleteOpen,
    setIsDeleteOpen,
    searchQuery,
    setSearchQuery,
    openCreate,
    openEdit,
    openDelete,
    handleSubmit,
    handleDelete,
    refresh: load,
  };
}
