import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser } from "@/lib/auth-user";

export type AgendaEvento = Database["public"]["Tables"]["agenda_eventos"]["Row"];
export type AgendaEventoInsert = Database["public"]["Tables"]["agenda_eventos"]["Insert"];
export type AgendaEventoUpdate = Database["public"]["Tables"]["agenda_eventos"]["Update"];

export type AgendaTarefa = Database["public"]["Tables"]["agenda_tarefas"]["Row"];
export type AgendaTarefaInsert = Database["public"]["Tables"]["agenda_tarefas"]["Insert"];
export type AgendaTarefaUpdate = Database["public"]["Tables"]["agenda_tarefas"]["Update"];

export type AgendaFollowup = Database["public"]["Tables"]["agenda_followups"]["Row"];
export type AgendaFollowupInsert = Database["public"]["Tables"]["agenda_followups"]["Insert"];
export type AgendaFollowupUpdate = Database["public"]["Tables"]["agenda_followups"]["Update"];

export async function getEventosAgenda(): Promise<AgendaEvento[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("agenda_eventos")
    .select("*")
    .eq("usuario_id", user.id)
    .order("data_inicio", { ascending: true });
  if (error) throw new Error("Não foi possível carregar os eventos da agenda.");
  return (data as AgendaEvento[]) ?? [];
}

export async function getEventoAgenda(id: string): Promise<AgendaEvento | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("agenda_eventos")
    .select("*")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();
  if (error || !data) return null;
  return data as AgendaEvento;
}

export async function createEventoAgenda(payload: AgendaEventoInsert): Promise<AgendaEvento> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("agenda_eventos")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();
  if (error || !data) throw new Error("Não foi possível salvar o evento da agenda.");
  return data as AgendaEvento;
}

export async function updateEventoAgenda(id: string, payload: AgendaEventoUpdate): Promise<AgendaEvento> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("agenda_eventos")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();
  if (error || !data) throw new Error("Não foi possível atualizar o evento da agenda.");
  return data as AgendaEvento;
}

export async function deleteEventoAgenda(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { error } = await supabase.from("agenda_eventos").delete().eq("id", id).eq("usuario_id", user.id);
  if (error) throw new Error("Não foi possível excluir o evento da agenda.");
}

export async function getTarefas(): Promise<AgendaTarefa[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("agenda_tarefas")
    .select("*")
    .eq("usuario_id", user.id)
    .order("data_inicio", { ascending: true });
  if (error) throw new Error("Não foi possível carregar as tarefas.");
  return (data as AgendaTarefa[]) ?? [];
}

export async function getTarefa(id: string): Promise<AgendaTarefa | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("agenda_tarefas")
    .select("*")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();
  if (error || !data) return null;
  return data as AgendaTarefa;
}

export async function createTarefa(payload: AgendaTarefaInsert): Promise<AgendaTarefa> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("agenda_tarefas")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();
  if (error || !data) throw new Error("Não foi possível salvar a tarefa.");
  return data as AgendaTarefa;
}

export async function updateTarefa(id: string, payload: AgendaTarefaUpdate): Promise<AgendaTarefa> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("agenda_tarefas")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();
  if (error || !data) throw new Error("Não foi possível atualizar a tarefa.");
  return data as AgendaTarefa;
}

export async function deleteTarefa(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { error } = await supabase.from("agenda_tarefas").delete().eq("id", id).eq("usuario_id", user.id);
  if (error) throw new Error("Não foi possível excluir a tarefa.");
}

export async function getFollowups(eventoId: string): Promise<AgendaFollowup[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("agenda_followups")
    .select("*")
    .eq("evento_id", eventoId)
    .eq("usuario_id", user.id)
    .order("data_prevista", { ascending: true });
  if (error) throw new Error("Não foi possível carregar os follow-ups.");
  return (data as AgendaFollowup[]) ?? [];
}

export async function createFollowup(payload: AgendaFollowupInsert): Promise<AgendaFollowup> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("agenda_followups")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();
  if (error || !data) throw new Error("Não foi possível salvar o follow-up.");
  return data as AgendaFollowup;
}

export async function updateFollowup(id: string, payload: AgendaFollowupUpdate): Promise<AgendaFollowup> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("agenda_followups")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();
  if (error || !data) throw new Error("Não foi possível atualizar o follow-up.");
  return data as AgendaFollowup;
}

export async function deleteFollowup(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { error } = await supabase.from("agenda_followups").delete().eq("id", id).eq("usuario_id", user.id);
  if (error) throw new Error("Não foi possível excluir o follow-up.");
}

