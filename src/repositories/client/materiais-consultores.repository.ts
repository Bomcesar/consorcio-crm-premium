import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser } from "@/lib/auth-user";

export type MaterialConsultor = Database["public"]["Tables"]["materiais_consultores"]["Row"];
export type MaterialConsultorInsert = Database["public"]["Tables"]["materiais_consultores"]["Insert"];
export type MaterialConsultorUpdate = Database["public"]["Tables"]["materiais_consultores"]["Update"];

export async function getMateriaisConsultores(): Promise<MaterialConsultor[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("materiais_consultores")
    .select("*")
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Não foi possível carregar os materiais.");
  return (data as MaterialConsultor[]) ?? [];
}

export async function getMateriaisConsultoresByCategoria(categoria: string): Promise<MaterialConsultor[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("materiais_consultores")
    .select("*")
    .eq("categoria", categoria)
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Não foi possível carregar os materiais.");
  return (data as MaterialConsultor[]) ?? [];
}

export async function getMaterialConsultor(id: string): Promise<MaterialConsultor | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("materiais_consultores")
    .select("*")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();

  if (error || !data) return null;
  return data as MaterialConsultor;
}

export async function createMaterialConsultor(payload: MaterialConsultorInsert): Promise<MaterialConsultor> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("materiais_consultores")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível salvar o material.");
  return data as MaterialConsultor;
}

export async function updateMaterialConsultor(id: string, payload: MaterialConsultorUpdate): Promise<MaterialConsultor> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("materiais_consultores")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível atualizar o material.");
  return data as MaterialConsultor;
}

export async function deleteMaterialConsultor(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { error } = await supabase.from("materiais_consultores").delete().eq("id", id).eq("usuario_id", user.id);
  if (error) throw new Error("Não foi possível excluir o material.");
}
