BEGIN;

CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_integration_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  calendar_email TEXT NOT NULL DEFAULT '',
  whatsapp_integration_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_webhook_url TEXT NOT NULL DEFAULT '',
  whatsapp_api_key TEXT NOT NULL DEFAULT '',
  notification_email BOOLEAN NOT NULL DEFAULT TRUE,
  notification_whatsapp BOOLEAN NOT NULL DEFAULT TRUE,
  language TEXT NOT NULL DEFAULT 'pt-BR',
  page_size INTEGER NOT NULL DEFAULT 10,
  default_indicator_status TEXT NOT NULL DEFAULT 'Novo',
  compact_sidebar BOOLEAN NOT NULL DEFAULT FALSE,
  auto_refresh_dashboard BOOLEAN NOT NULL DEFAULT TRUE,
  dashboard_refresh_seconds INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_user_settings_updated_at();

CREATE INDEX IF NOT EXISTS user_settings_usuario_id_idx ON public.user_settings (usuario_id);

DROP POLICY IF EXISTS "Authenticated users can view own settings" ON public.user_settings;
CREATE POLICY "Authenticated users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can insert own settings" ON public.user_settings;
CREATE POLICY "Authenticated users can insert own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can update own settings" ON public.user_settings;
CREATE POLICY "Authenticated users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can delete own settings" ON public.user_settings;
CREATE POLICY "Authenticated users can delete own settings"
  ON public.user_settings FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

COMMIT;