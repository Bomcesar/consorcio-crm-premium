import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { MaterialConsultor, MaterialConsultorInsert } from "@/repositories/client/materiais-consultores.repository";

const emptyForm: MaterialConsultorInsert = {
  titulo: "",
  descricao: "",
  categoria: "",
  arquivo_url: "",
  arquivo_nome: "",
  arquivo_tamanho: 0,
  arquivo_mime_type: "",
  tipo: "Documento",
  status: "Ativo",
  permite_download: true,
  usuario_id: "",
};

export function useMateriaisConsultores() {
  const { success, error } = useToast();
  const [materiais, setMateriais] = useState<MaterialConsultor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<MaterialConsultorInsert>(emptyForm);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialConsultor | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");

  const loadMateriais = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { getMateriaisConsultores } = await import("@/repositories/client/materiais-consultores.repository");
      const data = await getMateriaisConsultores();
      setMateriais(data);
    } catch {
      setErrorMessage("Não foi possível carregar os materiais.");
      error("Não foi possível carregar os materiais.");
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  const openCreate = () => {
    setSelectedMaterial(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (material: MaterialConsultor) => {
    setSelectedMaterial(material);
    setFormData({
      id: material.id,
      titulo: material.titulo,
      descricao: material.descricao,
      categoria: material.categoria,
      arquivo_url: material.arquivo_url,
      arquivo_nome: material.arquivo_nome,
      arquivo_tamanho: material.arquivo_tamanho,
      arquivo_mime_type: material.arquivo_mime_type,
      tipo: material.tipo,
      status: material.status,
      permite_download: material.permite_download,
      usuario_id: material.usuario_id,
      created_at: material.created_at,
      updated_at: material.updated_at,
    });
    setIsFormOpen(true);
  };

  const openDelete = (material: MaterialConsultor) => {
    setSelectedMaterial(material);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!(formData.titulo?.trim()) && !selectedMaterial) return;

    setIsSaving(true);
    try {
      const payload: MaterialConsultorInsert = {
        titulo: formData.titulo?.trim() || "",
        descricao: formData.descricao?.trim() || "",
        categoria: formData.categoria?.trim() || "",
        arquivo_url: formData.arquivo_url?.trim() || "",
        arquivo_nome: formData.arquivo_nome?.trim() || "",
        arquivo_tamanho: Number(formData.arquivo_tamanho) || 0,
        arquivo_mime_type: formData.arquivo_mime_type?.trim() || "",
        tipo: formData.tipo,
        status: formData.status,
        permite_download: formData.permite_download,
        usuario_id: formData.usuario_id,
      };

      const { createMaterialConsultor, updateMaterialConsultor } = await import("@/repositories/client/materiais-consultores.repository");

      if (selectedMaterial) {
        const updated = await updateMaterialConsultor(selectedMaterial.id, payload);
        setMateriais((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        success("Material atualizado com sucesso.");
      } else {
        const created = await createMaterialConsultor(payload);
        setMateriais((prev) => [created, ...prev]);
        success("Material cadastrado com sucesso.");
      }
      setIsFormOpen(false);
      setFormData(emptyForm);
      setSelectedMaterial(null);
    } catch {
      error("Não foi possível salvar o material.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMaterial) return;
    try {
      const { deleteMaterialConsultor } = await import("@/repositories/client/materiais-consultores.repository");
      await deleteMaterialConsultor(selectedMaterial.id);
      setMateriais((prev) => prev.filter((m) => m.id !== selectedMaterial.id));
      success("Material excluído com sucesso.");
      setIsDeleteOpen(false);
      setSelectedMaterial(null);
    } catch {
      error("Não foi possível excluir o material.");
    }
  };

  const filteredMateriais = materiais.filter((m) => {
    const matchesSearch = m.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.descricao.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategoria = filterCategoria === "" || m.categoria === filterCategoria;
    return matchesSearch && matchesCategoria && m.status === "Ativo";
  });

  const categorias = Array.from(new Set(materiais.filter((m) => m.status === "Ativo").map((m) => m.categoria)));

  const refresh = async () => {
    await loadMateriais();
  };

  useEffect(() => {
    void loadMateriais();
  }, [loadMateriais]);

  return {
    materiais: filteredMateriais,
    allMateriais: materiais,
    isLoading,
    isSaving,
    errorMessage,
    formData,
    setFormData,
    selectedMaterial,
    setSelectedMaterial,
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
    refresh,
  };
}
