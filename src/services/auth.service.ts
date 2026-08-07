import { appLog } from "@/lib/logger";
import { getErrorMessage } from "@/lib/errors";
import {
  getCurrentAuthStateRepository,
  signInRepository,
  signOutRepository,
  subscribeAuthStateRepository,
  type LoginInput,
} from "@/repositories/auth.repository";
import type { AppPermission, AuthState, UserRole } from "@/types/auth";

const permissionMatrix: Record<UserRole, AppPermission[]> = {
  Administrador: [
    "dashboard.view",
    "leads.manage",
    "clientes.manage",
    "indicadores.manage",
    "agenda.manage",
    "whatsapp.manage",
    "relatorios.view",
    "comissoes.manage",
    "usuarios.manage",
  ],
  Gestor: [
    "dashboard.view",
    "leads.manage",
    "clientes.manage",
    "indicadores.manage",
    "agenda.manage",
    "whatsapp.manage",
    "relatorios.view",
    "comissoes.manage",
  ],
  Consultor: [
    "dashboard.view",
    "leads.manage",
    "clientes.manage",
    "indicadores.manage",
    "agenda.manage",
    "whatsapp.manage",
    "comissoes.manage",
  ],
  Trainee: ["dashboard.view", "leads.manage", "clientes.manage", "indicadores.manage"],
  Secretaria: ["dashboard.view", "agenda.manage", "whatsapp.manage", "clientes.manage"],
  Indicador: ["dashboard.view", "indicadores.manage"],
};

export async function signInService(input: LoginInput): Promise<void> {
  try {
    await signInRepository(input);
    appLog("info", "auth.login.success", { email: input.email });
  } catch (error) {
    appLog("warn", "auth.login.failed", { email: input.email, error });
    throw new Error(getErrorMessage(error, "E-mail ou senha inválidos. Tente novamente."));
  }
}

export async function signOutService(): Promise<void> {
  try {
    await signOutRepository();
    appLog("info", "auth.logout.success");
  } catch (error) {
    appLog("warn", "auth.logout.failed", error);
    throw new Error(getErrorMessage(error, "Não foi possível sair da sessão."));
  }
}

export async function getCurrentAuthStateService(): Promise<AuthState | null> {
  try {
    return await getCurrentAuthStateRepository();
  } catch (error) {
    appLog("error", "auth.currentState.failed", error);
    throw new Error(getErrorMessage(error, "Nao foi possivel carregar a sessao atual."));
  }
}

export function subscribeAuthStateService(onChange: () => void): () => void {
  return subscribeAuthStateRepository(onChange);
}

export function hasPermissionService(role: UserRole, permission: AppPermission): boolean {
  return permissionMatrix[role]?.includes(permission) ?? false;
}
