BEGIN;

CREATE TABLE IF NOT EXISTS public.indicador_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id UUID NOT NULL REFERENCES public.indicadores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'observacao',
  descricao TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.indicador_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view indicator history"
  ON public.indicador_historico FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert indicator history"
  ON public.indicador_historico FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS indicador_historico_indicador_id_idx
  ON public.indicador_historico (indicador_id);

COMMIT;
