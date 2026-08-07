import { appLog } from "@/lib/logger";
import { getErrorMessage } from "@/lib/errors";
import {
  createParceiroRepository,
  deleteParceiroRepository,
  listParceirosRepository,
  updateParceiroRepository,
  type ParceiroInsertInput,
  type ParceiroUpdateInput,
} from "@/repositories/parceiros.repository";
import type { Parceiro } from "@/types/crm";

export async function listParceirosService(): Promise<Parceiro[]> {
  try {
    return await listParceirosRepository();
  } catch (error) {
    appLog("error", "parceiros.list.failed", error);
    throw new Error(getErrorMessage(error, "Nao foi possivel carregar os parceiros."));
  }
}

export async function createParceiroService(input: ParceiroInsertInput): Promise<Parceiro> {
  try {
    return await createParceiroRepository(input);
  } catch (error) {
    appLog("error", "parceiros.create.failed", { error, input });
    throw new Error(getErrorMessage(error, "Nao foi possivel salvar o parceiro."));
  }
}

export async function updateParceiroService(id: string, input: ParceiroUpdateInput): Promise<Parceiro> {
  try {
    return await updateParceiroRepository(id, input);
  } catch (error) {
    appLog("error", "parceiros.update.failed", { error, id, input });
    throw new Error(getErrorMessage(error, "Nao foi possivel atualizar o parceiro."));
  }
}

export async function deleteParceiroService(id: string): Promise<void> {
  try {
    await deleteParceiroRepository(id);
  } catch (error) {
    appLog("error", "parceiros.delete.failed", { error, id });
    throw new Error(getErrorMessage(error, "Nao foi possivel excluir o parceiro."));
  }
}