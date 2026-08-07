import { getBrowserSupabase } from "@/repositories/supabase-browser";
import type { Lead } from "@/types/crm";

export type LeadInsertInput = {
  nome: string;
  telefone: string;
  cidade: string;
  status: string;
  observacoes: string;
};

export type LeadUpdateInput = Partial<LeadInsertInput>;

export async function listLeadsRepository(): Promise<Lead[]> {
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });

  if (error) throw error;
  return (data as Lead[]) ?? [];
}

export async function createLeadRepository(input: LeadInsertInput): Promise<Lead> {
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase.from("leads").insert(input).select().single();

  if (error) throw error;
  return data as Lead;
}

export async function updateLeadRepository(id: string, input: LeadUpdateInput): Promise<Lead> {
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase.from("leads").update(input).eq("id", id).select().single();

  if (error) throw error;
  return data as Lead;
}

export async function deleteLeadRepository(id: string): Promise<void> {
  const supabase = getBrowserSupabase();
  const { error } = await supabase.from("leads").delete().eq("id", id);

  if (error) throw error;
}
