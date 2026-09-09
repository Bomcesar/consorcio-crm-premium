BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'usuario_status'
      AND column_name = 'usuario_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'usuario_status'
      AND indexdef LIKE '%usuario_id%UNIQUE%'
  ) THEN
    ALTER TABLE public.usuario_status
    ADD CONSTRAINT usuario_status_usuario_id_key UNIQUE (usuario_id);
  END IF;
END $$;

COMMIT;
