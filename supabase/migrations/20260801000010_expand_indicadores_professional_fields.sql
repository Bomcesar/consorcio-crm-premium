BEGIN;

ALTER TABLE public.indicadores
  ADD COLUMN IF NOT EXISTS whatsapp TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS profissao TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS data_entrada DATE,
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT NOT NULL DEFAULT 'Novo Indicador';

ALTER TABLE public.indicadores ENABLE ROW LEVEL SECURITY;

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
