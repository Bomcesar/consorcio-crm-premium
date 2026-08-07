import { appLog } from "@/lib/logger";
import { getErrorMessage } from "@/lib/errors";
import {
  createRecrutamentoRepository,
  deleteRecrutamentoRepository,
  listRecrutamentoRepository,
  updateRecrutamentoRepository,
  type RecrutamentoInsertInput,
  type RecrutamentoUpdateInput,
} from "@/repositories/recrutamento.repository";
import type { RecrutamentoCandidato } from "@/types/crm";

export async function listRecrutamentoService(): Promise<RecrutamentoCandidato[]> {
  try {
    return await listRecrutamentoRepository();
  } catch (error) {
    appLog("error", "recrutamento.list.failed", error);
    throw new Error(getErrorMessage(error, "Nao foi possivel carregar o recrutamento."));
  }
}

export async function createRecrutamentoService(input: RecrutamentoInsertInput): Promise<RecrutamentoCandidato> {
  try {
    return await createRecrutamentoRepository(input);
  } catch (error) {
    appLog("error", "recrutamento.create.failed", { error, input });
    throw new Error(getErrorMessage(error, "Nao foi possivel salvar o candidato."));
  }
}

export async function updateRecrutamentoService(
  id: string,
  input: RecrutamentoUpdateInput,
): Promise<RecrutamentoCandidato> {
  try {
    return await updateRecrutamentoRepository(id, input);
  } catch (error) {
    appLog("error", "recrutamento.update.failed", { error, id, input });
    throw new Error(getErrorMessage(error, "Nao foi possivel atualizar o candidato."));
  }
}

export async function deleteRecrutamentoService(id: string): Promise<void> {
  try {
    await deleteRecrutamentoRepository(id);
  } catch (error) {
    appLog("error", "recrutamento.delete.failed", { error, id });
    throw new Error(getErrorMessage(error, "Nao foi possivel excluir o candidato."));
  }
}