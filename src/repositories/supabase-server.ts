import { createClient } from "@/lib/supabase/server";

export async function getServerSupabase() {
  return createClient();
}
