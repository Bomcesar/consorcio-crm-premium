-- Adiciona campos de atendimento personalizado na tabela clientes
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'segmento'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN segmento TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'preferencia_contato'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN preferencia_contato TEXT NOT NULL DEFAULT 'WhatsApp';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'valor_medio_contrato'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN valor_medio_contrato NUMERIC;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'score'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN score INTEGER NOT NULL DEFAULT 3;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN tags TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'proxima_acao'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN proxima_acao TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'data_proxima_acao'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN data_proxima_acao DATE;
  END IF;
END $$;

COMMIT;
