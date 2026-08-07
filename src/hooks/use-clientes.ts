import { useMemo } from "react";
import {
  createClienteService,
  deleteClienteService,
  listClientesService,
  updateClienteService,
} from "@/services/clientes.service";

export function useClientes() {
  return useMemo(
    () => ({
      listClientes: listClientesService,
      createCliente: createClienteService,
      updateCliente: updateClienteService,
      deleteCliente: deleteClienteService,
    }),
    [],
  );
}
