BEGIN;

CREATE TABLE IF NOT EXISTS public.links_uteis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Ativo',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.links_uteis ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_links_uteis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_links_uteis_updated_at ON public.links_uteis;
CREATE TRIGGER update_links_uteis_updated_at
  BEFORE UPDATE ON public.links_uteis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_links_uteis_updated_at();

CREATE POLICY "Authenticated users can view active links_uteis"
  ON public.links_uteis FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'Ativo');

CREATE POLICY "Authenticated users with admin/gestor can insert links_uteis"
  ON public.links_uteis FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Authenticated users with admin/gestor can update their links_uteis"
  ON public.links_uteis FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Authenticated users with admin/gestor can delete their links_uteis"
  ON public.links_uteis FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE INDEX IF NOT EXISTS links_uteis_usuario_id_idx ON public.links_uteis (usuario_id);
CREATE INDEX IF NOT EXISTS links_uteis_categoria_idx ON public.links_uteis (categoria);
CREATE INDEX IF NOT EXISTS links_uteis_status_idx ON public.links_uteis (status);

COMMIT;
