BEGIN;

ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS banner_caminho TEXT;

COMMIT;
