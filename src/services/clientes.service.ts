import { appLog } from "@/lib/logger";
import { getErrorMessage } from "@/lib/errors";
import {
  createClienteRepository,
  deleteClienteRepository,
  listClientesRepository,
  updateClienteRepository,
  type ClienteInsertInput,
  type ClienteUpdateInput,
} from "@/repositories/clientes.repository";
import type { Cliente } from "@/types/crm";

function isClientesPermissionError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null
        ? String((error as { message?: unknown }).message ?? "")
        : "";

  return /permission denied.*clientes/i.test(message);
}

export async function listClientesService(): Promise<Cliente[]> {
  try {
    return await listClientesRepository();
  } catch (error) {
    appLog("error", "clientes.list.failed", error);
    throw new Error(getErrorMessage(error, "Nao foi possivel carregar os clientes no momento."));
  }
}

export async function createClienteService(input: ClienteInsertInput): Promise<Cliente> {
  try {
    return await createClienteRepository(input);
  } catch (error) {
    appLog("error", "clientes.create.failed", { error, input });
    if (isClientesPermissionError(error)) {
      throw new Error("Seu usuario nao tem permissao para salvar clientes no banco. Aplique as migrations do Supabase e tente novamente.");
    }
    throw new Error(getErrorMessage(error, "Nao foi possivel salvar o cliente. Tente novamente."));
  }
}

export async function updateClienteService(id: string, input: ClienteUpdateInput): Promise<Cliente> {
  try {
    return await updateClienteRepository(id, input);
  } catch (error) {
    appLog("error", "clientes.update.failed", { error, id, input });
    throw new Error(getErrorMessage(error, "Nao foi possivel atualizar o cliente."));
  }
}

export async function deleteClienteService(id: string): Promise<void> {
  try {
    await deleteClienteRepository(id);
  } catch (error) {
    appLog("error", "clientes.delete.failed", { error, id });
    throw new Error(getErrorMessage(error, "Nao foi possivel excluir o cliente."));
  }
}
