import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import type { Database } from "@/types/database.types";

export type Cliente = Database["public"]["Tables"]["clientes"]["Row"];
export type ClienteInsert = Database["public"]["Tables"]["clientes"]["Insert"];
export type ClienteUpdate = Database["public"]["Tables"]["clientes"]["Update"];

export async function getClientes(): Promise<Cliente[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Não foi possível carregar os clientes.");
  }

  return (data as Cliente[]) ?? [];
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Cliente;
}

export async function createCliente(payload: ClienteInsert): Promise<Cliente> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clientes")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível salvar o cliente.");
  }

  return data as Cliente;
}

export async function updateCliente(id: string, payload: ClienteUpdate): Promise<Cliente> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clientes")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível atualizar o cliente.");
  }

  return data as Cliente;
}

export async function deleteCliente(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { error } = await supabase.from("clientes").delete().eq("id", id).eq("usuario_id", user.id);

  if (error) {
    throw new Error("Não foi possível excluir o cliente.");
  }
}