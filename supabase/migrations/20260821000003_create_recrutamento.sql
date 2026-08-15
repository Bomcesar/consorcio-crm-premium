BEGIN;

CREATE TABLE IF NOT EXISTS public.recrutamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  origem TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Novo',
  observacoes TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.recrutamento ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_recrutamento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_recrutamento_updated_at ON public.recrutamento;
CREATE TRIGGER update_recrutamento_updated_at
  BEFORE UPDATE ON public.recrutamento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_recrutamento_updated_at();

CREATE POLICY "Authenticated users can view own recrutamento"
  ON public.recrutamento FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert own recrutamento"
  ON public.recrutamento FOR INSERT
  WITH CHECK (
    auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Authenticated users can update own recrutamento"
  ON public.recrutamento FOR UPDATE
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

CREATE POLICY "Authenticated users can delete own recrutamento"
  ON public.recrutamento FOR DELETE
  USING (
    auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE INDEX IF NOT EXISTS recrutamento_usuario_id_idx ON public.recrutamento (usuario_id);
CREATE INDEX IF NOT EXISTS recrutamento_status_idx ON public.recrutamento (status);

COMMIT;
