-- Adiciona campo de comprovante de pagamento na tabela clientes
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'comprovante_pagamento'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN comprovante_pagamento TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

COMMIT;
