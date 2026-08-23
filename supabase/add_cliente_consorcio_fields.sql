-- Adiciona campos de consórcio na tabela clientes
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'numero_cota'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN numero_cota TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'numero_grupo'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN numero_grupo TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'numero_contrato'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN numero_contrato TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'data_cadastro'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN data_cadastro DATE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'data_vencimento'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN data_vencimento DATE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'pagamento_pix'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN pagamento_pix TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'pix_link'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN pix_link TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'data_sorteio'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN data_sorteio DATE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'data_assembreia'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN data_assembreia DATE;
  END IF;
END $$;

COMMIT;
