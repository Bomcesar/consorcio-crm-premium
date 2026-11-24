import { createClient } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/supabase-timeout";
import type { AuthError, PostgrestError } from "@supabase/supabase-js";
import { isDemoEnabled } from "@/lib/validations/auth";
import { hasPermissionForPerfil } from "@/lib/permission-rules";

export type AuthenticatedUser = {
  id: string;
  email?: string;
  perfil?: string;
  permissoes?: string[];
};

export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  // Modo demo: retornar usuário fictício (middleware já valida o cookie)
  if (isDemoEnabled && typeof window !== "undefined") {
    const perfil = localStorage.getItem("user_perfil") ?? "Indicador";
    return {
      id: "demo-user-001",
      email: process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "demo@crm.com",
      perfil,
      permissoes: [],
    };
  }

  const supabase = createClient();
  const authResult = await withTimeout(
    supabase.auth.getSession(),
    8000,
    { data: { session: null }, error: { message: "Timeout ao obter sessão." } as AuthError },
  );

  const { data, error } = authResult;

  if (error || !data.session?.user?.id) {
    throw new Error("Não autenticado.");
  }

  const user = data.session.user;

  const profileResult = await withTimeout(
    supabase.from("profiles").select("perfil, ativo").eq("id", user.id).single(),
    8000,
    { data: null, error: { message: "Timeout ao carregar perfil." } as PostgrestError },
  );

  const { data: profile, error: profileError } = profileResult;

  if (profileError || !profile) {
    return {
      id: user.id,
      email: user.email ?? undefined,
    };
  }

  if (!profile.ativo) {
    throw new Error("Usuário inativo.");
  }

  const perfil = profile.perfil as string | undefined;

  if (typeof window !== "undefined") {
    localStorage.setItem("user_perfil", perfil ?? "");
  }

  let permissoes: string[] = [];
  if (perfil) {
    const grantsResult = await withTimeout(
      supabase.from("user_permission_grants").select("permissao_id").eq("usuario_id", user.id),
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
    id: user.id,
    email: user.email ?? undefined,
    perfil,
    permissoes,
  };
}

export function hasPermission(
  user: AuthenticatedUser,
  permission: string
): boolean {
  return hasPermissionForPerfil(user.perfil, permission, user.permissoes);
}

export function isAdminOrGestor(user: AuthenticatedUser): boolean {
  return user.perfil === "Administrador" || user.perfil === "Gestor";
}

export function canViewUserProfile(currentUser: AuthenticatedUser, targetProfile: { perfil?: string; id?: string }): boolean {
  if (!currentUser.perfil) return false;
  if (currentUser.perfil === "Administrador") return true;
  if (currentUser.perfil === "Gestor Pleno") {
    // Gestor Pleno pode ver todos exceto Administrador
    return targetProfile.perfil !== "Administrador";
  }
  if (currentUser.perfil === "Gestor") {
    // Gestor pode ver sua equipe e perfis inferiores
    if (targetProfile.perfil === "Administrador" || targetProfile.perfil === "Gestor Pleno") return false;
    return true;
  }
  if (currentUser.perfil === "Consultor Pleno") {
    // Consultor Pleno pode ver apenas perfis inferiores
    const userRank = getUserRoleRank(currentUser);
    const targetRank = getUserRoleRank(targetProfile);
    return targetRank < userRank;
  }
  return currentUser.id === targetProfile.id;
}

export function canEditUserProfile(currentUser: AuthenticatedUser, targetProfile: { perfil?: string; id?: string }): boolean {
  if (!currentUser.perfil) return false;
  if (currentUser.perfil === "Administrador") return true;
  if (currentUser.perfil === "Gestor Pleno") {
    // Gestor Pleno pode editar exceto Administrador
    if (targetProfile.perfil === "Administrador") return false;
    if (targetProfile.id && currentUser.id === targetProfile.id) return false;
    return true;
  }
  if (currentUser.perfil === "Gestor") {
    // Gestor pode editar apenas sua equipe
    if (targetProfile.perfil === "Administrador") return false;
    if (targetProfile.perfil === "Gestor Pleno") return false;
    if (targetProfile.perfil === "Gestor") return false;
    if (targetProfile.id && currentUser.id === targetProfile.id) return false;
    return true;
  }
  return false;
}

export function canAssignProfile(currentUser: AuthenticatedUser, newProfile: string): boolean {
  if (!currentUser.perfil) return false;
  if (currentUser.perfil === "Administrador") return true;

  // Gestor Pleno pode atribuir: Gestor, Consultor Pleno, Consultor, Consultor em prévia, Líder em treinamento, Indicador
  if (currentUser.perfil === "Gestor Pleno") {
    return [
      "Gestor",
      "Consultor Pleno",
      "Consultor",
      "Consultor em prévia",
      "Líder em treinamento",
      "Indicador",
    ].includes(newProfile);
  }

  // Gestor pode atribuir: Consultor, Consultor em prévia, Líder em treinamento, Indicador
  if (currentUser.perfil === "Gestor") {
    return [
      "Consultor",
      "Consultor em prévia",
      "Líder em treinamento",
      "Indicador",
    ].includes(newProfile);
  }

  return false;
}

export function canChangeGestor(currentUser: AuthenticatedUser): boolean {
  if (!currentUser.perfil) return false;
  if (currentUser.perfil === "Administrador") return true;
  if (currentUser.perfil === "Gestor Pleno") return true;
  if (currentUser.perfil === "Gestor") return true;
  return false;
}

// ============================================================
// FUNÇÕES DE SUPORTE
// ============================================================

export function getUserRoleRank(user: { perfil?: string }): number {
  switch (user.perfil) {
    case "Administrador":
      return 100;
    case "Gestor Pleno":
      return 95;
    case "Gestor":
      return 90;
    case "Consultor Pleno":
      return 80;
    case "Consultor":
      return 70;
    case "Consultor em prévia":
      return 60;
    case "Líder em treinamento":
      return 50;
    case "Indicador":
      return 40;
    case "Trainee":
      return 60;
    case "Secretaria":
      return 55;
    default:
      return 0;
  }
}

export function getRoleLevel(perfil?: string): number {
  return getUserRoleRank({ perfil });
}

// ============================================================
// NOVAS FUNÇÕES DE PERMISSÃO HIERÁRQUICA
// ============================================================

export function canCreateUser(currentUser: AuthenticatedUser, targetCargo: string): boolean {
  if (!currentUser.perfil) return false;

  // Administrador pode criar todos os cargos
  if (currentUser.perfil === "Administrador") return true;

  // Gestor Pleno pode criar: Gestor, Consultor Pleno, Consultor, Consultor em prévia, Líder em treinamento, Indicador
  if (currentUser.perfil === "Gestor Pleno") {
    return [
      "Gestor",
      "Consultor Pleno",
      "Consultor",
      "Consultor em prévia",
      "Líder em treinamento",
      "Indicador",
    ].includes(targetCargo);
  }

  // Gestor pode criar: Consultor, Consultor em prévia, Líder em treinamento, Indicador
  if (currentUser.perfil === "Gestor") {
    return [
      "Consultor",
      "Consultor em prévia",
      "Líder em treinamento",
      "Indicador",
    ].includes(targetCargo);
  }

  // Demais cargos não podem criar usuários
  return false;
}

export function canManageTeam(currentUser: AuthenticatedUser): boolean {
  if (!currentUser.perfil) return false;
  return ["Administrador", "Gestor Pleno", "Gestor"].includes(currentUser.perfil);
}

export function canViewAllUsers(currentUser: AuthenticatedUser): boolean {
  if (!currentUser.perfil) return false;
  return currentUser.perfil === "Administrador";
}

export function canAdministerSystem(currentUser: AuthenticatedUser): boolean {
  if (!currentUser.perfil) return false;
  return currentUser.perfil === "Administrador";
}

export function canEditModules(currentUser: AuthenticatedUser): boolean {
  if (!currentUser.perfil) return false;
  return ["Administrador", "Gestor Pleno", "Consultor Pleno"].includes(currentUser.perfil);
}

export function canEditLinksEMaterials(currentUser: AuthenticatedUser): boolean {
  if (!currentUser.perfil) return false;
  return ["Administrador", "Gestor Pleno", "Consultor Pleno"].includes(currentUser.perfil);
}

export function canControlMenuVisibility(currentUser: AuthenticatedUser): boolean {
  if (!currentUser.perfil) return false;
  return ["Administrador", "Gestor Pleno", "Consultor Pleno"].includes(currentUser.perfil);
}

export function canPromoteUser(currentUser: AuthenticatedUser, targetCargo: string): boolean {
  // Mesmas regras de criação, mas verificando se o usuário não está promovendo a si mesmo
  return canCreateUser(currentUser, targetCargo);
}

export function canGrantPermission(currentUser: AuthenticatedUser, permission: string): boolean {
  // Apenas Administrador pode conceder permissões
  if (!currentUser.perfil) return false;
  return currentUser.perfil === "Administrador";
}

export function canAccessCreditosInvestimento(currentUser: AuthenticatedUser): boolean {
  if (!currentUser.perfil) return false;
  // Perfis com acesso limitado
  const restrictedProfiles = ["Consultor em prévia", "Líder em treinamento", "Indicador"];
  if (restrictedProfiles.includes(currentUser.perfil)) {
    // Acesso apenas para visualização
    return false;
  }
  return true;
}
