BEGIN;

-- ============================================================
-- Add base_origem column to clientes table
-- Tracks origin: 'contato' (prospect) or 'cliente' (converted client)
-- ============================================================

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS base_origem TEXT DEFAULT 'contato';

-- Set existing records as 'cliente' since they are already clients
UPDATE public.clientes
  SET base_origem = 'cliente'
  WHERE base_origem = 'contato';

COMMIT;
