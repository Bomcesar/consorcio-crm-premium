BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'data_assembreia'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'data_assembleia'
  ) THEN
    ALTER TABLE public.clientes RENAME COLUMN data_assembreia TO data_assembleia;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'data_assembleia'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'data_assembreia'
  ) THEN
    UPDATE public.clientes
    SET data_assembleia = COALESCE(data_assembleia, data_assembreia)
    WHERE data_assembleia IS NULL AND data_assembreia IS NOT NULL;

    ALTER TABLE public.clientes DROP COLUMN data_assembreia;
  END IF;
END $$;

COMMIT;
