BEGIN;

CREATE TABLE IF NOT EXISTS public.parceiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT '',
  cnpj TEXT NOT NULL DEFAULT '',
  contato TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Administradora',
  status TEXT NOT NULL DEFAULT 'Ativo',
  observacoes TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_parceiros_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_parceiros_updated_at ON public.parceiros;
CREATE TRIGGER update_parceiros_updated_at
  BEFORE UPDATE ON public.parceiros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_parceiros_updated_at();

CREATE POLICY "Authenticated users can view own parceiros"
  ON public.parceiros FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert own parceiros"
  ON public.parceiros FOR INSERT
  WITH CHECK (
    auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Authenticated users can update own parceiros"
  ON public.parceiros FOR UPDATE
  USING (
    auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Authenticated users can delete own parceiros"
  ON public.parceiros FOR DELETE
  USING (
    auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE INDEX IF NOT EXISTS parceiros_usuario_id_idx ON public.parceiros (usuario_id);
CREATE INDEX IF NOT EXISTS parceiros_status_idx ON public.parceiros (status);

COMMIT;
