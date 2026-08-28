import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Cliente, ClienteInsert, ClienteUpdate, ClienteHistorico, ClienteContato } from "@/repositories/client/clientes.repository";
import type { Pasta, PastaInsert, PastaUpdate, PastaItem, PastaItemInsert, PastaItemUpdate, ProspeccaoHistorico, ProspeccaoHistoricoInsert } from "@/repositories/client/pastas.repository";

export function useClientes() {
  const { success, error } = useToast();
  const [searchResults, setSearchResults] = useState<Cliente[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [pastaItens, setPastaItens] = useState<PastaItem[]>([]);
  const [prospeccaoHistorico, setProspeccaoHistorico] = useState<ProspeccaoHistorico[]>([]);
  const [isPastaLoading, setIsPastaLoading] = useState(false);
  const [selectedPastaId, setSelectedPastaId] = useState<string | null>(null);

  const list = async () => {
    try {
      const { getClientes } = await import("@/repositories/client/clientes.repository");
      return await getClientes();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível carregar os clientes.";
      error(message);
      throw err;
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
      console.log("[useClientes] create sucesso:", cliente);
      success("Cliente cadastrado com sucesso.");
      return cliente;
    } catch (err) {
      console.error("[useClientes] create erro:", err);
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

  const search = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      return [];
    }
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setIsSearchLoading(true);
    try {
      const { searchClientes } = await import("@/repositories/client/clientes.repository");
      const data = await searchClientes(trimmed);
      if (!controller.signal.aborted) {
        setSearchResults(data);
        return data;
      }
      return [];
    } catch {
      if (!controller.signal.aborted) {
        error("Não foi possível pesquisar clientes.");
        setSearchResults([]);
      }
      return [];
    } finally {
      if (!controller.signal.aborted) {
        setIsSearchLoading(false);
      }
    }
  }, [error]);

  const debouncedSearch = useCallback(
    (value: string) => {
      const timeout = setTimeout(() => {
        void search(value);
      }, 250);
      return () => clearTimeout(timeout);
    },
    [search],
  );

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

  const loadPastas = useCallback(async () => {
    setIsPastaLoading(true);
    try {
      const { getPastas } = await import("@/repositories/client/pastas.repository");
      const data = await getPastas();
      setPastas(data);
      return data;
    } catch {
      error("Não foi possível carregar as pastas.");
      return [];
    } finally {
      setIsPastaLoading(false);
    }
  }, [error]);

  const loadPastaItens = useCallback(async (pastaId: string) => {
    setIsPastaLoading(true);
    try {
      const { getPastaItens } = await import("@/repositories/client/pastas.repository");
      const data = await getPastaItens(pastaId);
      setPastaItens(data);
      return data;
    } catch {
      error("Não foi possível carregar os itens da pasta.");
      return [];
    } finally {
      setIsPastaLoading(false);
    }
  }, [error]);

  const createPasta = useCallback(async (payload: PastaInsert) => {
    try {
      const { createPasta } = await import("@/repositories/client/pastas.repository");
      const pasta = await createPasta(payload);
      setPastas((prev) => [...prev, pasta]);
      success("Pasta criada com sucesso.");
      return pasta;
    } catch {
      error("Não foi possível criar a pasta.");
      throw new Error("Falha ao criar pasta.");
    }
  }, [error, success]);

  const updatePasta = useCallback(async (id: string, payload: PastaUpdate) => {
    try {
      const { updatePasta } = await import("@/repositories/client/pastas.repository");
      const pasta = await updatePasta(id, payload);
      setPastas((prev) => prev.map((p) => (p.id === pasta.id ? pasta : p)));
      success("Pasta atualizada com sucesso.");
      return pasta;
    } catch {
      error("Não foi possível atualizar a pasta.");
      throw new Error("Falha ao atualizar pasta.");
    }
  }, [error]);

  const deletePasta = useCallback(async (id: string) => {
    try {
      const { deletePasta } = await import("@/repositories/client/pastas.repository");
      await deletePasta(id);
      setPastas((prev) => prev.filter((p) => p.id !== id));
      success("Pasta excluída com sucesso.");
    } catch {
      error("Não foi possível excluir a pasta.");
      throw new Error("Falha ao excluir pasta.");
    }
  }, [error]);

  const addClienteToPasta = useCallback(async (pastaId: string, clienteId: string) => {
    try {
      const { addClienteToPasta } = await import("@/repositories/client/pastas.repository");
      const item = await addClienteToPasta({ pasta_id: pastaId, cliente_id: clienteId, prospeccao_status: "Não contatado" });
      setPastaItens((prev) => [...prev, item]);
      success("Contato adicionado à pasta.");
      return item;
    } catch {
      error("Não foi possível adicionar o contato à pasta.");
      throw new Error("Falha ao adicionar contato à pasta.");
    }
  }, [error]);

  const updatePastaItem = useCallback(async (id: string, payload: PastaItemUpdate) => {
    try {
      const { updatePastaItem } = await import("@/repositories/client/pastas.repository");
      const item = await updatePastaItem(id, payload);
      setPastaItens((prev) => prev.map((i) => (i.id === item.id ? item : i)));
      return item;
    } catch {
      error("Não foi possível atualizar o item da pasta.");
      throw new Error("Falha ao atualizar item da pasta.");
    }
  }, [error]);

  const removeClienteFromPasta = useCallback(async (id: string) => {
    try {
      const { removeClienteFromPasta } = await import("@/repositories/client/pastas.repository");
      await removeClienteFromPasta(id);
      setPastaItens((prev) => prev.filter((i) => i.id !== id));
      success("Contato removido da pasta.");
    } catch {
      error("Não foi possível remover o contato da pasta.");
      throw new Error("Falha ao remover contato da pasta.");
    }
  }, [error]);

  const loadProspeccaoHistorico = useCallback(async (pastaItemId: string) => {
    try {
      const { getProspeccaoHistorico } = await import("@/repositories/client/pastas.repository");
      const data = await getProspeccaoHistorico(pastaItemId);
      setProspeccaoHistorico(data);
      return data;
    } catch {
      error("Não foi possível carregar o histórico de prospecção.");
      throw new Error("Falha ao carregar histórico de prospecção.");
    }
  }, [error]);

  const addProspeccaoHistorico = useCallback(async (payload: ProspeccaoHistoricoInsert) => {
    try {
      const { addProspeccaoHistorico } = await import("@/repositories/client/pastas.repository");
      const item = await addProspeccaoHistorico(payload);
      setProspeccaoHistorico((prev) => [item, ...prev]);
      success("Interação registrada.");
      return item;
    } catch {
      error("Não foi possível registrar a interação.");
      throw new Error("Falha ao registrar interação.");
    }
  }, [error]);

  return {
    list, get, create, update, remove, search, debouncedSearch, filterByStatus,
    getHistorico, addHistorico, getContatos, addContato, updateContato, removeContato,
    searchResults, isSearchLoading, pastas, pastaItens, prospeccaoHistorico, isPastaLoading,
    selectedPastaId, setSelectedPastaId, loadPastas, loadPastaItens, createPasta,
    updatePasta, deletePasta, addClienteToPasta, updatePastaItem, removeClienteFromPasta,
    loadProspeccaoHistorico, addProspeccaoHistorico,
  };
}

