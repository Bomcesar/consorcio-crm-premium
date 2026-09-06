BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'segmento'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN segmento TEXT NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'preferencia_contato'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN preferencia_contato TEXT NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'valor_medio_contrato'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN valor_medio_contrato NUMERIC NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'score'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN score INTEGER NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN tags TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'proxima_acao'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN proxima_acao TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'data_proxima_acao'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN data_proxima_acao DATE NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'numero_cota'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN numero_cota TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'numero_grupo'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN numero_grupo TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'numero_contrato'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN numero_contrato TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'data_cadastro'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN data_cadastro DATE NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'data_vencimento'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN data_vencimento DATE NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'pagamento_pix'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN pagamento_pix TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'pix_link'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN pix_link TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'data_sorteio'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN data_sorteio DATE NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'data_assembleia'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN data_assembleia DATE NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'comprovante_pagamento'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN comprovante_pagamento TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'status_contato'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN status_contato TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'data_ultimo_contato'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN data_ultimo_contato DATE NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'destino_conversao'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN destino_conversao TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'destino_id'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN destino_id UUID NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'parceiros'
      AND column_name = 'cnpj'
  ) THEN
    ALTER TABLE public.parceiros ADD COLUMN cnpj TEXT NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'parceiros'
      AND column_name = 'contato'
  ) THEN
    ALTER TABLE public.parceiros ADD COLUMN contato TEXT NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'parceiros'
      AND column_name = 'tipo'
  ) THEN
    ALTER TABLE public.parceiros ADD COLUMN tipo TEXT NOT NULL DEFAULT 'Administradora';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'recrutamento'
      AND column_name = 'origem'
  ) THEN
    ALTER TABLE public.recrutamento ADD COLUMN origem TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

NOTIFY postgrest, 'reload schema';

COMMIT;
