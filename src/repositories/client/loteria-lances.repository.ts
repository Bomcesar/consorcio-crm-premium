import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser } from "@/lib/auth-user";

export type LoteriaFederal = Database["public"]["Tables"]["loteria_federal"]["Row"];
export type LoteriaFederalInsert = Database["public"]["Tables"]["loteria_federal"]["Insert"];
export type LoteriaFederalUpdate = Database["public"]["Tables"]["loteria_federal"]["Update"];
export type Lance = Database["public"]["Tables"]["lances"]["Row"];
export type LanceInsert = Database["public"]["Tables"]["lances"]["Insert"];
export type LanceUpdate = Database["public"]["Tables"]["lances"]["Update"];

export async function getLoteriaFederal(): Promise<LoteriaFederal[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("loteria_federal")
    .select("*")
    .eq("usuario_id", user.id)
    .order("data", { ascending: false });

  if (error) throw new Error("Não foi possível carregar os resultados da Loteria Federal.");
  return (data as LoteriaFederal[]) ?? [];
}

export async function getLoteriaFederalByExtracao(numeroExtracao: number): Promise<LoteriaFederal | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("loteria_federal")
    .select("*")
    .eq("numero_extracao", numeroExtracao)
    .eq("usuario_id", user.id)
    .single();

  if (error || !data) return null;
  return data as LoteriaFederal;
}

export async function createLoteriaFederal(payload: LoteriaFederalInsert): Promise<LoteriaFederal> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("loteria_federal")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível salvar o resultado da Loteria Federal.");
  return data as LoteriaFederal;
}

export async function updateLoteriaFederal(id: string, payload: LoteriaFederalUpdate): Promise<LoteriaFederal> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("loteria_federal")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível atualizar o resultado da Loteria Federal.");
  return data as LoteriaFederal;
}

export async function deleteLoteriaFederal(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { error } = await supabase.from("loteria_federal").delete().eq("id", id).eq("usuario_id", user.id);
  if (error) throw new Error("Não foi possível excluir o resultado da Loteria Federal.");
}

export async function getLances(): Promise<Lance[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("lances")
    .select("*")
    .eq("usuario_id", user.id)
    .order("data", { ascending: false });

  if (error) throw new Error("Não foi possível carregar os lances.");
  return (data as Lance[]) ?? [];
}

export async function getLancesByAssembleia(assembleiaId: string): Promise<Lance[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("lances")
    .select("*")
    .eq("assembleia_id", assembleiaId)
    .eq("usuario_id", user.id)
    .order("data", { ascending: false });

  if (error) throw new Error("Não foi possível carregar os lances da assembleia.");
  return (data as Lance[]) ?? [];
}

export async function getLance(id: string): Promise<Lance | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("lances")
    .select("*")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();

  if (error || !data) return null;
  return data as Lance;
}

export async function createLance(payload: LanceInsert): Promise<Lance> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("lances")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível salvar o lance.");
  return data as Lance;
}

export async function updateLance(id: string, payload: LanceUpdate): Promise<Lance> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("lances")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível atualizar o lance.");
  return data as Lance;
}

export async function deleteLance(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { error } = await supabase.from("lances").delete().eq("id", id).eq("usuario_id", user.id);
  if (error) throw new Error("Não foi possível excluir o lance.");
}
