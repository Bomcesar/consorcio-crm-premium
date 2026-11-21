-- Fix lead_anexos RLS: align usuario_id type and restrict to owner
-- Tabela pode não existir ainda (criada em migration posterior)
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lead_anexos'
  ) THEN
    ALTER TABLE public.lead_anexos
      ALTER COLUMN usuario_id TYPE UUID USING usuario_id::UUID;

    DROP POLICY IF EXISTS "Allow authenticated users to view lead anexos" ON public.lead_anexos;
    DROP POLICY IF EXISTS "Allow authenticated users to insert lead anexos" ON public.lead_anexos;
    DROP POLICY IF EXISTS "Allow authenticated users to delete lead anexos" ON public.lead_anexos;

    CREATE POLICY "Authenticated users can view their lead anexos"
      ON public.lead_anexos FOR SELECT
      USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

    CREATE POLICY "Authenticated users can insert their lead anexos"
      ON public.lead_anexos FOR INSERT
      WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

    CREATE POLICY "Authenticated users can update their lead anexos"
      ON public.lead_anexos FOR UPDATE
      USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
      WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

    CREATE POLICY "Authenticated users can delete their lead anexos"
      ON public.lead_anexos FOR DELETE
      USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);
  END IF;
END $$;

COMMIT;
