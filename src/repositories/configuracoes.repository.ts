import { getBrowserSupabase } from "@/repositories/supabase-browser";
import type { AuthProfile } from "@/types/auth";
import type { Database } from "@/types/database.types";
import type { UserSettings } from "@/types/crm";

export type ProfileUpdateInput = {
  nome: string;
  email: string;
  avatar_url: string;
};

export type UserSettingsUpdateInput = Partial<Omit<UserSettings, "id" | "usuario_id" | "created_at" | "updated_at">>;

type UserSettingsRow = Database["public"]["Tables"]["user_settings"]["Row"];

const defaultSettings: Omit<UserSettingsRow, "id" | "usuario_id" | "created_at" | "updated_at"> = {
  calendar_integration_enabled: false,
  calendar_email: "",
  whatsapp_integration_enabled: false,
  whatsapp_webhook_url: "",
  whatsapp_api_key: "",
  notification_email: true,
  notification_whatsapp: true,
  language: "pt-BR",
  page_size: 10,
  default_indicator_status: "Novo",
  compact_sidebar: false,
  auto_refresh_dashboard: true,
  dashboard_refresh_seconds: 30,
};

export async function getProfileRepository(userId: string): Promise<AuthProfile | null> {
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nome, email, perfil, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as AuthProfile | null) ?? null;
}

export async function updateProfileRepository(userId: string, input: ProfileUpdateInput): Promise<AuthProfile> {
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      nome: input.nome,
      email: input.email,
      avatar_url: input.avatar_url || null,
    })
    .eq("id", userId)
    .select("id, nome, email, perfil, avatar_url")
    .single();

  if (error) throw error;
  return data as AuthProfile;
}

export async function getUserSettingsRepository(userId: string): Promise<UserSettings> {
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("usuario_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const { data: created, error: insertError } = await supabase
      .from("user_settings")
      .insert({ usuario_id: userId, ...defaultSettings })
      .select("*")
      .single();

    if (insertError) throw insertError;
    return created as UserSettings;
  }

  return data as UserSettings;
}

export async function saveUserSettingsRepository(userId: string, input: UserSettingsUpdateInput): Promise<UserSettings> {
  const supabase = getBrowserSupabase();
  const payload = {
    usuario_id: userId,
    ...input,
  };

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(payload, { onConflict: "usuario_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data as UserSettings;
}

export async function resetUserSettingsRepository(userId: string): Promise<UserSettings> {
  return saveUserSettingsRepository(userId, defaultSettings);
}