import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import type { Database } from "@/types/database.types";

export type Assembleia = Database["public"]["Tables"]["assembleias"]["Row"];
export type AssembleiaInsert = Database["public"]["Tables"]["assembleias"]["Insert"];
export type AssembleiaUpdate = Database["public"]["Tables"]["assembleias"]["Update"];
export type AssembleiaAviso = Database["public"]["Tables"]["assembleia_avisos"]["Row"];
export type AssembleiaAvisoInsert = Database["public"]["Tables"]["assembleia_avisos"]["Insert"];
export type AssembleiaAvisoUpdate = Database["public"]["Tables"]["assembleia_avisos"]["Update"];
export type AssembleiaHistorico = Database["public"]["Tables"]["assembleia_historico"]["Row"];

export async function getAssembleias(): Promise<Assembleia[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assembleias")
    .select("*")
    .eq("usuario_id", user.id)
    .order("data", { ascending: true });

  if (error) {
    throw new Error("Não foi possível carregar as assembleias.");
  }

  return (data as Assembleia[]) ?? [];
}

export async function getAssembleia(id: string): Promise<Assembleia | null> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assembleias")
    .select("*")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Assembleia;
}

export async function createAssembleia(payload: AssembleiaInsert): Promise<Assembleia> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assembleias")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível salvar a assembleia.");
  }

  return data as Assembleia;
}

export async function updateAssembleia(id: string, payload: AssembleiaUpdate): Promise<Assembleia> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assembleias")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível atualizar a assembleia.");
  }

  return data as Assembleia;
}

export async function deleteAssembleia(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { error } = await supabase.from("assembleias").delete().eq("id", id).eq("usuario_id", user.id);

  if (error) {
    throw new Error("Não foi possível excluir a assembleia.");
  }
}

export async function getAssembleiaAvisos(assembleiaId: string): Promise<AssembleiaAviso[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assembleia_avisos")
    .select("*")
    .eq("assembleia_id", assembleiaId)
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Não foi possível carregar os avisos.");
  return (data as AssembleiaAviso[]) ?? [];
}

export async function createAssembleiaAviso(payload: AssembleiaAvisoInsert): Promise<AssembleiaAviso> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assembleia_avisos")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível salvar o aviso.");
  return data as AssembleiaAviso;
}

export async function updateAssembleiaAviso(id: string, payload: AssembleiaAvisoUpdate): Promise<AssembleiaAviso> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assembleia_avisos")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível atualizar o aviso.");
  return data as AssembleiaAviso;
}

export async function deleteAssembleiaAviso(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { error } = await supabase.from("assembleia_avisos").delete().eq("id", id).eq("usuario_id", user.id);

  if (error) {
    throw new Error("Não foi possível excluir o aviso.");
  }
}

export async function getAssembleiaHistorico(assembleiaId: string): Promise<AssembleiaHistorico[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assembleia_historico")
    .select("*")
    .eq("assembleia_id", assembleiaId)
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Não foi possível carregar o histórico.");
  return (data as AssembleiaHistorico[]) ?? [];
}

export async function addAssembleiaHistorico(assembleiaId: string, payload: { tipo?: string; descricao?: string }) {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assembleia_historico")
    .insert({ assembleia_id: assembleiaId, usuario_id: user.id, ...payload })
    .select()
    .single();

  if (error) throw new Error("Não foi possível adicionar histórico.");
  return data as AssembleiaHistorico;
}