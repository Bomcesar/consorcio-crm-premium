BEGIN;

ALTER TABLE public.cobrancas
  ADD COLUMN IF NOT EXISTS numero_parcela INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_parcelas INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS boleto_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lembrete_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cliente_origem_id UUID;

CREATE TABLE IF NOT EXISTS public.cobranca_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cobranca_id UUID NOT NULL REFERENCES public.cobrancas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'observacao',
  descricao TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cobranca_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view their cobranca historico"
  ON public.cobranca_historico FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their cobranca historico"
  ON public.cobranca_historico FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their cobranca historico"
  ON public.cobranca_historico FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS cobrancas_cliente_origem_id_idx ON public.cobrancas (cliente_origem_id);
CREATE INDEX IF NOT EXISTS cobranca_historico_cobranca_id_idx ON public.cobranca_historico (cobranca_id);

COMMIT;
