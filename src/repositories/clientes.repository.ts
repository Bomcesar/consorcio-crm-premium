import { getBrowserSupabase } from "@/repositories/supabase-browser";
import type { Cliente } from "@/types/crm";

const LOCAL_STORAGE_KEY = "crm-clientes-local";

export type ClienteInsertInput = {
  nome: string;
  telefone: string;
  cidade: string;
  status: string;
  observacoes: string;
};

export type ClienteUpdateInput = Partial<ClienteInsertInput>;

function isSchemaCacheError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === "object" && error !== null ? String((error as { message?: unknown }).message ?? "") : "";
  return /schema cache|could not find the table|relation .* does not exist/i.test(message);
}

function readLocalClientes(): Cliente[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as Cliente[];
  } catch {
    return [];
  }
}

function writeLocalClientes(clientes: Cliente[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clientes));
}

function createLocalCliente(input: ClienteInsertInput): Cliente {
  return {
    id: `local-${crypto.randomUUID()}`,
    nome: input.nome,
    telefone: input.telefone,
    cidade: input.cidade,
    status: input.status,
    observacoes: input.observacoes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function listClientesRepository(): Promise<Cliente[]> {
  const supabase = getBrowserSupabase();
  try {
    const { data, error } = await supabase.from("clientes").select("*").order("created_at", { ascending: false });

    if (error) throw error;
    return (data as Cliente[]) ?? [];
  } catch (error) {
    if (isSchemaCacheError(error)) {
      return readLocalClientes().sort((left, right) => {
        const dateLeft = new Date(left.created_at ?? 0).getTime();
        const dateRight = new Date(right.created_at ?? 0).getTime();
        return dateRight - dateLeft;
      });
    }

    throw error;
  }
}

export async function createClienteRepository(input: ClienteInsertInput): Promise<Cliente> {
  const supabase = getBrowserSupabase();
  try {
    const { data, error } = await supabase.from("clientes").insert(input).select().single();

    if (error) throw error;
    return data as Cliente;
  } catch (error) {
    if (!isSchemaCacheError(error)) throw error;

    const nextClientes = [createLocalCliente(input), ...readLocalClientes()];
    writeLocalClientes(nextClientes);
    return nextClientes[0];
  }
}

export async function updateClienteRepository(id: string, input: ClienteUpdateInput): Promise<Cliente> {
  const supabase = getBrowserSupabase();
  try {
    const { data, error } = await supabase.from("clientes").update(input).eq("id", id).select().single();

    if (error) throw error;
    return data as Cliente;
  } catch (error) {
    if (!isSchemaCacheError(error)) throw error;

    const nextClientes = readLocalClientes().map((cliente) =>
      cliente.id === id ? { ...cliente, ...input, updated_at: new Date().toISOString() } : cliente,
    );
    writeLocalClientes(nextClientes);
    const updated = nextClientes.find((cliente) => cliente.id === id);
    if (!updated) throw error;
    return updated;
  }
}

export async function deleteClienteRepository(id: string): Promise<void> {
  const supabase = getBrowserSupabase();
  try {
    const { error } = await supabase.from("clientes").delete().eq("id", id);

    if (error) throw error;
  } catch (error) {
    if (!isSchemaCacheError(error)) throw error;

    writeLocalClientes(readLocalClientes().filter((cliente) => cliente.id !== id));
  }
}
