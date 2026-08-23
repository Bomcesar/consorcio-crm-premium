import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser, isAdminOrGestor } from "@/lib/auth-user";

export type LinkUtil = Database["public"]["Tables"]["links_uteis"]["Row"];
export type LinkUtilInsert = Database["public"]["Tables"]["links_uteis"]["Insert"];
export type LinkUtilUpdate = Database["public"]["Tables"]["links_uteis"]["Update"];

function linkBaseQuery(supabase: ReturnType<typeof createClient>) {
  return supabase.from("links_uteis").select("*");
}

export async function getLinksUteis(): Promise<LinkUtil[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = linkBaseQuery(supabase).order("created_at", { ascending: false });
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar os links.");
  return (data as LinkUtil[]) ?? [];
}

export async function getLinksUteisByCategoria(categoria: string): Promise<LinkUtil[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = linkBaseQuery(supabase).eq("categoria", categoria).order("created_at", { ascending: false });
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar os links.");
  return (data as LinkUtil[]) ?? [];
}

export async function getLinkUtil(id: string): Promise<LinkUtil | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = linkBaseQuery(supabase).eq("id", id);
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query.single();
  if (error || !data) return null;
  return data as LinkUtil;
}

export async function createLinkUtil(payload: LinkUtilInsert): Promise<LinkUtil> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("links_uteis")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();
  if (error || !data) throw new Error("Não foi possível salvar o link.");
  return data as LinkUtil;
}

export async function updateLinkUtil(id: string, payload: LinkUtilUpdate): Promise<LinkUtil> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("links_uteis").update(payload).eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { data, error } = await query.select().single();
  if (error || !data) throw new Error("Não foi possível atualizar o link.");
  return data as LinkUtil;
}

export async function deleteLinkUtil(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("links_uteis").delete().eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { error } = await query;
  if (error) throw new Error("Não foi possível excluir o link.");
}
