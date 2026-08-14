import type { Lead, LeadInsert, LeadUpdate } from "@/repositories/client/leads.repository";

export interface LeadService {
  list(): Promise<Lead[]>;
  get(id: string): Promise<Lead | null>;
  create(data: LeadInsert): Promise<Lead>;
  update(id: string, data: LeadUpdate): Promise<Lead>;
  delete(id: string): Promise<void>;
}

export async function getLeadService(): Promise<LeadService> {
  const {
    getLeads,
    getLead,
    createLead,
    updateLead,
    deleteLead,
  } = await import("@/repositories/client/leads.repository");

  return {
    list: getLeads,
    get: getLead,
    create: createLead,
    update: updateLead,
    delete: deleteLead,
  };
}
