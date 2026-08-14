BEGIN;

CREATE TABLE IF NOT EXISTS public.treinamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Ativo',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.treinamentos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_treinamentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_treinamentos_updated_at ON public.treinamentos;
CREATE TRIGGER update_treinamentos_updated_at
  BEFORE UPDATE ON public.treinamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_treinamentos_updated_at();

CREATE POLICY "Authenticated users can view active treinamentos"
  ON public.treinamentos FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'Ativo');

CREATE POLICY "Authenticated users with admin/gestor can insert treinamentos"
  ON public.treinamentos FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Authenticated users with admin/gestor can update their treinamentos"
  ON public.treinamentos FOR UPDATE
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

CREATE POLICY "Authenticated users with admin/gestor can delete their treinamentos"
  ON public.treinamentos FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE INDEX IF NOT EXISTS treinamentos_usuario_id_idx ON public.treinamentos (usuario_id);
CREATE INDEX IF NOT EXISTS treinamentos_categoria_idx ON public.treinamentos (categoria);
CREATE INDEX IF NOT EXISTS treinamentos_status_idx ON public.treinamentos (status);

COMMIT;
