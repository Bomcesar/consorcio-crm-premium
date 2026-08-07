import { appLog } from "@/lib/logger";
import { getErrorMessage } from "@/lib/errors";
import {
  deleteContactRepository,
  deleteIndicatorRepository,
  getDashboardSummarySourceRepository,
  getAuthenticatedUserRepository,
  listCommissionsRepository,
  listContactsRepository,
  listIndicatorsRepository,
  moveIndicatorStageRepository,
  markCommissionAsPaidRepository,
  saveContactRepository,
  saveIndicatorRepository,
  subscribeIndicatorsRealtimeRepository,
  type ContactInsertInput,
  type DashboardSummarySource,
  type IndicatorInsertInput,
} from "@/repositories/indicadores.repository";
import type { Commission, Contact, Indicator } from "@/types/crm";

export async function getAuthenticatedUserService() {
  try {
    return await getAuthenticatedUserRepository();
  } catch (error) {
    appLog("error", "auth.getUser.failed", error);
    throw new Error(getErrorMessage(error, "Nao foi possivel identificar o usuario autenticado."));
  }
}

export async function listIndicatorsService(): Promise<Indicator[]> {
  try {
    return await listIndicatorsRepository();
  } catch (error) {
    appLog("error", "indicadores.list.failed", error);
    throw new Error(getErrorMessage(error, "Erro ao carregar indicadores."));
  }
}

export async function getDashboardSummarySourceService(): Promise<DashboardSummarySource> {
  try {
    return await getDashboardSummarySourceRepository();
  } catch (error) {
    appLog("error", "indicadores.summarySource.failed", error);
    throw new Error(getErrorMessage(error, "Erro ao carregar os dados de resumo."));
  }
}

export async function saveIndicatorService(payload: IndicatorInsertInput, id?: string): Promise<Indicator> {
  try {
    return await saveIndicatorRepository(payload, id);
  } catch (error) {
    appLog("error", "indicadores.save.failed", { error, id, payload });
    throw new Error(getErrorMessage(error, "Erro ao salvar indicador."));
  }
}

export async function deleteIndicatorService(id: string): Promise<void> {
  try {
    await deleteIndicatorRepository(id);
  } catch (error) {
    appLog("error", "indicadores.delete.failed", { error, id });
    throw new Error(getErrorMessage(error, "Nao foi possivel excluir o indicador."));
  }
}

export async function listContactsService(indicatorId: string): Promise<Contact[]> {
  try {
    return await listContactsRepository(indicatorId);
  } catch (error) {
    appLog("error", "contatos.list.failed", { error, indicatorId });
    throw new Error(getErrorMessage(error, "Nao foi possivel carregar os contatos."));
  }
}

export async function saveContactService(input: ContactInsertInput, contactId?: string): Promise<Contact> {
  try {
    return await saveContactRepository(input, contactId);
  } catch (error) {
    appLog("error", "contatos.save.failed", { error, contactId, input });
    throw new Error(getErrorMessage(error, "Nao foi possivel salvar o contato."));
  }
}

export async function deleteContactService(contactId: string): Promise<void> {
  try {
    await deleteContactRepository(contactId);
  } catch (error) {
    appLog("error", "contatos.delete.failed", { error, contactId });
    throw new Error(getErrorMessage(error, "Nao foi possivel excluir o contato."));
  }
}

export async function listCommissionsService(indicatorId: string): Promise<Commission[]> {
  try {
    return await listCommissionsRepository(indicatorId);
  } catch (error) {
    appLog("error", "comissoes.list.failed", { error, indicatorId });
    throw new Error(getErrorMessage(error, "Nao foi possivel carregar as comissoes."));
  }
}

export async function markCommissionAsPaidService(commissionId: string): Promise<void> {
  try {
    await markCommissionAsPaidRepository(commissionId);
  } catch (error) {
    appLog("error", "comissoes.markPaid.failed", { error, commissionId });
    throw new Error(getErrorMessage(error, "Nao foi possivel atualizar a comissao."));
  }
}

export async function moveIndicatorStageService(indicatorId: string, stage: string): Promise<Indicator> {
  try {
    return await moveIndicatorStageRepository(indicatorId, stage);
  } catch (error) {
    appLog("error", "indicadores.moveStage.failed", { error, indicatorId, stage });
    throw new Error(getErrorMessage(error, "Nao foi possivel mover o indicador no pipeline."));
  }
}

export function subscribeIndicatorsRealtimeService(onChange: () => void): () => void {
  return subscribeIndicatorsRealtimeRepository(onChange);
}
