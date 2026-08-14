import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser } from "@/lib/auth-user";

export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
export type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];
export type LeadHistorico = Database["public"]["Tables"]["lead_historico"]["Row"];
export type LeadAnexo = Database["public"]["Tables"]["anexos"]["Row"];

export async function getLeads(): Promise<Lead[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os leads.");
  return (data as Lead[]) ?? [];
}

export async function getLead(id: string): Promise<Lead | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();
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
  if (error || !data) throw new Error("Não foi possível salvar o lead.");
  return data as Lead;
}

export async function updateLead(id: string, payload: LeadUpdate): Promise<Lead> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();
  if (error || !data) throw new Error("Não foi possível atualizar o lead.");
  return data as Lead;
}

export async function deleteLead(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("usuario_id", user.id);
  if (error) throw new Error("Não foi possível excluir o lead.");
}

export async function searchLeads(query: string): Promise<Lead[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const pattern = `%${query}%`;
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("usuario_id", user.id)
    .or(`nome.ilike.${pattern},telefone.ilike.${pattern},cidade.ilike.${pattern},email.ilike.${pattern},observacoes.ilike.${pattern}`)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível pesquisar leads.");
  return (data as Lead[]) ?? [];
}

export async function filterLeadsByStatus(status: string): Promise<Lead[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("usuario_id", user.id)
    .eq("status", status)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível filtrar leads.");
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
  if (error) throw new Error("Não foi possível carregar o histórico.");
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
  if (error) throw new Error("Não foi possível adicionar histórico.");
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
  if (error) throw new Error("Não foi possível carregar os anexos.");
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
    throw new Error("Não foi possível registrar o anexo.");
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
    throw new Error("Não foi possível excluir o registro do anexo.");
  }

  const { error: deleteStorageError } = await supabase.storage
    .from("anexos")
    .remove([anexo.caminho]);

  if (deleteStorageError) {
    console.error("Não foi possível excluir o arquivo do storage:", deleteStorageError);
  }
}

