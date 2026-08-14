BEGIN;

CREATE TABLE IF NOT EXISTS public.negociacao_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negociacao_id UUID NOT NULL REFERENCES public.negociacoes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'observacao',
  descricao TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.negociacao_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view their negotiation history"
  ON public.negociacao_historico FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their negotiation history"
  ON public.negociacao_historico FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS negociacao_historico_negociacao_id_idx
  ON public.negociacao_historico (negociacao_id);

COMMIT;
