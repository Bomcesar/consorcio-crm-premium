BEGIN;

CREATE TABLE IF NOT EXISTS public.negociacao_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negociacao_id UUID NOT NULL REFERENCES public.negociacoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT '',
  tamanho INTEGER NOT NULL DEFAULT 0,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.negociacao_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view their negotiation attachments"
  ON public.negociacao_anexos FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their negotiation attachments"
  ON public.negociacao_anexos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their negotiation attachments"
  ON public.negociacao_anexos FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS negociacao_anexos_negociacao_id_idx
  ON public.negociacao_anexos (negociacao_id);

COMMIT;
