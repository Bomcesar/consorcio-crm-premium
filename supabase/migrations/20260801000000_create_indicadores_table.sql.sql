BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.indicadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nome TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT '',
  cpf TEXT NOT NULL DEFAULT '',
  pix TEXT NOT NULL DEFAULT '',
  origem TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Ativo',
  observacoes TEXT NOT NULL DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.indicadores ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_indicadores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_indicadores_updated_at ON public.indicadores;
CREATE TRIGGER update_indicadores_updated_at
BEFORE UPDATE ON public.indicadores
FOR EACH ROW
EXECUTE FUNCTION public.update_indicadores_updated_at();

CREATE INDEX IF NOT EXISTS indicadores_usuario_id_idx
  ON public.indicadores (usuario_id);

CREATE INDEX IF NOT EXISTS indicadores_status_idx
  ON public.indicadores (status);

CREATE INDEX IF NOT EXISTS indicadores_ativo_idx
  ON public.indicadores (ativo);

DROP POLICY IF EXISTS "Authenticated users can view their indicators" ON public.indicadores;
CREATE POLICY "Authenticated users can view their indicators"
  ON public.indicadores FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can insert their indicators" ON public.indicadores;
CREATE POLICY "Authenticated users can insert their indicators"
  ON public.indicadores FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can update their indicators" ON public.indicadores;
CREATE POLICY "Authenticated users can update their indicators"
  ON public.indicadores FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can delete their indicators" ON public.indicadores;
CREATE POLICY "Authenticated users can delete their indicators"
  ON public.indicadores FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

COMMIT;
