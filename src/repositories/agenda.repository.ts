import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import type { Database } from "@/types/database.types";

export type AgendaEvento = Database["public"]["Tables"]["agenda_eventos"]["Row"];
export type AgendaEventoInsert = Database["public"]["Tables"]["agenda_eventos"]["Insert"];
export type AgendaEventoUpdate = Database["public"]["Tables"]["agenda_eventos"]["Update"];

export type EventoAgenda = AgendaEvento;
export type EventoAgendaInsert = AgendaEventoInsert;
export type EventoAgendaUpdate = AgendaEventoUpdate;

export async function getEventosAgenda(): Promise<EventoAgenda[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agenda_eventos")
    .select("*")
    .eq("usuario_id", user.id)
    .order("data_inicio", { ascending: true });

  if (error) {
    throw new Error("Não foi possível carregar os eventos da agenda.");
  }

  return (data as EventoAgenda[]) ?? [];
}

export async function getEventoAgenda(id: string): Promise<EventoAgenda | null> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agenda_eventos")
    .select("*")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as EventoAgenda;
}

export async function createEventoAgenda(payload: EventoAgendaInsert): Promise<EventoAgenda> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agenda_eventos")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível salvar o evento da agenda.");
  }

  return data as EventoAgenda;
}

export async function updateEventoAgenda(id: string, payload: EventoAgendaUpdate): Promise<EventoAgenda> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agenda_eventos")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível atualizar o evento da agenda.");
  }

  return data as EventoAgenda;
}

export async function deleteEventoAgenda(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { error } = await supabase.from("agenda_eventos").delete().eq("id", id).eq("usuario_id", user.id);

  if (error) {
    throw new Error("Não foi possível excluir o evento da agenda.");
  }
}