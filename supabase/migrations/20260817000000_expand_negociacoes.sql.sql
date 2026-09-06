BEGIN;

ALTER TABLE public.negociacoes
  ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS modalidade TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposta TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proxima_acao TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS data_proxima_acao DATE;

DROP INDEX IF EXISTS negociacoes_cliente_id_idx;
CREATE INDEX IF NOT EXISTS negociacoes_cliente_id_idx
  ON public.negociacoes (cliente_id);

COMMIT;
