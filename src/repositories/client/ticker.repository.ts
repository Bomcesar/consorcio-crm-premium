import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type TickerMessage = Database["public"]["Tables"]["ticker_messages"]["Row"];
export type TickerMessageInsert = Database["public"]["Tables"]["ticker_messages"]["Insert"];
export type TickerMessageUpdate = Database["public"]["Tables"]["ticker_messages"]["Update"];

export async function getTickerMessages(): Promise<TickerMessage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ticker_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error("Não foi possível carregar as mensagens.");
  return (data as TickerMessage[]) ?? [];
}

export async function createTickerMessage(payload: TickerMessageInsert): Promise<TickerMessage> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ticker_messages")
    .insert(payload)
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível salvar a mensagem.");
  return data as TickerMessage;
}

export async function updateTickerMessage(id: string, payload: TickerMessageUpdate): Promise<TickerMessage> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ticker_messages")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível atualizar a mensagem.");
  return data as TickerMessage;
}

export async function deleteTickerMessage(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("ticker_messages")
    .delete()
    .eq("id", id);

  if (error) throw new Error("Não foi possível excluir a mensagem.");
}
