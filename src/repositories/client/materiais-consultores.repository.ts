import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser, isAdminOrGestor } from "@/lib/auth-user";

export type MaterialConsultor = Database["public"]["Tables"]["materiais_consultores"]["Row"];
export type MaterialConsultorInsert = Database["public"]["Tables"]["materiais_consultores"]["Insert"];
export type MaterialConsultorUpdate = Database["public"]["Tables"]["materiais_consultores"]["Update"];

function materialBaseQuery(supabase: ReturnType<typeof createClient>) {
  return supabase.from("materiais_consultores").select("*");
}

export async function getMateriaisConsultores(): Promise<MaterialConsultor[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = materialBaseQuery(supabase).order("created_at", { ascending: false });
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar os materiais.");
  return (data as MaterialConsultor[]) ?? [];
}

export async function getMateriaisConsultoresByCategoria(categoria: string): Promise<MaterialConsultor[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = materialBaseQuery(supabase).eq("categoria", categoria).order("created_at", { ascending: false });
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar os materiais.");
  return (data as MaterialConsultor[]) ?? [];
}

export async function getMaterialConsultor(id: string): Promise<MaterialConsultor | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = materialBaseQuery(supabase).eq("id", id);
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query.single();
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
  const base = supabase.from("materiais_consultores").update(payload).eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { data, error } = await query.select().single();
  if (error || !data) throw new Error("Não foi possível atualizar o material.");
  return data as MaterialConsultor;
}

export async function deleteMaterialConsultor(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("materiais_consultores").delete().eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { error } = await query;
  if (error) throw new Error("Não foi possível excluir o material.");
}
