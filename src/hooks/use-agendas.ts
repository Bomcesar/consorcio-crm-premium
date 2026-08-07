import { useMemo } from "react";
import {
  deleteAgendaService,
  listAgendasService,
  saveAgendaService,
  subscribeAgendasRealtimeService,
} from "@/services/agendas.service";

export function useAgendas() {
  return useMemo(
    () => ({
      listAgendas: listAgendasService,
      saveAgenda: saveAgendaService,
      deleteAgenda: deleteAgendaService,
      subscribeAgendasRealtime: subscribeAgendasRealtimeService,
    }),
    [],
  );
}
