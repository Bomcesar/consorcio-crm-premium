BEGIN;

CREATE TABLE IF NOT EXISTS public.contatos_indicados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id UUID NOT NULL REFERENCES public.indicadores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Novo',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.contatos_indicados ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_contatos_indicados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_contatos_indicados_updated_at ON public.contatos_indicados;
CREATE TRIGGER update_contatos_indicados_updated_at
BEFORE UPDATE ON public.contatos_indicados
FOR EACH ROW
EXECUTE FUNCTION public.update_contatos_indicados_updated_at();

CREATE INDEX IF NOT EXISTS contatos_indicados_indicador_id_idx
  ON public.contatos_indicados (indicador_id);

CREATE INDEX IF NOT EXISTS contatos_indicados_usuario_id_idx
  ON public.contatos_indicados (usuario_id);

CREATE INDEX IF NOT EXISTS contatos_indicados_status_idx
  ON public.contatos_indicados (status);

DROP POLICY IF EXISTS "Authenticated users can view their indicated contacts" ON public.contatos_indicados;
CREATE POLICY "Authenticated users can view their indicated contacts"
  ON public.contatos_indicados FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can insert their indicated contacts" ON public.contatos_indicados;
CREATE POLICY "Authenticated users can insert their indicated contacts"
  ON public.contatos_indicados FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can update their indicated contacts" ON public.contatos_indicados;
CREATE POLICY "Authenticated users can update their indicated contacts"
  ON public.contatos_indicados FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can delete their indicated contacts" ON public.contatos_indicados;
CREATE POLICY "Authenticated users can delete their indicated contacts"
  ON public.contatos_indicados FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

COMMIT;
