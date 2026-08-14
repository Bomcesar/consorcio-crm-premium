import { useToast } from "@/hooks/use-toast";
import type { Cliente, ClienteInsert, ClienteUpdate, ClienteHistorico, ClienteContato } from "@/repositories/client/clientes.repository";

export function useClientes() {
  const { success, error } = useToast();

  const list = async () => {
    try {
      const { getClientes } = await import("@/repositories/client/clientes.repository");
      return await getClientes();
    } catch {
      error("Não foi possível carregar os clientes.");
      return [] as Cliente[];
    }
  };

  const get = async (id: string) => {
    try {
      const { getCliente } = await import("@/repositories/client/clientes.repository");
      return await getCliente(id);
    } catch {
      error("Não foi possível carregar o cliente.");
      return null;
    }
  };

  const create = async (data: ClienteInsert) => {
    try {
      const { createCliente } = await import("@/repositories/client/clientes.repository");
      const cliente = await createCliente(data);
      success("Cliente cadastrado com sucesso.");
      return cliente;
    } catch {
      error("Não foi possível salvar o cliente.");
      throw new Error("Falha ao criar cliente.");
    }
  };

  const update = async (id: string, data: ClienteUpdate) => {
    try {
      const { updateCliente } = await import("@/repositories/client/clientes.repository");
      const cliente = await updateCliente(id, data);
      success("Cliente atualizado com sucesso.");
      return cliente;
    } catch {
      error("Não foi possível atualizar o cliente.");
      throw new Error("Falha ao atualizar cliente.");
    }
  };

  const remove = async (id: string) => {
    try {
      const { deleteCliente } = await import("@/repositories/client/clientes.repository");
      await deleteCliente(id);
      success("Cliente excluído com sucesso.");
    } catch {
      error("Não foi possível excluir o cliente.");
      throw new Error("Falha ao excluir cliente.");
    }
  };

  const search = async (query: string) => {
    try {
      const { searchClientes } = await import("@/repositories/client/clientes.repository");
      return await searchClientes(query);
    } catch {
      error("Não foi possível pesquisar clientes.");
      return [] as Cliente[];
    }
  };

  const filterByStatus = async (status: string) => {
    try {
      const { filterClientesByStatus } = await import("@/repositories/client/clientes.repository");
      return await filterClientesByStatus(status);
    } catch {
      error("Não foi possível filtrar clientes.");
      return [] as Cliente[];
    }
  };

  const getHistorico = async (clienteId: string) => {
    try {
      const { getClienteHistorico } = await import("@/repositories/client/clientes.repository");
      return await getClienteHistorico(clienteId);
    } catch {
      error("Não foi possível carregar o histórico.");
      return [] as ClienteHistorico[];
    }
  };

  const addHistorico = async (clienteId: string, payload: { tipo?: string; descricao?: string }) => {
    try {
      const { addClienteHistorico } = await import("@/repositories/client/clientes.repository");
      const item = await addClienteHistorico(clienteId, payload);
      success("Histórico adicionado.");
      return item;
    } catch {
      error("Não foi possível adicionar histórico.");
      throw new Error("Falha ao adicionar histórico.");
    }
  };

  const getContatos = async (clienteId: string) => {
    try {
      const { getClienteContatos } = await import("@/repositories/client/clientes.repository");
      return await getClienteContatos(clienteId);
    } catch {
      error("Não foi possível carregar os contatos.");
      return [] as ClienteContato[];
    }
  };

  const addContato = async (clienteId: string, payload: { nome: string; telefone: string; email: string; tipo: string; observacoes: string }) => {
    try {
      const { addClienteContato } = await import("@/repositories/client/clientes.repository");
      const item = await addClienteContato(clienteId, payload);
      success("Contato adicionado.");
      return item;
    } catch {
      error("Não foi possível adicionar contato.");
      throw new Error("Falha ao adicionar contato.");
    }
  };

  const updateContato = async (id: string, payload: { nome?: string; telefone?: string; email?: string; tipo?: string; observacoes?: string }) => {
    try {
      const { updateClienteContato } = await import("@/repositories/client/clientes.repository");
      const item = await updateClienteContato(id, payload);
      success("Contato atualizado.");
      return item;
    } catch {
      error("Não foi possível atualizar o contato.");
      throw new Error("Falha ao atualizar contato.");
    }
  };

  const removeContato = async (id: string) => {
    try {
      const { deleteClienteContato } = await import("@/repositories/client/clientes.repository");
      await deleteClienteContato(id);
      success("Contato removido.");
    } catch {
      error("Não foi possível remover o contato.");
      throw new Error("Falha ao remover contato.");
    }
  };

  return { list, get, create, update, remove, search, filterByStatus, getHistorico, addHistorico, getContatos, addContato, updateContato, removeContato };
}
