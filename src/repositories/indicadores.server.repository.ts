import { getServerSupabase } from "@/repositories/supabase-server";
import type { Indicator } from "@/types/crm";

export async function getIndicatorByIdRepository(id: string): Promise<Indicator | null> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.from("indicadores").select("*").eq("id", id).single();

  if (error) return null;
  return data as Indicator;
}
