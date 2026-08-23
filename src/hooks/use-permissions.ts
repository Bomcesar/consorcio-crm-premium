import { useMemo } from "react";

type Permission = string;

export function usePermissions() {
  const perfil = typeof window !== "undefined" ? localStorage.getItem("user_perfil") : null;
  const permissoes = useMemo(() => typeof window !== "undefined" ? (localStorage.getItem("user_permissoes")?.split(",") ?? []) : [], []);

  const hasPermission = useMemo(() => {
    return (permission: Permission): boolean => {
      if (!perfil) return false;
      if (perfil === "Administrador") return true;
      if (perfil === "Gestor") {
        const restricted = [
          "usuarios.excluir",
          "usuarios.permissoes",
          "configuracoes.editar",
          "metas.excluir",
        ];
        if (restricted.includes(permission)) return false;
        return true;
      }
      return permissoes.includes(permission);
    };
  }, [perfil, permissoes]);

  const canAccess = useMemo(() => {
    return (allowedRoles?: string[]): boolean => {
      if (!perfil) return false;
      if (!allowedRoles) return true;
      return allowedRoles.includes(perfil);
    };
  }, [perfil]);

  return {
    perfil,
    permissoes,
    hasPermission,
    canAccess,
    isAdmin: perfil === "Administrador",
    isGestor: perfil === "Gestor",
    isConsultor: perfil === "Consultor",
    isAssistente: perfil === "Assistente",
    canManageUsers: perfil === "Administrador" || perfil === "Gestor",
  };
}
