import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Parceiro, ParceiroInsert } from "@/repositories/client/parceiros.repository";

const emptyForm: ParceiroInsert = {
  nome: "",
  cnpj: "",
  contato: "",
  email: "",
  telefone: "",
  tipo: "Administradora",
  status: "Ativo",
  observacoes: "",
  usuario_id: "",
};

export function useParceiros() {
  const { success, error } = useToast();
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<ParceiroInsert>(emptyForm);
  const [selected, setSelected] = useState<Parceiro | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const errorRef = useRef(error);
  errorRef.current = error;

  const load = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { getParceiros } = await import("@/repositories/client/parceiros.repository");
      const data = await getParceiros();
      setParceiros(data);
    } catch {
      setErrorMessage("Não foi possível carregar os parceiros.");
      errorRef.current("Não foi possível carregar os parceiros.");
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

  const openEdit = (item: Parceiro) => {
    setSelected(item);
    setFormData({
      id: item.id,
      nome: item.nome,
      cnpj: item.cnpj,
      contato: item.contato,
      email: item.email,
      telefone: item.telefone,
      tipo: item.tipo,
      status: item.status,
      observacoes: item.observacoes,
      usuario_id: item.usuario_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
    });
    setIsFormOpen(true);
  };

  const openDelete = (item: Parceiro) => {
    setSelected(item);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!(formData.nome?.trim()) && !selected) return;

    setIsSaving(true);
    try {
      const payload: ParceiroInsert = {
        nome: formData.nome?.trim() || "",
        cnpj: formData.cnpj?.trim() || "",
        contato: formData.contato?.trim() || "",
        email: formData.email?.trim() || "",
        telefone: formData.telefone?.trim() || "",
        tipo: formData.tipo,
        status: formData.status,
        observacoes: formData.observacoes?.trim() || "",
        usuario_id: formData.usuario_id,
      };

      console.log("[Parceiro] submit payload", payload);

      const { createParceiro, updateParceiro } = await import("@/repositories/client/parceiros.repository");

      if (selected) {
        const updated = await updateParceiro(selected.id, payload);
        console.log("[Parceiro] updated", updated);
        setParceiros((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        success("Parceiro atualizado com sucesso.");
      } else {
        const created = await createParceiro(payload);
        console.log("[Parceiro] created", created);
        setParceiros((prev) => [created, ...prev]);
        success("Parceiro cadastrado com sucesso.");
      }

      await load();
      setIsFormOpen(false);
      setFormData(emptyForm);
      setSelected(null);
    } catch (e) {
      console.error("[Parceiro] submit error", e);
      error("Não foi possível salvar o parceiro.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      const { deleteParceiro } = await import("@/repositories/client/parceiros.repository");
      await deleteParceiro(selected.id);
      console.log("[Parceiro] deleted", selected.id);
      await load();
      success("Parceiro excluído com sucesso.");
      setIsDeleteOpen(false);
      setSelected(null);
    } catch (e) {
      console.error("[Parceiro] delete error", e);
      error("Não foi possível excluir o parceiro.");
    }
  };

  const filtered = parceiros.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.nome.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.tipo.toLowerCase().includes(q)
    );
  });

  return {
    parceiros: filtered,
    allParceiros: parceiros,
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
