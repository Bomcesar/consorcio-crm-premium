BEGIN;

ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS valor_parcela_cheia NUMERIC,
  ADD COLUMN IF NOT EXISTS valor_parcela_reduzida NUMERIC,
  ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.proposta_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'nao_fechou',
  canal TEXT NOT NULL DEFAULT 'whatsapp',
  observacao TEXT NOT NULL DEFAULT '',
  data_contato TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.proposta_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their proposal followups"
  ON public.proposta_followups FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Users can insert their proposal followups"
  ON public.proposta_followups FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS proposta_followups_proposta_id_idx
  ON public.proposta_followups (proposta_id);

CREATE INDEX IF NOT EXISTS proposta_followups_usuario_id_idx
  ON public.proposta_followups (usuario_id);

COMMIT;
