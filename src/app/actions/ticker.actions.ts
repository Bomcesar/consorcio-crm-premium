"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TickerMessageInsert } from "@/repositories/client/ticker.repository";

export async function createTickerMessageAction(
  payload: TickerMessageInsert,
): Promise<{ success: boolean; error?: string }> {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return { success: false, error: "Não foi possível inicializar o cliente de administrador." };
  }

  const { data, error } = await supabase
    .from("ticker_messages")
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || "Não foi possível salvar a mensagem." };
  }

  revalidatePath("/mensagens-dinamicas");
  return { success: true };
}
