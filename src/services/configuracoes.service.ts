import { getErrorMessage } from "@/lib/errors";
import { appLog } from "@/lib/logger";
import {
  getProfileRepository,
  getUserSettingsRepository,
  resetUserSettingsRepository,
  saveUserSettingsRepository,
  updateProfileRepository,
  type ProfileUpdateInput,
  type UserSettingsUpdateInput,
} from "@/repositories/configuracoes.repository";
import type { AuthProfile } from "@/types/auth";
import type { UserSettings } from "@/types/crm";

export async function getConfiguracoesService(userId: string): Promise<{ profile: AuthProfile | null; settings: UserSettings }> {
  try {
    const [profile, settings] = await Promise.all([getProfileRepository(userId), getUserSettingsRepository(userId)]);
    return { profile, settings };
  } catch (error) {
    appLog("error", "configuracoes.load.failed", { error, userId });
    throw new Error(getErrorMessage(error, "Nao foi possivel carregar as configuracoes."));
  }
}

export async function savePerfilService(userId: string, input: ProfileUpdateInput): Promise<AuthProfile> {
  try {
    return await updateProfileRepository(userId, input);
  } catch (error) {
    appLog("error", "configuracoes.profile.save.failed", { error, userId, input });
    throw new Error(getErrorMessage(error, "Nao foi possivel salvar o perfil."));
  }
}

export async function saveConfiguracoesService(userId: string, input: UserSettingsUpdateInput): Promise<UserSettings> {
  try {
    return await saveUserSettingsRepository(userId, input);
  } catch (error) {
    appLog("error", "configuracoes.settings.save.failed", { error, userId, input });
    throw new Error(getErrorMessage(error, "Nao foi possivel salvar as configuracoes."));
  }
}

export async function resetConfiguracoesService(userId: string): Promise<UserSettings> {
  try {
    return await resetUserSettingsRepository(userId);
  } catch (error) {
    appLog("error", "configuracoes.settings.reset.failed", { error, userId });
    throw new Error(getErrorMessage(error, "Nao foi possivel restaurar as configuracoes."));
  }
}