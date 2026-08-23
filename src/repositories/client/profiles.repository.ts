import { createClient } from "@/lib/supabase/client";
import { getAuthenticatedUser } from "@/lib/auth-user";
import type { Database } from "@/types/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Perfil = Profile;

export async function getProfiles(): Promise<Profile[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("nome", { ascending: true });

  if (error) throw new Error("Não foi possível carregar os perfis.");
  return (data as Profile[]) ?? [];
}

export async function updateProfile(id: string, payload: Partial<Profile>) {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível atualizar o perfil.");
  return data as Profile;
}

export async function createProfile(payload: { id?: string; nome: string; email: string; perfil?: string; senha?: string }) {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { senha, ...profilePayload } = payload;
  const { data, error } = await supabase
    .from("profiles")
    .insert({ ...profilePayload, usuario_id: user.id })
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível criar o perfil.");
  return data as Profile;
}

export async function searchConsultores(query: string): Promise<Profile[]> {
  const supabase = createClient();
  const pattern = `%${query}%`;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nome, email, perfil, ativo")
    .ilike("nome", pattern)
    .or(`email.ilike.${pattern}`)
    .in("perfil", ["Administrador", "Gestor", "Consultor", "Assistente"])
    .order("nome", { ascending: true });

  if (error) throw new Error("Não foi possível pesquisar os consultores.");
  return (data as Profile[]) ?? [];
}
