import { createClient } from "@/lib/supabase/client";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { LIVE_MENSAGEM_MAX, type LiveMensagem } from "@/lib/live/types";

type SupabaseError = { message?: string; details?: string; hint?: string; code?: string };

function logSupabaseError(context: string, error: SupabaseError | null) {
  console.error(`[Live Chat] ${context} error:`, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
  });
}

export async function getMensagens(
  liveId: string,
  limite = 200,
): Promise<LiveMensagem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("live_chat_mensagens")
    .select("*")
    .eq("live_id", liveId)
    .order("created_at", { ascending: true })
    .limit(limite);

  if (error) {
    logSupabaseError("getMensagens", error);
    return [];
  }
  return (data as LiveMensagem[]) ?? [];
}

export async function enviarMensagem(
  liveId: string,
  mensagem: string,
): Promise<LiveMensagem> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();

  const texto = mensagem.trim().slice(0, LIVE_MENSAGEM_MAX);
  if (!texto) throw new Error("Mensagem vazia.");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nome, perfil")
    .eq("id", user.id)
    .single();

  const { data, error } = await supabase
    .from("live_chat_mensagens")
    .insert({
      live_id: liveId,
      autor_usuario_id: user.id,
      nome_exibicao:
        (perfil as { nome?: string } | null)?.nome || user.email || "Participante",
      perfil: (perfil as { perfil?: string } | null)?.perfil ?? null,
      mensagem: texto,
      tipo: "texto",
    })
    .select()
    .single();

  if (error || !data) {
    logSupabaseError("enviarMensagem", error);
    throw new Error("Não foi possível enviar a mensagem.");
  }
  return data as LiveMensagem;
}
