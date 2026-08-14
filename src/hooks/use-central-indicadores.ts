"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Indicador } from "@/repositories/indicadores.repository";
import type { ContatoIndicado } from "@/repositories/contatos-indicados.repository";
import type { ComissaoIndicador } from "@/repositories/comissoes-indicadores.repository";
import type { IndicadorHistorico } from "@/repositories/client/indicadores.repository";
import { getIndicadores, getIndicador, createIndicador, updateIndicador, deleteIndicador, getIndicadorHistorico, addIndicadorHistorico } from "@/repositories/client/indicadores.repository";
import { getContatosIndicados, getContatoIndicado, createContatoIndicado, updateContatoIndicado, deleteContatoIndicado } from "@/repositories/client/contatos-indicados.repository";
import { getComissoesIndicadores, getComissaoIndicador, createComissaoIndicador, updateComissaoIndicador, deleteComissaoIndicador } from "@/repositories/client/comissoes-indicadores.repository";

const emptyForm = {
  nome: "",
  telefone: "",
  email: "",
  cidade: "",
  estado: "",
  cpf: "",
  pix: "",
  origem: "",
  status: "Ativo" as Indicador["status"],
  observacoes: "",
  ativo: true,
};

const emptyContactForm = {
  nome: "",
  telefone: "",
  cidade: "",
  status: "Novo" as ContatoIndicado["status"],
  observacoes: "",
};

const emptyHistoricoForm = {
  tipo: "observacao" as IndicadorHistorico["tipo"],
  descricao: "",
};

export function useCentralIndicadores() {
  const { success, error } = useToast();

  const [indicators, setIndicators] = useState<Indicador[]>([]);
  const [contacts, setContacts] = useState<ContatoIndicado[]>([]);
  const [commissions, setCommissions] = useState<ComissaoIndicador[]>([]);
  const [historico, setHistorico] = useState<IndicadorHistorico[]>([]);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [isContactsLoading, setIsContactsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [contactFormData, setContactFormData] = useState(emptyContactForm);
  const [historicoForm, setHistoricoForm] = useState(emptyHistoricoForm);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isContactSaving, setIsContactSaving] = useState(false);
  const [isHistoricoSaving, setIsHistoricoSaving] = useState(false);

  const summary = useMemo(() => {
    const totalIndicadores = indicators.length;
    const indicadoresAtivos = indicators.filter((indicator) => indicator.ativo).length;
    const totalContatos = contacts.length;
    const reunioes = indicators.filter((indicator) => ["Ativo", "Em andamento"].includes(indicator.status)).length;
    const conversoes = indicators.filter((indicator) => ["Fechado", "Aprovado", "Concluído"].includes(indicator.status)).length;
    const valorComissoesPagas = commissions
      .filter((commission) => commission.status === "Paga")
      .reduce((sum, commission) => sum + Number(commission.valor ?? 0), 0);
    const valorComissoesPendentes = commissions
      .filter((commission) => commission.status !== "Paga")
      .reduce((sum, commission) => sum + Number(commission.valor ?? 0), 0);

    return {
      totalIndicadores,
      indicadoresAtivos,
      totalContatos,
      reunioes,
      conversoes,
      valorComissoesPagas: Math.round(valorComissoesPagas * 100) / 100,
      valorComissoesPendentes: Math.round(valorComissoesPendentes * 100) / 100,
    };
  }, [indicators, contacts, commissions]);

  const ranking = useMemo(() => {
    const contactsByIndicator = contacts.reduce<Record<string, number>>((accumulator, contact) => {
      const key = contact.indicador_id;
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});

    const commissionsByIndicator = commissions.reduce<Record<string, Array<{ status: string; valor: number }>>>((accumulator, commission) => {
      const key = commission.indicador_id;
      accumulator[key] = [...(accumulator[key] ?? []), commission];
      return accumulator;
    }, {});

    return indicators
      .map((indicator) => {
        const contactsCount = contactsByIndicator[indicator.id] ?? 0;
        const commissionsForIndicator = commissionsByIndicator[indicator.id] ?? [];
        const vendas = commissionsForIndicator.filter((commission) => commission.status === "Pago").length;
        const conversao = contactsCount > 0 ? Math.round((vendas / contactsCount) * 100) : 0;

        return {
          id: indicator.id,
          nome: indicator.nome || "Indicador sem nome",
          vendas,
          conversao,
        };
      })
      .sort((left, right) => right.vendas - left.vendas || right.conversao - left.conversao);
  }, [indicators, contacts, commissions]);

  const loadIndicators = async () => {
    setIsLoading(true);
    try {
      const data = await getIndicadores();
      setIndicators(data);
    } catch {
      error("Não foi possível carregar os indicadores.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadContacts = async (indicatorId: string) => {
    setIsContactsLoading(true);
    try {
      const data = await getContatosIndicados(indicatorId);
      setContacts(data);
    } catch {
      error("Não foi possível carregar os contatos.");
      setContacts([]);
    } finally {
      setIsContactsLoading(false);
    }
  };

  const loadCommissions = async (_indicatorId: string) => {
    try {
      const data = await getComissoesIndicadores({});
      setCommissions(data);
    } catch {
      error("Não foi possível carregar as comissões.");
      setCommissions([]);
    }
  };

  const loadHistorico = async (indicadorId: string) => {
    setIsHistoryLoading(true);
    try {
      const data = await getIndicadorHistorico(indicadorId);
      setHistorico(data);
    } catch {
      error("Não foi possível carregar o histórico.");
      setHistorico([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleOpenContacts = async (indicatorId: string) => {
    setSelectedIndicatorId(indicatorId);
    await Promise.all([loadContacts(indicatorId), loadCommissions(indicatorId), loadHistorico(indicatorId)]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.nome.trim()) return;

    setIsSaving(true);
    try {
      const payload = {
        nome: formData.nome.trim(),
        telefone: formData.telefone.trim(),
        email: formData.email.trim(),
        cidade: formData.cidade.trim(),
        estado: formData.estado.trim(),
        cpf: formData.cpf.trim(),
        pix: formData.pix.trim(),
        origem: formData.origem.trim(),
        status: formData.status,
        observacoes: formData.observacoes.trim(),
        ativo: formData.ativo,
      };
      const created = await createIndicador(payload);
      setIndicators((current) => [created, ...current]);
      setFormData(emptyForm);
      setIsFormOpen(false);
      success("Indicador salvo com sucesso.");
    } catch {
      error("Não foi possível salvar o indicador. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveContact = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedIndicatorId || !contactFormData.nome.trim()) return;

    setIsContactSaving(true);
    try {
      if (editingContactId) {
        const updated = await updateContatoIndicado(editingContactId, contactFormData);
        setContacts((current) =>
          current.map((contact) =>
            contact.id === editingContactId ? { ...contact, ...updated } : contact,
          ),
        );
        success("Contato atualizado com sucesso.");
      } else {
        const created = await createContatoIndicado({
          ...contactFormData,
          indicador_id: selectedIndicatorId,
        });
        setContacts((current) => [created, ...current]);
        success("Contato salvo com sucesso.");
      }
      setContactFormData(emptyContactForm);
      setEditingContactId(null);
      setIsContactFormOpen(false);
    } catch {
      error("Não foi possível salvar o contato. Tente novamente.");
    } finally {
      setIsContactSaving(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!selectedIndicatorId) return;
    try {
      await deleteContatoIndicado(contactId);
      setContacts((current) => current.filter((contact) => contact.id !== contactId));
      success("Contato excluído com sucesso.");
    } catch {
      error("Não foi possível excluir o contato.");
    }
  };

  const handleMarkCommissionAsPaid = async (commissionId: string) => {
    try {
      const updated = await updateComissaoIndicador(commissionId, {
        status: "Paga",
        data_pagamento: new Date().toISOString().slice(0, 10),
      });
      setCommissions((current) =>
        current.map((commission) =>
          commission.id === commissionId ? { ...commission, ...updated } : commission,
        ),
      );
      success("Comissão marcada como paga.");
    } catch {
      error("Não foi possível atualizar a comissão.");
    }
  };

  const handleAddHistorico = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedIndicatorId || !historicoForm.descricao.trim()) return;
    setIsHistoricoSaving(true);
    try {
      const item = await addIndicadorHistorico(selectedIndicatorId, historicoForm);
      setHistorico((prev) => [item, ...prev]);
      setHistoricoForm(emptyHistoricoForm);
      success("Histórico adicionado com sucesso.");
    } catch {
      error("Não foi possível adicionar histórico.");
    } finally {
      setIsHistoricoSaving(false);
    }
  };

  return {
    indicators,
    contacts,
    commissions,
    historico,
    selectedIndicatorId,
    isFormOpen,
    isContactFormOpen,
    isContactsLoading,
    isLoading,
    isHistoryLoading,
    formData,
    contactFormData,
    historicoForm,
    editingContactId,
    isSaving,
    isContactSaving,
    isHistoricoSaving,
    summary,
    ranking,
    setIndicators,
    setContacts,
    setCommissions,
    setHistorico,
    setFormData,
    setContactFormData,
    setHistoricoForm,
    setEditingContactId,
    setIsFormOpen,
    setIsContactFormOpen,
    setSelectedIndicatorId,
    loadIndicators,
    loadContacts,
    loadCommissions,
    loadHistorico,
    handleOpenContacts,
    handleSubmit,
    handleSaveContact,
    handleDeleteContact,
    handleMarkCommissionAsPaid,
    handleAddHistorico,
    success,
    error,
  };
}
