import { createClient } from "@/lib/supabase/client";
import { getAuthenticatedUser } from "@/lib/auth-user";
import type { LiveConvite } from "@/lib/live/types";

type SupabaseError = { message?: string; details?: string; hint?: string; code?: string };

function logSupabaseError(context: string, error: SupabaseError | null) {
  console.error(`[Live Convites] ${context} error:`, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
  });
}

export async function getConvites(liveId: string): Promise<LiveConvite[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("live_convites")
    .select("*")
    .eq("live_id", liveId)
    .order("created_at", { ascending: false });

  if (error) {
    logSupabaseError("getConvites", error);
    return [];
  }
  return (data as LiveConvite[]) ?? [];
}

/**
 * Cria um convite. O token puro NUNCA é enviado ao banco:
 * a rota do servidor gera 32 bytes aleatórios, grava apenas o
 * SHA-256 e devolve o link uma única vez, para o anfitrião copiar.
 */
export async function criarConvite(payload: {
  liveId: string;
  validadeHoras: number;
  limiteAcessos: number | null;
  rotulo: string;
}): Promise<{ convite: LiveConvite; token: string; url: string }> {
  await getAuthenticatedUser();

  const resposta = await fetch("/api/live/convite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const corpo = await resposta.json().catch(() => null);

  if (!resposta.ok || !corpo?.convite) {
    throw new Error(corpo?.erro ?? "Não foi possível gerar o link de convite.");
  }

  return corpo as { convite: LiveConvite; token: string; url: string };
}

export async function revogarConvite(conviteId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("live_convites")
    .update({ revogado: true })
    .eq("id", conviteId);
  if (error) {
    logSupabaseError("revogarConvite", error);
    throw new Error("Não foi possível revogar o convite.");
  }
}

export async function revogarTodosConvites(liveId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("live_convites")
    .update({ revogado: true })
    .eq("live_id", liveId)
    .eq("revogado", false);
  if (error) logSupabaseError("revogarTodosConvites", error);
}
