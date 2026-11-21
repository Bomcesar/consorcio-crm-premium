import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Perfil = Profile;

export async function getProfiles(): Promise<Profile[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("nome", { ascending: true });

  if (error) throw new Error("Não foi possível carregar os perfis.");
  return (data as Profile[]) ?? [];
}

export async function updateProfile(
  id: string,
  payload: Partial<Profile>,
  caller: { id: string; perfil?: string }
) {
  const supabase = createClient();

  // Separar campos pessoais de campos administrativos
  const camposAdministrativos = [
    "perfil",
    "gestor_id",
    "ativo",
    "email",
    "ultimo_login",
    "created_at",
    "updated_at",
  ];

  const payloadKeys = Object.keys(payload);
  const temCamposAdministrativos = payloadKeys.some((k) =>
    camposAdministrativos.includes(k)
  );

  // Se tentar alterar campos administrativos, apenas Administrador pode
  if (temCamposAdministrativos) {
    if (caller.perfil !== "Administrador") {
      throw new Error(
        "Somente Administrador pode alterar campos administrativos do perfil."
      );
    }
  } else {
    // Apenas campos pessoais: só o próprio usuário pode alterar
    if (caller.id !== id) {
      throw new Error(
        "Usuário só pode alterar seus próprios campos pessoais."
      );
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível atualizar o perfil.");
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
    .in("perfil", [
      "Administrador",
      "Gestor",
      "Gestor Pleno",
      "Consultor",
      "Consultor Pleno",
      "Consultor em prévia",
      "Líder em treinamento",
      "Indicador",
      "Trainee",
      "Secretaria",
      "Assistente",
    ])
    .order("nome", { ascending: true });

  if (error) throw new Error("Não foi possível pesquisar os consultores.");
  return (data as Profile[]) ?? [];
}
