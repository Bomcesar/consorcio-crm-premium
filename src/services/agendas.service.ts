import { appLog } from "@/lib/logger";
import { getErrorMessage } from "@/lib/errors";
import {
  deleteAgendaRepository,
  listAgendasRepository,
  saveAgendaRepository,
  subscribeAgendasRealtimeRepository,
  type AgendaInsertInput,
} from "@/repositories/agendas.repository";
import type { Agenda } from "@/types/crm";

export async function listAgendasService(): Promise<Agenda[]> {
  try {
    return await listAgendasRepository();
  } catch (error) {
    appLog("error", "agendas.list.failed", error);
    throw new Error(getErrorMessage(error, "Nao foi possivel carregar a agenda."));
  }
}

export async function saveAgendaService(input: AgendaInsertInput, id?: string): Promise<Agenda> {
  try {
    return await saveAgendaRepository(input, id);
  } catch (error) {
    appLog("error", "agendas.save.failed", { error, input, id });
    throw new Error(getErrorMessage(error, "Nao foi possivel salvar o compromisso."));
  }
}

export async function deleteAgendaService(id: string): Promise<void> {
  try {
    await deleteAgendaRepository(id);
  } catch (error) {
    appLog("error", "agendas.delete.failed", { error, id });
    throw new Error(getErrorMessage(error, "Nao foi possivel excluir o compromisso."));
  }
}

export function subscribeAgendasRealtimeService(onChange: () => void): () => void {
  try {
    return subscribeAgendasRealtimeRepository(onChange);
  } catch (error) {
    appLog("error", "agendas.realtime.failed", error);
    return () => undefined;
  }
}
