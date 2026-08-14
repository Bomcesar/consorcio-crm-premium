import { useToast } from "@/hooks/use-toast";
import type { Lead, LeadInsert, LeadUpdate, LeadHistorico, LeadAnexo } from "@/repositories/client/leads.repository";

export function useLeads() {
  const { success, error } = useToast();

  const list = async () => {
    try {
      const { getLeads } = await import("@/repositories/client/leads.repository");
      return await getLeads();
    } catch {
      error("Não foi possível carregar os leads.");
      return [] as Lead[];
    }
  };

  const get = async (id: string) => {
    try {
      const { getLead } = await import("@/repositories/client/leads.repository");
      return await getLead(id);
    } catch {
      error("Não foi possível carregar o lead.");
      return null;
    }
  };

  const create = async (data: LeadInsert) => {
    try {
      const { createLead } = await import("@/repositories/client/leads.repository");
      const lead = await createLead(data);
      success("Lead cadastrado com sucesso.");
      return lead;
    } catch {
      error("Não foi possível salvar o lead.");
      throw new Error("Falha ao criar lead.");
    }
  };

  const update = async (id: string, data: LeadUpdate) => {
    try {
      const { updateLead } = await import("@/repositories/client/leads.repository");
      const lead = await updateLead(id, data);
      success("Lead atualizado com sucesso.");
      return lead;
    } catch {
      error("Não foi possível atualizar o lead.");
      throw new Error("Falha ao atualizar lead.");
    }
  };

  const remove = async (id: string) => {
    try {
      const { deleteLead } = await import("@/repositories/client/leads.repository");
      await deleteLead(id);
      success("Lead excluído com sucesso.");
    } catch {
      error("Não foi possível excluir o lead.");
      throw new Error("Falha ao excluir lead.");
    }
  };

  const search = async (query: string) => {
    try {
      const { searchLeads } = await import("@/repositories/client/leads.repository");
      return await searchLeads(query);
    } catch {
      error("Não foi possível pesquisar leads.");
      return [] as Lead[];
    }
  };

  const filterByStatus = async (status: string) => {
    try {
      const { filterLeadsByStatus } = await import("@/repositories/client/leads.repository");
      return await filterLeadsByStatus(status);
    } catch {
      error("Não foi possível filtrar leads.");
      return [] as Lead[];
    }
  };

  const getHistorico = async (leadId: string) => {
    try {
      const { getLeadHistorico } = await import("@/repositories/client/leads.repository");
      return await getLeadHistorico(leadId);
    } catch {
      error("Não foi possível carregar o histórico.");
      return [] as LeadHistorico[];
    }
  };

  const addHistorico = async (leadId: string, payload: { tipo?: string; descricao?: string }) => {
    try {
      const { addLeadHistorico } = await import("@/repositories/client/leads.repository");
      const item = await addLeadHistorico(leadId, payload);
      success("Histórico adicionado.");
      return item;
    } catch {
      error("Não foi possível adicionar histórico.");
      throw new Error("Falha ao adicionar histórico.");
    }
  };

  const getAnexos = async (leadId: string) => {
    try {
      const { getLeadAnexos } = await import("@/repositories/client/leads.repository");
      return await getLeadAnexos(leadId);
    } catch {
      error("Não foi possível carregar os anexos.");
      return [] as LeadAnexo[];
    }
  };

  const addAnexo = async (leadId: string, file: File) => {
    try {
      const { addLeadAnexo } = await import("@/repositories/client/leads.repository");
      const item = await addLeadAnexo(leadId, file);
      success("Anexo adicionado.");
      return item;
    } catch {
      error("Não foi possível adicionar anexo.");
      throw new Error("Falha ao adicionar anexo.");
    }
  };

  const removeAnexo = async (id: string) => {
    try {
      const { removeLeadAnexo } = await import("@/repositories/client/leads.repository");
      await removeLeadAnexo(id);
      success("Anexo removido.");
    } catch {
      error("Não foi possível remover anexo.");
      throw new Error("Falha ao remover anexo.");
    }
  };

  return { list, get, create, update, remove, search, filterByStatus, getHistorico, addHistorico, getAnexos, addAnexo, removeAnexo };
}
