BEGIN;

ALTER TABLE public.comissoes_indicadores
  ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS negociacao_id UUID REFERENCES public.negociacoes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS data_prevista DATE,
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'Venda';

DROP INDEX IF EXISTS comissoes_indicadores_cliente_id_idx;
CREATE INDEX IF NOT EXISTS comissoes_indicadores_cliente_id_idx
  ON public.comissoes_indicadores (cliente_id);

DROP INDEX IF EXISTS comissoes_indicadores_negociacao_id_idx;
CREATE INDEX IF NOT EXISTS comissoes_indicadores_negociacao_id_idx
  ON public.comissoes_indicadores (negociacao_id);

DROP INDEX IF EXISTS comissoes_indicadores_data_prevista_idx;
CREATE INDEX IF NOT EXISTS comissoes_indicadores_data_prevista_idx
  ON public.comissoes_indicadores (data_prevista);

COMMIT;
