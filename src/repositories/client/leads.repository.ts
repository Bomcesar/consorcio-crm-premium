import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser, isAdminOrGestor } from "@/lib/auth-user";

export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
export type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];
export type LeadHistorico = Database["public"]["Tables"]["lead_historico"]["Row"];
export type LeadAnexo = Database["public"]["Tables"]["anexos"]["Row"];

function leadBaseQuery(supabase: ReturnType<typeof createClient>) {
  return supabase.from("leads").select("*");
}

export async function getLeads(): Promise<Lead[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = leadBaseQuery(supabase).order("created_at", { ascending: false });
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Não foi possível carregar os leads: ${error.message}`);
  return (data as Lead[]) ?? [];
}

export async function getLead(id: string): Promise<Lead | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = leadBaseQuery(supabase).eq("id", id);
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query.single();
  if (error || !data) return null;
  return data as Lead;
}

export async function createLead(payload: LeadInsert): Promise<Lead> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();
  if (error) throw new Error(`Não foi possível salvar o lead: ${error.message}`);
  return data as Lead;
}

export async function updateLead(id: string, payload: LeadUpdate): Promise<Lead> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("leads").update(payload).eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { data, error } = await query.select().single();
  if (error || !data) throw new Error(`Não foi possível atualizar o lead: ${error?.message ?? "erro desconhecido"}`);
  return data as Lead;
}

export async function deleteLead(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("leads").delete().eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { error } = await query;
  if (error) throw new Error(`Não foi possível excluir o lead: ${error.message}`);
}

export async function searchLeads(query: string): Promise<Lead[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const pattern = `%${query}%`;
  let q = leadBaseQuery(supabase)
    .or(`nome.ilike.${pattern},telefone.ilike.${pattern},cidade.ilike.${pattern},email.ilike.${pattern},observacoes.ilike.${pattern}`)
    .order("created_at", { ascending: false });
  if (!isAdminOrGestor(user)) {
    q = q.eq("usuario_id", user.id);
  }
  const { data, error } = await q;
  if (error) throw new Error(`Não foi possível pesquisar leads: ${error.message}`);
  return (data as Lead[]) ?? [];
}

export async function filterLeadsByStatus(status: string): Promise<Lead[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = leadBaseQuery(supabase).eq("status", status).order("created_at", { ascending: false });
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Não foi possível filtrar leads: ${error.message}`);
  return (data as Lead[]) ?? [];
}

export async function getLeadHistorico(leadId: string): Promise<LeadHistorico[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lead_historico")
    .select("*")
    .eq("lead_id", leadId)
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Não foi possível carregar o histórico: ${error.message}`);
  return (data as LeadHistorico[]) ?? [];
}

export async function addLeadHistorico(leadId: string, payload: { tipo?: string; descricao?: string }) {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lead_historico")
    .insert({ lead_id: leadId, usuario_id: user.id, ...payload })
    .select()
    .single();
  if (error) throw new Error(`Não foi possível adicionar histórico: ${error.message}`);
  return data as LeadHistorico;
}

export async function getLeadAnexos(leadId: string): Promise<LeadAnexo[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("anexos")
    .select("*")
    .eq("entity_type", "lead")
    .eq("entity_id", leadId)
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Não foi possível carregar os anexos: ${error.message}`);
  return (data as LeadAnexo[]) ?? [];
}

export async function addLeadAnexo(leadId: string, file: File) {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = `${user.id}/lead/${leadId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("anexos")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Não foi possível enviar o arquivo: ${uploadError.message}`);
  }

  const { data, error } = await supabase
    .from("anexos")
    .insert({
      entity_type: "lead",
      entity_id: leadId,
      nome: file.name,
      caminho: filePath,
      tipo: file.type || "application/octet-stream",
      tamanho: file.size,
      usuario_id: user.id,
    })
    .select()
    .single();

  if (error || !data) {
    await supabase.storage.from("anexos").remove([filePath]);
    throw new Error(`Não foi possível registrar o anexo: ${error?.message ?? "erro desconhecido"}`);
  }

  return data as LeadAnexo;
}

export async function removeLeadAnexo(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();

  const { data: anexo, error: fetchError } = await supabase
    .from("anexos")
    .select("caminho")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();

  if (fetchError || !anexo) {
    throw new Error("Anexo não encontrado.");
  }

  const { error: deleteDbError } = await supabase
    .from("anexos")
    .delete()
    .eq("id", id)
    .eq("usuario_id", user.id);

  if (deleteDbError) {
    throw new Error(`Não foi possível excluir o registro do anexo: ${deleteDbError.message}`);
  }

  const { error: deleteStorageError } = await supabase.storage
    .from("anexos")
    .remove([anexo.caminho]);

  if (deleteStorageError) {
    console.error("Não foi possível excluir o arquivo do storage:", deleteStorageError);
  }
}

