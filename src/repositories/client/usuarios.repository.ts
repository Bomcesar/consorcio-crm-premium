import { createClient } from "@/lib/supabase/client";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth-user";

import type { Perfil } from "@/types/database.types";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
  ultimo_login: string | null;
  gestor_id: string | null;
};

export async function getUsuarios(): Promise<Usuario[]> {
  const user = await getAuthenticatedUser();

  if (!hasPermission(user, "usuarios.ver")) {
    throw new Error("Sem permissão para visualizar usuários.");
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, nome, email, perfil, ativo, created_at, updated_at")
    .order("nome", { ascending: true });

  if (error) throw new Error("Não foi possível carregar os usuários.");
  return (data as Usuario[]) ?? [];
}

export async function updateUsuario(
  id: string,
  payload: Partial<Usuario>
): Promise<Usuario> {
  const user = await getAuthenticatedUser();

  if (!hasPermission(user, "usuarios.editar")) {
    throw new Error("Sem permissão para editar usuários.");
  }

  const supabase = createClient();

  const allowedFields = ["nome", "email", "perfil", "ativo"];
  const updateData: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (payload[field as keyof Usuario] !== undefined) {
      updateData[field] = payload[field as keyof Usuario];
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", id)
    .single();

  if (error || !data) {
    throw new Error("Não foi possível atualizar o usuário.");
  }

  return {
    id: (data as { id: string }).id,
    nome: (data as { nome: string }).nome,
    email: (data as { email: string }).email,
    perfil: (data as { perfil: Perfil }).perfil,
    ativo: (data as { ativo: boolean }).ativo,
    avatar_url: (data as { avatar_url: string | null }).avatar_url ?? null,
    ultimo_login: (data as { ultimo_login: string | null }).ultimo_login ?? null,
    gestor_id: (data as { gestor_id: string | null }).gestor_id ?? null,
    created_at: (data as { created_at: string }).created_at,
    updated_at: (data as { updated_at: string }).updated_at,
  };
}

export async function toggleUsuarioAtivo(id: string): Promise<Usuario> {
  const user = await getAuthenticatedUser();

  if (!hasPermission(user, "usuarios.editar")) {
    throw new Error("Sem permissão para alterar status de usuários.");
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("ativo")
    .eq("id", id)
    .single();

  if (error || !data) {
    throw new Error("Usuário não encontrado.");
  }

  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update({ ativo: !data.ativo })
    .eq("id", id)
    .single();

  if (updateError || !updated) {
    throw new Error("Não foi possível atualizar o status do usuário.");
  }

  return {
    id: (updated as { id: string }).id,
    nome: (updated as { nome: string }).nome,
    email: (updated as { email: string }).email,
    perfil: (updated as { perfil: Perfil }).perfil,
    ativo: (updated as { ativo: boolean }).ativo,
    avatar_url: (updated as { avatar_url: string | null }).avatar_url ?? null,
    ultimo_login: (updated as { ultimo_login: string | null }).ultimo_login ?? null,
    gestor_id: (updated as { gestor_id: string | null }).gestor_id ?? null,
    created_at: (updated as { created_at: string }).created_at,
    updated_at: (updated as { updated_at: string }).updated_at,
  };
}
