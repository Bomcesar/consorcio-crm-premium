import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { LoteriaFederal, LoteriaFederalInsert } from "@/repositories/client/loteria-lances.repository";

const emptyForm: LoteriaFederalInsert = {
  numero_extracao: 0,
  data: "",
  resultado: "",
  grupo: "",
  cota: 0,
  cliente_id: null,
  usuario_id: "",
};

export function useLoteriaFederal() {
  const { success, error } = useToast();
  const [extractions, setExtractions] = useState<LoteriaFederal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<LoteriaFederalInsert>(emptyForm);
  const [selectedExtraction, setSelectedExtraction] = useState<LoteriaFederal | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const loadExtractions = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { getLoteriaFederal } = await import("@/repositories/client/loteria-lances.repository");
      const data = await getLoteriaFederal();
      setExtractions(data);
    } catch {
      setErrorMessage("Não foi possível carregar os resultados da Loteria Federal.");
      error("Não foi possível carregar os resultados da Loteria Federal.");
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  const openCreate = () => {
    setSelectedExtraction(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (extraction: LoteriaFederal) => {
    setSelectedExtraction(extraction);
    setFormData({
      id: extraction.id,
      numero_extracao: extraction.numero_extracao,
      data: extraction.data,
      resultado: extraction.resultado,
      grupo: extraction.grupo,
      cota: extraction.cota,
      cliente_id: extraction.cliente_id,
      usuario_id: extraction.usuario_id,
      created_at: extraction.created_at,
      updated_at: extraction.updated_at,
    });
    setIsFormOpen(true);
  };

  const openDelete = (extraction: LoteriaFederal) => {
    setSelectedExtraction(extraction);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.numero_extracao && !selectedExtraction) return;

    setIsSaving(true);
    try {
      const payload: LoteriaFederalInsert = {
        numero_extracao: Number(formData.numero_extracao) || 0,
        data: formData.data,
        resultado: formData.resultado?.trim() || "",
        grupo: formData.grupo?.trim() || "",
        cota: Number(formData.cota) || 0,
        cliente_id: formData.cliente_id || null,
        usuario_id: formData.usuario_id,
      };

      const { createLoteriaFederal, updateLoteriaFederal } = await import("@/repositories/client/loteria-lances.repository");

      if (selectedExtraction) {
        const updated = await updateLoteriaFederal(selectedExtraction.id, payload);
        setExtractions((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        success("Resultado da Loteria Federal atualizado com sucesso.");
      } else {
        const created = await createLoteriaFederal(payload);
        setExtractions((prev) => [created, ...prev]);
        success("Resultado da Loteria Federal cadastrado com sucesso.");
      }
      setIsFormOpen(false);
      setFormData(emptyForm);
      setSelectedExtraction(null);
    } catch {
      error("Não foi possível salvar o resultado da Loteria Federal.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedExtraction) return;
    try {
      const { deleteLoteriaFederal } = await import("@/repositories/client/loteria-lances.repository");
      await deleteLoteriaFederal(selectedExtraction.id);
      setExtractions((prev) => prev.filter((e) => e.id !== selectedExtraction.id));
      success("Resultado da Loteria Federal excluído com sucesso.");
      setIsDeleteOpen(false);
      setSelectedExtraction(null);
    } catch {
      error("Não foi possível excluir o resultado da Loteria Federal.");
    }
  };

  const refresh = async () => {
    await loadExtractions();
  };

  useEffect(() => {
    void loadExtractions();
  }, [loadExtractions]);

  return {
    extractions,
    isLoading,
    isSaving,
    errorMessage,
    formData,
    setFormData,
    selectedExtraction,
    setSelectedExtraction,
    isFormOpen,
    setIsFormOpen,
    isDeleteOpen,
    setIsDeleteOpen,
    openCreate,
    openEdit,
    openDelete,
    handleSubmit,
    handleDelete,
    refresh,
  };
}
