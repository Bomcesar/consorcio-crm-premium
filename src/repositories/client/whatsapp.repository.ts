import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type MensagemWhatsApp = Database["public"]["Tables"]["whatsapp_mensagens"]["Row"];
export type MensagemWhatsAppInsert = Database["public"]["Tables"]["whatsapp_mensagens"]["Insert"];
export type MensagemWhatsAppUpdate = Database["public"]["Tables"]["whatsapp_mensagens"]["Update"];

export async function getMensagensWhatsApp(): Promise<MensagemWhatsApp[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("whatsapp_mensagens").select("*").order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar as mensagens de WhatsApp.");
  return (data as MensagemWhatsApp[]) ?? [];
}

export async function createMensagemWhatsApp(payload: MensagemWhatsAppInsert): Promise<MensagemWhatsApp> {
  const supabase = createClient();
  const { data, error } = await supabase.from("whatsapp_mensagens").insert(payload).select().single();
  if (error || !data) throw new Error("Não foi possível salvar a mensagem de WhatsApp.");
  return data as MensagemWhatsApp;
}

export async function updateMensagemWhatsApp(id: string, payload: MensagemWhatsAppUpdate): Promise<MensagemWhatsApp> {
  const supabase = createClient();
  const { data, error } = await supabase.from("whatsapp_mensagens").update(payload).eq("id", id).select().single();
  if (error || !data) throw new Error("Não foi possível atualizar a mensagem de WhatsApp.");
  return data as MensagemWhatsApp;
}

export async function deleteMensagemWhatsApp(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("whatsapp_mensagens").delete().eq("id", id);
  if (error) throw new Error("Não foi possível excluir a mensagem de WhatsApp.");
}

