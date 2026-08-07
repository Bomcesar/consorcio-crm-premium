"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Settings, ShieldCheck, Link2, SlidersHorizontal, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useConfiguracoes } from "@/hooks/use-configuracoes";
import type { UserSettingsFormData } from "@/types/crm";

const defaultForm: UserSettingsFormData = {
  nome: "",
  email: "",
  avatar_url: "",
  perfil: "",
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

const languageOptions = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en-US", label: "English (US)" },
  { value: "es-ES", label: "Español" },
];

const statusOptions = ["Novo", "Em contato", "Ativo", "Inativo", "Parceiro Premium"];

function toFormData(
  profile: { nome: string; email: string; perfil: string; avatar_url: string | null } | null,
  settings: {
    calendar_integration_enabled: boolean;
    calendar_email: string;
    whatsapp_integration_enabled: boolean;
    whatsapp_webhook_url: string;
    whatsapp_api_key: string;
    notification_email: boolean;
    notification_whatsapp: boolean;
    language: string;
    page_size: number;
    default_indicator_status: string;
    compact_sidebar: boolean;
    auto_refresh_dashboard: boolean;
    dashboard_refresh_seconds: number;
  } | null,
): UserSettingsFormData {
  return {
    nome: profile?.nome ?? "",
    email: profile?.email ?? "",
    avatar_url: profile?.avatar_url ?? "",
    perfil: profile?.perfil ?? "",
    calendar_integration_enabled: settings?.calendar_integration_enabled ?? false,
    calendar_email: settings?.calendar_email ?? "",
    whatsapp_integration_enabled: settings?.whatsapp_integration_enabled ?? false,
    whatsapp_webhook_url: settings?.whatsapp_webhook_url ?? "",
    whatsapp_api_key: settings?.whatsapp_api_key ?? "",
    notification_email: settings?.notification_email ?? true,
    notification_whatsapp: settings?.notification_whatsapp ?? true,
    language: settings?.language ?? "pt-BR",
    page_size: settings?.page_size ?? 10,
    default_indicator_status: settings?.default_indicator_status ?? "Novo",
    compact_sidebar: settings?.compact_sidebar ?? false,
    auto_refresh_dashboard: settings?.auto_refresh_dashboard ?? true,
    dashboard_refresh_seconds: settings?.dashboard_refresh_seconds ?? 30,
  };
}

export default function ConfiguracoesPage() {
  const { user, profile, refreshAuth } = useAuth();
  const { getConfiguracoes, savePerfil, saveConfiguracoes, resetConfiguracoes } = useConfiguracoes();
  const [formData, setFormData] = useState<UserSettingsFormData>(defaultForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadConfiguracoes = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await getConfiguracoes(user.id);
      setFormData(toFormData(data.profile ?? profile, data.settings));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel carregar as configuracoes.";
      setErrorMessage(message);
      setFormData(toFormData(profile ?? null, null));
    } finally {
      setIsLoading(false);
    }
  }, [getConfiguracoes, profile, user?.id]);

  useEffect(() => {
    void loadConfiguracoes();
  }, [loadConfiguracoes]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSuccessMessage(null), 3500);
    if (!successMessage) return undefined;
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const handleChange = <K extends keyof UserSettingsFormData>(field: K, value: UserSettingsFormData[K]) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.id) {
      setErrorMessage("Sessao invalida. Faça login novamente.");
      return;
    }

    setIsSavingProfile(true);
    setErrorMessage(null);

    try {
      await savePerfil(user.id, {
        nome: formData.nome.trim(),
        email: formData.email.trim(),
        avatar_url: formData.avatar_url.trim(),
      });
      await refreshAuth();
      setSuccessMessage("Perfil atualizado com sucesso.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel salvar o perfil.";
      setErrorMessage(message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.id) {
      setErrorMessage("Sessao invalida. Faça login novamente.");
      return;
    }

    setIsSavingSettings(true);
    setErrorMessage(null);

    try {
      await saveConfiguracoes(user.id, {
        calendar_integration_enabled: formData.calendar_integration_enabled,
        calendar_email: formData.calendar_email.trim(),
        whatsapp_integration_enabled: formData.whatsapp_integration_enabled,
        whatsapp_webhook_url: formData.whatsapp_webhook_url.trim(),
        whatsapp_api_key: formData.whatsapp_api_key.trim(),
        notification_email: formData.notification_email,
        notification_whatsapp: formData.notification_whatsapp,
        language: formData.language,
        page_size: formData.page_size,
        default_indicator_status: formData.default_indicator_status,
        compact_sidebar: formData.compact_sidebar,
        auto_refresh_dashboard: formData.auto_refresh_dashboard,
        dashboard_refresh_seconds: formData.dashboard_refresh_seconds,
      });
      setSuccessMessage("Preferencias e integrações salvas com sucesso.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel salvar as configuracoes.";
      setErrorMessage(message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const resetSettings = async () => {
    if (!user?.id) return;

    setIsResetting(true);
    setErrorMessage(null);

    try {
      const data = await resetConfiguracoes(user.id);
      setFormData((current) => ({
        ...current,
        calendar_integration_enabled: data.calendar_integration_enabled,
        calendar_email: data.calendar_email,
        whatsapp_integration_enabled: data.whatsapp_integration_enabled,
        whatsapp_webhook_url: data.whatsapp_webhook_url,
        whatsapp_api_key: data.whatsapp_api_key,
        notification_email: data.notification_email,
        notification_whatsapp: data.notification_whatsapp,
        language: data.language,
        page_size: data.page_size,
        default_indicator_status: data.default_indicator_status,
        compact_sidebar: data.compact_sidebar,
        auto_refresh_dashboard: data.auto_refresh_dashboard,
        dashboard_refresh_seconds: data.dashboard_refresh_seconds,
      }));
      setSuccessMessage("Preferencias restauradas para o padrão.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel restaurar as configuracoes.";
      setErrorMessage(message);
    } finally {
      setIsResetting(false);
    }
  };

  const profileInitials = useMemo(() => {
    return formData.nome
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "US";
  }, [formData.nome]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
          <p className="text-sm text-muted-foreground">Perfil, integrações e preferências do sistema</p>
        </div>
        <Badge variant="success" className="w-fit">
          Configuração operacional
        </Badge>
      </div>

      {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-500">{successMessage}</p> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando configurações...</p> : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-1 space-y-6">
          <Card className="border-border/50 bg-card/70">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {profileInitials}
                </div>
                <div>
                  <CardTitle className="text-lg">{formData.nome || "Seu perfil"}</CardTitle>
                  <CardDescription>{formData.perfil || profile?.perfil || "Perfil do sistema"}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <UserCog className="h-4 w-4" />
                Perfil e avatar vinculados ao Supabase.
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Preferências e integrações persistidas por usuário.
              </div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Sem placeholders ou dados fictícios.
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/70">
            <CardHeader>
              <CardTitle className="text-lg">Acesso rápido</CardTitle>
              <CardDescription>Atalhos do módulo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2 rounded-lg border border-border/50 p-3">
                <Settings className="h-4 w-4 text-primary" />
                Atualize perfil, integrações e preferências em uma única tela.
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border/50 p-3">
                <Link2 className="h-4 w-4 text-primary" />
                Integração com Google Calendar e WhatsApp preparada para conexão real.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-2 space-y-6">
          <Card className="border-border/50 bg-card/70">
            <CardHeader>
              <CardTitle>Perfil</CardTitle>
              <CardDescription>Dados do usuário autenticado</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={saveProfile}>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input id="nome" value={formData.nome} onChange={(event) => handleChange("nome", event.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(event) => handleChange("email", event.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="avatar_url">Avatar URL</Label>
                  <Input
                    id="avatar_url"
                    value={formData.avatar_url}
                    onChange={(event) => handleChange("avatar_url", event.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="perfil">Perfil</Label>
                  <Input id="perfil" value={formData.perfil} disabled />
                </div>
                <div className="flex items-end gap-2 md:col-span-2">
                  <Button type="submit" disabled={isSavingProfile}>
                    {isSavingProfile ? "Salvando..." : "Salvar perfil"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/70">
            <CardHeader>
              <CardTitle>Integrações</CardTitle>
              <CardDescription>Conecte serviços externos de forma persistente</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={saveSettings}>
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                    <div>
                      <p className="font-medium">Google Calendar</p>
                      <p className="text-xs text-muted-foreground">Sincronização de agenda</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.calendar_integration_enabled}
                      onChange={(event) => handleChange("calendar_integration_enabled", event.target.checked)}
                    />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="calendar_email">Email do calendário</Label>
                  <Input
                    id="calendar_email"
                    value={formData.calendar_email}
                    onChange={(event) => handleChange("calendar_email", event.target.value)}
                    placeholder="agenda@empresa.com"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                    <div>
                      <p className="font-medium">WhatsApp</p>
                      <p className="text-xs text-muted-foreground">Webhook e API para automação</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.whatsapp_integration_enabled}
                      onChange={(event) => handleChange("whatsapp_integration_enabled", event.target.checked)}
                    />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="whatsapp_webhook_url">Webhook do WhatsApp</Label>
                  <Input
                    id="whatsapp_webhook_url"
                    value={formData.whatsapp_webhook_url}
                    onChange={(event) => handleChange("whatsapp_webhook_url", event.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="whatsapp_api_key">Chave da API do WhatsApp</Label>
                  <Input
                    id="whatsapp_api_key"
                    value={formData.whatsapp_api_key}
                    onChange={(event) => handleChange("whatsapp_api_key", event.target.value)}
                    placeholder="API key"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                    <div>
                      <p className="font-medium">Notificações por email</p>
                      <p className="text-xs text-muted-foreground">Receber alertas do CRM</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.notification_email}
                      onChange={(event) => handleChange("notification_email", event.target.checked)}
                    />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                    <div>
                      <p className="font-medium">Notificações por WhatsApp</p>
                      <p className="text-xs text-muted-foreground">Alertas operacionais no celular</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.notification_whatsapp}
                      onChange={(event) => handleChange("notification_whatsapp", event.target.checked)}
                    />
                  </div>
                </div>

                <div className="flex gap-2 md:col-span-2">
                  <Button type="submit" disabled={isSavingSettings}>
                    {isSavingSettings ? "Salvando..." : "Salvar integrações e preferências"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/70">
            <CardHeader>
              <CardTitle>Preferências do sistema</CardTitle>
              <CardDescription>Comportamento padrão do CRM</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={saveSettings}>
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <select
                    id="language"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.language}
                    onChange={(event) => handleChange("language", event.target.value)}
                  >
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="page_size">Tamanho padrão de página</Label>
                  <select
                    id="page_size"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={String(formData.page_size)}
                    onChange={(event) => handleChange("page_size", Number(event.target.value))}
                  >
                    {[10, 20, 50, 100].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_indicator_status">Status padrão de indicador</Label>
                  <select
                    id="default_indicator_status"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.default_indicator_status}
                    onChange={(event) => handleChange("default_indicator_status", event.target.value)}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dashboard_refresh_seconds">Atualização automática do dashboard (s)</Label>
                  <Input
                    id="dashboard_refresh_seconds"
                    type="number"
                    min={10}
                    step={5}
                    value={formData.dashboard_refresh_seconds}
                    onChange={(event) => handleChange("dashboard_refresh_seconds", Number(event.target.value))}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                    <div>
                      <p className="font-medium">Sidebar compacta</p>
                      <p className="text-xs text-muted-foreground">Preferência visual salva por usuário</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.compact_sidebar}
                      onChange={(event) => handleChange("compact_sidebar", event.target.checked)}
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                    <div>
                      <p className="font-medium">Atualização automática do dashboard</p>
                      <p className="text-xs text-muted-foreground">Recarrega indicadores em intervalo configurável</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.auto_refresh_dashboard}
                      onChange={(event) => handleChange("auto_refresh_dashboard", event.target.checked)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 md:col-span-2">
                  <Button type="submit" disabled={isSavingSettings}>
                    {isSavingSettings ? "Salvando..." : "Salvar preferências"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void loadConfiguracoes()}>
                    Recarregar
                  </Button>
                  <Button type="button" variant="destructive" disabled={isResetting} onClick={() => void resetSettings()}>
                    {isResetting ? "Restaurando..." : "Restaurar padrão"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}