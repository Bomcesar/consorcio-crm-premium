import { appLog } from "@/lib/logger";
import { getErrorMessage } from "@/lib/errors";
import {
  createLeadRepository,
  deleteLeadRepository,
  listLeadsRepository,
  updateLeadRepository,
  type LeadInsertInput,
  type LeadUpdateInput,
} from "@/repositories/leads.repository";
import type { Lead } from "@/types/crm";

export async function listLeadsService(): Promise<Lead[]> {
  try {
    return await listLeadsRepository();
  } catch (error) {
    appLog("error", "leads.list.failed", error);
    throw new Error(getErrorMessage(error, "Nao foi possivel carregar os leads no momento."));
  }
}

export async function createLeadService(input: LeadInsertInput): Promise<Lead> {
  try {
    return await createLeadRepository(input);
  } catch (error) {
    appLog("error", "leads.create.failed", { error, input });
    throw new Error(getErrorMessage(error, "Nao foi possivel salvar o lead. Tente novamente."));
  }
}

export async function updateLeadService(id: string, input: LeadUpdateInput): Promise<Lead> {
  try {
    return await updateLeadRepository(id, input);
  } catch (error) {
    appLog("error", "leads.update.failed", { error, id, input });
    throw new Error(getErrorMessage(error, "Nao foi possivel atualizar o lead."));
  }
}

export async function deleteLeadService(id: string): Promise<void> {
  try {
    await deleteLeadRepository(id);
  } catch (error) {
    appLog("error", "leads.delete.failed", { error, id });
    throw new Error(getErrorMessage(error, "Nao foi possivel excluir o lead."));
  }
}
