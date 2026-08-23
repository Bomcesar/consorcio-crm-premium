import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser, isAdminOrGestor } from "@/lib/auth-user";

export type Comunicacao = Database["public"]["Tables"]["comunicacoes"]["Row"];
export type ComunicacaoInsert = Database["public"]["Tables"]["comunicacoes"]["Insert"];
export type ComunicacaoUpdate = Database["public"]["Tables"]["comunicacoes"]["Update"];

export type ComunicacaoTemplate = Database["public"]["Tables"]["comunicacao_templates"]["Row"];
export type ComunicacaoTemplateInsert = Database["public"]["Tables"]["comunicacao_templates"]["Insert"];
export type ComunicacaoTemplateUpdate = Database["public"]["Tables"]["comunicacao_templates"]["Update"];

function comunicacaoBaseQuery(supabase: ReturnType<typeof createClient>) {
  return supabase.from("comunicacoes").select("*");
}

export async function getComunicacoes(): Promise<Comunicacao[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = comunicacaoBaseQuery(supabase).order("data", { ascending: false }).order("horario", { ascending: false });
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar as comunicações.");
  return (data as Comunicacao[]) ?? [];
}

export async function getComunicacao(id: string): Promise<Comunicacao | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = comunicacaoBaseQuery(supabase).eq("id", id);
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query.single();
  if (error || !data) return null;
  return data as Comunicacao;
}

export async function createComunicacao(payload: ComunicacaoInsert): Promise<Comunicacao> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("comunicacoes")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();
  if (error || !data) throw new Error("Não foi possível salvar a comunicação.");
  return data as Comunicacao;
}

export async function updateComunicacao(id: string, payload: ComunicacaoUpdate): Promise<Comunicacao> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("comunicacoes").update(payload).eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { data, error } = await query.select().single();
  if (error || !data) throw new Error("Não foi possível atualizar a comunicação.");
  return data as Comunicacao;
}

export async function deleteComunicacao(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("comunicacoes").delete().eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { error } = await query;
  if (error) throw new Error("Não foi possível excluir a comunicação.");
}

export async function getTemplates(): Promise<ComunicacaoTemplate[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("comunicacao_templates")
    .select("*")
    .eq("usuario_id", user.id)
    .order("titulo", { ascending: true });
  if (error) throw new Error("Não foi possível carregar os templates.");
  return (data as ComunicacaoTemplate[]) ?? [];
}

export async function getTemplate(id: string): Promise<ComunicacaoTemplate | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("comunicacao_templates")
    .select("*")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();
  if (error || !data) return null;
  return data as ComunicacaoTemplate;
}

export async function createTemplate(payload: ComunicacaoTemplateInsert): Promise<ComunicacaoTemplate> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("comunicacao_templates")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();
  if (error || !data) throw new Error("Não foi possível salvar o template.");
  return data as ComunicacaoTemplate;
}

export async function updateTemplate(id: string, payload: ComunicacaoTemplateUpdate): Promise<ComunicacaoTemplate> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("comunicacao_templates")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();
  if (error || !data) throw new Error("Não foi possível atualizar o template.");
  return data as ComunicacaoTemplate;
}

export async function deleteTemplate(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { error } = await supabase.from("comunicacao_templates").delete().eq("id", id).eq("usuario_id", user.id);
  if (error) throw new Error("Não foi possível excluir o template.");
}
