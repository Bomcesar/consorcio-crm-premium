BEGIN;

CREATE TABLE IF NOT EXISTS public.ticker_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'mensagem_dia',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ticker_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_ticker_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_ticker_messages_updated_at ON public.ticker_messages;
CREATE TRIGGER update_ticker_messages_updated_at
  BEFORE UPDATE ON public.ticker_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ticker_messages_updated_at();

CREATE INDEX IF NOT EXISTS ticker_messages_ativo_idx ON public.ticker_messages (ativo);
CREATE INDEX IF NOT EXISTS ticker_messages_tipo_idx ON public.ticker_messages (tipo);

DROP POLICY IF EXISTS "Authenticated users can view ticker messages" ON public.ticker_messages;
CREATE POLICY "Authenticated users can view ticker messages"
  ON public.ticker_messages FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin can insert ticker messages" ON public.ticker_messages;
CREATE POLICY "Admin can insert ticker messages"
  ON public.ticker_messages FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

DROP POLICY IF EXISTS "Admin can update ticker messages" ON public.ticker_messages;
CREATE POLICY "Admin can update ticker messages"
  ON public.ticker_messages FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

DROP POLICY IF EXISTS "Admin can delete ticker messages" ON public.ticker_messages;
CREATE POLICY "Admin can delete ticker messages"
  ON public.ticker_messages FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

-- Grant privileges to roles for PostgREST access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticker_messages TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;

COMMIT;
