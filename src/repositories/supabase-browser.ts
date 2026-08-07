import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { AppError } from "@/lib/errors";

export function getBrowserSupabase() {
  if (!isSupabaseConfigured()) {
    throw new AppError("A configuração do Supabase não foi encontrada.", "SUPABASE_NOT_CONFIGURED");
  }

  return createClient();
}
