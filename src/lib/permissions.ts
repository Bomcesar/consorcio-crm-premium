export type PerfilUsuario = "Administrador" | "Gestor" | "Consultor" | "Assistente";

export const ROLE_HIERARCHY: Record<PerfilUsuario, number> = {
  Administrador: 4,
  Gestor: 3,
  Consultor: 2,
  Assistente: 1,
};

export function hasRole(userRole: string, requiredRole: PerfilUsuario): boolean {
  const user = ROLE_HIERARCHY[userRole as PerfilUsuario];
  const required = ROLE_HIERARCHY[requiredRole];
  if (!user || !required) return false;
  return user >= required;
}

export function isAdminOrGestor(userRole: string): boolean {
  return userRole === "Administrador" || userRole === "Gestor";
}
