import { getErrorMessage } from "@/lib/errors";
import { appLog } from "@/lib/logger";
import {
  deletePosVendaRepository,
  listPosVendaRepository,
  savePosVendaRepository,
} from "@/repositories/pos-venda.repository";
import type { PosVendaRecord, PosVendaUpsertInput } from "@/types/crm";

export async function listPosVendaService(): Promise<PosVendaRecord[]> {
  try {
    return await listPosVendaRepository();
  } catch (error) {
    appLog("error", "posVenda.list.failed", error);
    throw new Error(getErrorMessage(error, "Nao foi possivel carregar o pós-venda."));
  }
}

export async function savePosVendaService(input: PosVendaUpsertInput, id?: string): Promise<PosVendaRecord> {
  try {
    return await savePosVendaRepository(input, id);
  } catch (error) {
    appLog("error", "posVenda.save.failed", { error, input, id });
    throw new Error(getErrorMessage(error, "Nao foi possivel salvar o acompanhamento de pós-venda."));
  }
}

export async function deletePosVendaService(id: string): Promise<void> {
  try {
    await deletePosVendaRepository(id);
  } catch (error) {
    appLog("error", "posVenda.delete.failed", { error, id });
    throw new Error(getErrorMessage(error, "Nao foi possivel excluir o acompanhamento de pós-venda."));
  }
}