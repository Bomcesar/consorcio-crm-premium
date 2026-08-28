import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser, isAdminOrGestor } from "@/lib/auth-user";

export type MaterialConsultor = Database["public"]["Tables"]["materiais_consultores"]["Row"];
export type MaterialConsultorInsert = Database["public"]["Tables"]["materiais_consultores"]["Insert"];
export type MaterialConsultorUpdate = Database["public"]["Tables"]["materiais_consultores"]["Update"];

function materialBaseQuery(supabase: ReturnType<typeof createClient>) {
  return supabase.from("materiais_consultores").select("*");
}

async function getHiddenMaterialIds(usuarioId: string): Promise<Set<string>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("module_item_visibility")
    .select("item_id")
    .eq("module_name", "materiais_consultores")
    .eq("usuario_id", usuarioId)
    .eq("visivel", false);

  return new Set((data ?? []).map((row) => row.item_id));
}

export async function getMateriaisConsultores(): Promise<MaterialConsultor[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const query = materialBaseQuery(supabase).order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar os materiais.");
  const items = (data as MaterialConsultor[]) ?? [];
  if (isAdminOrGestor(user)) return items.filter((item) => item.visivel !== false);
  const hidden = await getHiddenMaterialIds(user.id);
  return items.filter((item) => item.visivel !== false && !hidden.has(item.id));
}

export async function getMateriaisConsultoresByCategoria(categoria: string): Promise<MaterialConsultor[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const query = materialBaseQuery(supabase).eq("categoria", categoria).order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar os materiais.");
  const items = (data as MaterialConsultor[]) ?? [];
  if (isAdminOrGestor(user)) return items.filter((item) => item.visivel !== false);
  const hidden = await getHiddenMaterialIds(user.id);
  return items.filter((item) => item.visivel !== false && !hidden.has(item.id));
}

export async function getMaterialConsultor(id: string): Promise<MaterialConsultor | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const query = materialBaseQuery(supabase).eq("id", id);
  const { data, error } = await query.single();
  if (error || !data) return null;
  if (isAdminOrGestor(user)) return data.visivel === false ? null : (data as MaterialConsultor);
  const hidden = await getHiddenMaterialIds(user.id);
  return hidden.has(data.id) || data.visivel === false ? null : (data as MaterialConsultor);
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
