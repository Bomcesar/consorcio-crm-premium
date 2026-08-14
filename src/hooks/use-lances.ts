import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Lance, LanceInsert } from "@/repositories/client/loteria-lances.repository";

const emptyForm: LanceInsert = {
  valor: 0,
  percentual: 0,
  data: "",
  assembleia_id: null,
  grupo: "",
  cota: 0,
  cliente_id: null,
  resultado: "",
  status: "Aguardando",
  usuario_id: "",
};

export function useLances() {
  const { success, error } = useToast();
  const [lances, setLances] = useState<Lance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<LanceInsert>(emptyForm);
  const [selectedLance, setSelectedLance] = useState<Lance | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const loadLances = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { getLances } = await import("@/repositories/client/loteria-lances.repository");
      const data = await getLances();
      setLances(data);
    } catch {
      setErrorMessage("Não foi possível carregar os lances.");
      error("Não foi possível carregar os lances.");
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  const openCreate = () => {
    setSelectedLance(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (lance: Lance) => {
    setSelectedLance(lance);
    setFormData({
      id: lance.id,
      valor: lance.valor,
      percentual: lance.percentual,
      data: lance.data,
      assembleia_id: lance.assembleia_id,
      grupo: lance.grupo,
      cota: lance.cota,
      cliente_id: lance.cliente_id,
      resultado: lance.resultado,
      status: lance.status,
      usuario_id: lance.usuario_id,
      created_at: lance.created_at,
      updated_at: lance.updated_at,
    });
    setIsFormOpen(true);
  };

  const openDelete = (lance: Lance) => {
    setSelectedLance(lance);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.grupo?.trim() && !selectedLance) return;

    setIsSaving(true);
    try {
      const payload: LanceInsert = {
        valor: Number(formData.valor) || 0,
        percentual: Number(formData.percentual) || 0,
        data: formData.data,
        assembleia_id: formData.assembleia_id || null,
        grupo: formData.grupo?.trim() || "",
        cota: Number(formData.cota) || 0,
        cliente_id: formData.cliente_id || null,
        resultado: formData.resultado?.trim() || "",
        status: formData.status,
        usuario_id: formData.usuario_id,
      };

      const { createLance, updateLance } = await import("@/repositories/client/loteria-lances.repository");

      if (selectedLance) {
        const updated = await updateLance(selectedLance.id, payload);
        setLances((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
        success("Lance atualizado com sucesso.");
      } else {
        const created = await createLance(payload);
        setLances((prev) => [created, ...prev]);
        success("Lance cadastrado com sucesso.");
      }
      setIsFormOpen(false);
      setFormData(emptyForm);
      setSelectedLance(null);
    } catch {
      error("Não foi possível salvar o lance.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedLance) return;
    try {
      const { deleteLance } = await import("@/repositories/client/loteria-lances.repository");
      await deleteLance(selectedLance.id);
      setLances((prev) => prev.filter((l) => l.id !== selectedLance.id));
      success("Lance excluído com sucesso.");
      setIsDeleteOpen(false);
      setSelectedLance(null);
    } catch {
      error("Não foi possível excluir o lance.");
    }
  };

  const refresh = async () => {
    await loadLances();
  };

  useEffect(() => {
    void loadLances();
  }, [loadLances]);

  return {
    lances,
    isLoading,
    isSaving,
    errorMessage,
    formData,
    setFormData,
    selectedLance,
    setSelectedLance,
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
