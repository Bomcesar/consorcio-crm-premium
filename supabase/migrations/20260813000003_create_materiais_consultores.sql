BEGIN;

CREATE TABLE IF NOT EXISTS public.materiais_consultores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT '',
  arquivo_url TEXT NOT NULL DEFAULT '',
  arquivo_nome TEXT NOT NULL DEFAULT '',
  arquivo_tamanho INTEGER NOT NULL DEFAULT 0,
  arquivo_mime_type TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Documento',
  status TEXT NOT NULL DEFAULT 'Ativo',
  permite_download BOOLEAN NOT NULL DEFAULT true,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.materiais_consultores ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_materiais_consultores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_materiais_consultores_updated_at ON public.materiais_consultores;
CREATE TRIGGER update_materiais_consultores_updated_at
  BEFORE UPDATE ON public.materiais_consultores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_materiais_consultores_updated_at();

CREATE POLICY "Authenticated users can view active materiais_consultores"
  ON public.materiais_consultores FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'Ativo');

CREATE POLICY "Authenticated users with admin/gestor can insert materiais_consultores"
  ON public.materiais_consultores FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Authenticated users with admin/gestor can update their materiais_consultores"
  ON public.materiais_consultores FOR UPDATE
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

CREATE POLICY "Authenticated users with admin/gestor can delete their materiais_consultores"
  ON public.materiais_consultores FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE INDEX IF NOT EXISTS materiais_consultores_usuario_id_idx ON public.materiais_consultores (usuario_id);
CREATE INDEX IF NOT EXISTS materiais_consultores_categoria_idx ON public.materiais_consultores (categoria);
CREATE INDEX IF NOT EXISTS materiais_consultores_tipo_idx ON public.materiais_consultores (tipo);
CREATE INDEX IF NOT EXISTS materiais_consultores_status_idx ON public.materiais_consultores (status);

COMMIT;
