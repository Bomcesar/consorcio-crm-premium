import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import type { Database } from "@/types/database.types";

export type WhatsAppMensagem = Database["public"]["Tables"]["whatsapp_mensagens"]["Row"];
export type WhatsAppMensagemInsert = Database["public"]["Tables"]["whatsapp_mensagens"]["Insert"];
export type WhatsAppMensagemUpdate = Database["public"]["Tables"]["whatsapp_mensagens"]["Update"];

export async function getMensagensWhatsApp(): Promise<WhatsAppMensagem[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whatsapp_mensagens")
    .select("*")
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Não foi possível carregar as mensagens de WhatsApp.");
  }

  return (data as WhatsAppMensagem[]) ?? [];
}

export async function createMensagemWhatsApp(payload: WhatsAppMensagemInsert): Promise<WhatsAppMensagem> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whatsapp_mensagens")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível salvar a mensagem de WhatsApp.");
  }

  return data as WhatsAppMensagem;
}

export async function updateMensagemWhatsApp(
  id: string,
  payload: WhatsAppMensagemUpdate
): Promise<WhatsAppMensagem> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whatsapp_mensagens")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível atualizar a mensagem de WhatsApp.");
  }

  return data as WhatsAppMensagem;
}

export async function deleteMensagemWhatsApp(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const { error } = await supabase.from("whatsapp_mensagens").delete().eq("id", id).eq("usuario_id", user.id);

  if (error) {
    throw new Error("Não foi possível excluir a mensagem de WhatsApp.");
  }
}