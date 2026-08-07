import { useMemo } from "react";
import {
  createRecrutamentoService,
  deleteRecrutamentoService,
  listRecrutamentoService,
  updateRecrutamentoService,
} from "@/services/recrutamento.service";

export function useRecrutamento() {
  return useMemo(
    () => ({
      listRecrutamento: listRecrutamentoService,
      createRecrutamento: createRecrutamentoService,
      updateRecrutamento: updateRecrutamentoService,
      deleteRecrutamento: deleteRecrutamentoService,
    }),
    [],
  );
}