import { useMemo } from "react";
import {
  deletePosVendaService,
  listPosVendaService,
  savePosVendaService,
} from "@/services/pos-venda.service";

export function usePosVenda() {
  return useMemo(
    () => ({
      listPosVenda: listPosVendaService,
      savePosVenda: savePosVendaService,
      deletePosVenda: deletePosVendaService,
    }),
    [],
  );
}