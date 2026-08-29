BEGIN;

-- ============================================================
-- CONVERSÃO DE CLIENTES/CONTATOS PARA OUTROS MÓDULOS
-- Adiciona campos para rastrear o resultado do contato e
-- o destino da conversão dentro do CRM.
-- ============================================================

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS status_contato text NOT NULL DEFAULT 'Novo',
  ADD COLUMN IF NOT EXISTS data_ultimo_contato timestamptz,
  ADD COLUMN IF NOT EXISTS proxima_acao text,
  ADD COLUMN IF NOT EXISTS data_proxima_acao date,
  ADD COLUMN IF NOT EXISTS destino_conversao text,
  ADD COLUMN IF NOT EXISTS destino_id uuid;

CREATE INDEX IF NOT EXISTS idx_clientes_status_contato
  ON public.clientes (status_contato);

CREATE INDEX IF NOT EXISTS idx_clientes_destino_conversao
  ON public.clientes (destino_conversao);

COMMENT ON COLUMN public.clientes.status_contato IS 'Status do contato/prospecção: Novo, Em contato, Qualificado, Convertido, Perdido';
COMMENT ON COLUMN public.clientes.destino_conversao IS 'Módulo de destino da conversão: lead, indicador, parceiro, recrutamento, cliente';
COMMENT ON COLUMN public.clientes.destino_id IS 'ID do registro criado no módulo de destino';

COMMIT;
