import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import type { Database } from "@/types/database.types";

export type Indicador = Database["public"]["Tables"]["indicadores"]["Row"];
export type IndicadorInsert = Database["public"]["Tables"]["indicadores"]["Insert"];
export type IndicadorUpdate = Database["public"]["Tables"]["indicadores"]["Update"];

export async function getIndicadores(): Promise<Indicador[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("indicadores")
    .select("*")
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Não foi possível carregar os indicadores.");
  }

  return (data as Indicador[]) ?? [];
}

export async function getIndicador(id: string): Promise<Indicador | null> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("indicadores")
    .select("*")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Indicador;
}

export async function createIndicador(payload: IndicadorInsert): Promise<Indicador> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("indicadores")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível salvar o indicador.");
  }

  return data as Indicador;
}

export async function updateIndicador(id: string, payload: IndicadorUpdate): Promise<Indicador> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("indicadores")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível atualizar o indicador.");
  }

  return data as Indicador;
}

export async function deleteIndicador(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { error } = await supabase.from("indicadores").delete().eq("id", id).eq("usuario_id", user.id);

  if (error) {
    throw new Error("Não foi possível excluir o indicador.");
  }
}

export async function getIndicadoresComContatos(): Promise<(Indicador & { contatos: number })[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("indicadores")
    .select(`
      *,
      contatos_indicados(count)
    `)
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Não foi possível carregar os indicadores com contatos.");
  }

  return (data as (Indicador & { contatos: { count: number }[] })[]).map((item) => ({
    ...item,
    contatos: item.contatos?.[0]?.count ?? 0,
  }));
}