import { useMemo } from "react";
import {
  createParceiroService,
  deleteParceiroService,
  listParceirosService,
  updateParceiroService,
} from "@/services/parceiros.service";

export function useParceiros() {
  return useMemo(
    () => ({
      listParceiros: listParceirosService,
      createParceiro: createParceiroService,
      updateParceiro: updateParceiroService,
      deleteParceiro: deleteParceiroService,
    }),
    [],
  );
}