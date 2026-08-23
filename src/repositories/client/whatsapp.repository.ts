import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser, isAdminOrGestor } from "@/lib/auth-user";

export type MensagemWhatsApp = Database["public"]["Tables"]["whatsapp_mensagens"]["Row"];
export type MensagemWhatsAppInsert = Database["public"]["Tables"]["whatsapp_mensagens"]["Insert"];
export type MensagemWhatsAppUpdate = Database["public"]["Tables"]["whatsapp_mensagens"]["Update"];

function whatsappBaseQuery(supabase: ReturnType<typeof createClient>) {
  return supabase.from("whatsapp_mensagens").select("*");
}

export async function getMensagensWhatsApp(): Promise<MensagemWhatsApp[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = whatsappBaseQuery(supabase).order("created_at", { ascending: false });
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar as mensagens de WhatsApp.");
  return (data as MensagemWhatsApp[]) ?? [];
}

export async function createMensagemWhatsApp(payload: MensagemWhatsAppInsert): Promise<MensagemWhatsApp> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("whatsapp_mensagens")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();
  if (error || !data) throw new Error("Não foi possível salvar a mensagem de WhatsApp.");
  return data as MensagemWhatsApp;
}

export async function updateMensagemWhatsApp(id: string, payload: MensagemWhatsAppUpdate): Promise<MensagemWhatsApp> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("whatsapp_mensagens").update(payload).eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { data, error } = await query.select().single();
  if (error || !data) throw new Error("Não foi possível atualizar a mensagem de WhatsApp.");
  return data as MensagemWhatsApp;
}

export async function deleteMensagemWhatsApp(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("whatsapp_mensagens").delete().eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { error } = await query;
  if (error) throw new Error("Não foi possível excluir a mensagem de WhatsApp.");
}

