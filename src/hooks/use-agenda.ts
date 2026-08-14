import { useToast } from "@/hooks/use-toast";
import type {
  AgendaEvento,
  AgendaEventoInsert,
  AgendaEventoUpdate,
  AgendaTarefa,
  AgendaTarefaInsert,
  AgendaTarefaUpdate,
  AgendaFollowup,
  AgendaFollowupInsert,
  AgendaFollowupUpdate,
} from "@/repositories/client/agenda.repository";

export function useAgenda() {
  const { success, error } = useToast();

  const listEventos = async () => {
    try {
      const { getEventosAgenda } = await import("@/repositories/client/agenda.repository");
      return await getEventosAgenda();
    } catch {
      error("Não foi possível carregar os eventos.");
      return [] as AgendaEvento[];
    }
  };

  const getEvento = async (id: string) => {
    try {
      const { getEventoAgenda } = await import("@/repositories/client/agenda.repository");
      return await getEventoAgenda(id);
    } catch {
      error("Não foi possível carregar o evento.");
      return null;
    }
  };

  const createEvento = async (payload: AgendaEventoInsert) => {
    try {
      const { createEventoAgenda } = await import("@/repositories/client/agenda.repository");
      const item = await createEventoAgenda(payload);
      success("Evento cadastrado com sucesso.");
      return item;
    } catch {
      error("Não foi possível salvar o evento.");
      throw new Error("Falha ao criar evento.");
    }
  };

  const updateEvento = async (id: string, payload: AgendaEventoUpdate) => {
    try {
      const { updateEventoAgenda } = await import("@/repositories/client/agenda.repository");
      const item = await updateEventoAgenda(id, payload);
      success("Evento atualizado com sucesso.");
      return item;
    } catch {
      error("Não foi possível atualizar o evento.");
      throw new Error("Falha ao atualizar evento.");
    }
  };

  const removeEvento = async (id: string) => {
    try {
      const { deleteEventoAgenda } = await import("@/repositories/client/agenda.repository");
      await deleteEventoAgenda(id);
      success("Evento excluído com sucesso.");
    } catch {
      error("Não foi possível excluir o evento.");
      throw new Error("Falha ao excluir evento.");
    }
  };

  const listTarefas = async () => {
    try {
      const { getTarefas } = await import("@/repositories/client/agenda.repository");
      return await getTarefas();
    } catch {
      error("Não foi possível carregar as tarefas.");
      return [] as AgendaTarefa[];
    }
  };

  const getTarefa = async (id: string) => {
    try {
      const { getTarefa } = await import("@/repositories/client/agenda.repository");
      return await getTarefa(id);
    } catch {
      error("Não foi possível carregar a tarefa.");
      return null;
    }
  };

  const createTarefa = async (payload: AgendaTarefaInsert) => {
    try {
      const { createTarefa } = await import("@/repositories/client/agenda.repository");
      const item = await createTarefa(payload);
      success("Tarefa cadastrada com sucesso.");
      return item;
    } catch {
      error("Não foi possível salvar a tarefa.");
      throw new Error("Falha ao criar tarefa.");
    }
  };

  const updateTarefa = async (id: string, payload: AgendaTarefaUpdate) => {
    try {
      const { updateTarefa } = await import("@/repositories/client/agenda.repository");
      const item = await updateTarefa(id, payload);
      success("Tarefa atualizada com sucesso.");
      return item;
    } catch {
      error("Não foi possível atualizar a tarefa.");
      throw new Error("Falha ao atualizar tarefa.");
    }
  };

  const removeTarefa = async (id: string) => {
    try {
      const { deleteTarefa } = await import("@/repositories/client/agenda.repository");
      await deleteTarefa(id);
      success("Tarefa excluída com sucesso.");
    } catch {
      error("Não foi possível excluir a tarefa.");
      throw new Error("Falha ao excluir tarefa.");
    }
  };

  const listFollowups = async (eventoId: string) => {
    try {
      const { getFollowups } = await import("@/repositories/client/agenda.repository");
      return await getFollowups(eventoId);
    } catch {
      error("Não foi possível carregar os follow-ups.");
      return [] as AgendaFollowup[];
    }
  };

  const createFollowup = async (payload: AgendaFollowupInsert) => {
    try {
      const { createFollowup } = await import("@/repositories/client/agenda.repository");
      const item = await createFollowup(payload);
      success("Follow-up cadastrado com sucesso.");
      return item;
    } catch {
      error("Não foi possível salvar o follow-up.");
      throw new Error("Falha ao criar follow-up.");
    }
  };

  const updateFollowup = async (id: string, payload: AgendaFollowupUpdate) => {
    try {
      const { updateFollowup } = await import("@/repositories/client/agenda.repository");
      const item = await updateFollowup(id, payload);
      success("Follow-up atualizado com sucesso.");
      return item;
    } catch {
      error("Não foi possível atualizar o follow-up.");
      throw new Error("Falha ao atualizar follow-up.");
    }
  };

  const removeFollowup = async (id: string) => {
    try {
      const { deleteFollowup } = await import("@/repositories/client/agenda.repository");
      await deleteFollowup(id);
      success("Follow-up excluído com sucesso.");
    } catch {
      error("Não foi possível excluir o follow-up.");
      throw new Error("Falha ao excluir follow-up.");
    }
  };

  return {
    listEventos,
    getEvento,
    createEvento,
    updateEvento,
    removeEvento,
    listTarefas,
    getTarefa,
    createTarefa,
    updateTarefa,
    removeTarefa,
    listFollowups,
    createFollowup,
    updateFollowup,
    removeFollowup,
  };
}
