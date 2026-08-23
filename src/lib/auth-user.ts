import { createClient } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/supabase-timeout";
import type { AuthError, PostgrestError } from "@supabase/supabase-js";

export type AuthenticatedUser = {
  id: string;
  email?: string;
  perfil?: string;
  permissoes?: string[];
};

export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const supabase = createClient();
  const authResult = await withTimeout(
    supabase.auth.getUser(),
    8000,
    { data: { user: null }, error: { message: "Timeout ao obter usuário." } as AuthError },
  );

  const { data, error } = authResult;

  if (error || !data.user?.id) {
    throw new Error("Não autenticado.");
  }

  const profileResult = await withTimeout(
    supabase.from("profiles").select("perfil, ativo").eq("id", data.user.id).single(),
    8000,
    { data: null, error: { message: "Timeout ao carregar perfil." } as PostgrestError },
  );

  const { data: profile, error: profileError } = profileResult;

  if (profileError || !profile) {
    return {
      id: data.user.id,
      email: data.user.email ?? undefined,
    };
  }

  if (!profile.ativo) {
    throw new Error("Usuário inativo.");
  }

  const perfil = profile.perfil as string | undefined;

  let permissoes: string[] = [];
  if (perfil === "Administrador" || perfil === "Gestor") {
    const grantsResult = await withTimeout(
      supabase.from("user_permission_grants").select("permissao_id").eq("usuario_id", data.user.id),
      8000,
      { data: null, error: { message: "Timeout ao carregar permissões." } as PostgrestError },
    );

    const grants = await grantsResult;
    if (!grants.error && grants.data) {
      const permissaoIds = grants.data.map((g: { permissao_id: string }) => g.permissao_id);
      if (permissaoIds.length > 0) {
        const permsResult = await withTimeout(
          supabase.from("user_permissions").select("codigo").in("id", permissaoIds),
          8000,
          { data: null, error: { message: "Timeout ao carregar permissões." } as PostgrestError },
        );

        const perms = await permsResult;
        if (!perms.error && perms.data) {
          permissoes = perms.data.map((p: { codigo: string }) => p.codigo);
        }
      }
    }
  }

  return {
    id: data.user.id,
    email: data.user.email ?? undefined,
    perfil,
    permissoes,
  };
}

export function hasPermission(
  user: AuthenticatedUser,
  permission: string
): boolean {
  if (!user.perfil) return false;
  if (user.perfil === "Administrador") return true;
  if (user.perfil === "Gestor") {
    const restrictedPermissions = [
      "usuarios.excluir",
      "usuarios.permissoes",
      "configuracoes.editar",
      "metas.excluir",
      "usuarios.promover_admin",
      "usuarios.alterar_gestor",
    ];
    if (restrictedPermissions.includes(permission)) return false;
    return true;
  }
  return user.permissoes?.includes(permission) ?? false;
}

export function isAdminOrGestor(user: AuthenticatedUser): boolean {
  return user.perfil === "Administrador" || user.perfil === "Gestor";
}

export function canViewUserProfile(currentUser: AuthenticatedUser, targetProfile: { perfil?: string; id?: string }): boolean {
  if (!currentUser.perfil) return false;
  if (currentUser.perfil === "Administrador") return true;
  if (currentUser.perfil === "Gestor") {
    return targetProfile.perfil !== "Administrador";
  }
  return currentUser.id === targetProfile.id;
}

export function canEditUserProfile(currentUser: AuthenticatedUser, targetProfile: { perfil?: string; id?: string }): boolean {
  if (!currentUser.perfil) return false;
  if (currentUser.perfil === "Administrador") return true;
  if (currentUser.perfil === "Gestor") {
    if (targetProfile.perfil === "Administrador") return false;
    if (targetProfile.id && currentUser.id === targetProfile.id) return false;
    return true;
  }
  return false;
}

export function canAssignProfile(currentUser: AuthenticatedUser, newProfile: string): boolean {
  if (!currentUser.perfil) return false;
  if (currentUser.perfil === "Administrador") return true;
  if (currentUser.perfil === "Gestor") {
    if (newProfile === "Administrador") return false;
    if (newProfile === "Gestor") return false;
    return true;
  }
  return false;
}

export function canChangeGestor(currentUser: AuthenticatedUser): boolean {
  if (!currentUser.perfil) return false;
  if (currentUser.perfil === "Administrador") return true;
  if (currentUser.perfil === "Gestor") return true;
  return false;
}

export function getUserRoleRank(user: { perfil?: string }): number {
  switch (user.perfil) {
    case "Administrador":
      return 100;
    case "Gestor":
      return 90;
    default:
      return 0;
  }
}
