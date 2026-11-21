-- Fix lead_historico RLS: align usuario_id type and restrict to owner
-- Tabela pode não existir ainda (criada em migration posterior)
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lead_historico'
  ) THEN
    ALTER TABLE public.lead_historico
      ALTER COLUMN usuario_id TYPE UUID USING usuario_id::UUID;

    DROP POLICY IF EXISTS "Allow authenticated users to view lead historico" ON public.lead_historico;
    DROP POLICY IF EXISTS "Allow authenticated users to insert lead historico" ON public.lead_historico;
    DROP POLICY IF EXISTS "Allow authenticated users to delete lead historico" ON public.lead_historico;

    CREATE POLICY "Authenticated users can view their lead historico"
      ON public.lead_historico FOR SELECT
      USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

    CREATE POLICY "Authenticated users can insert their lead historico"
      ON public.lead_historico FOR INSERT
      WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

    CREATE POLICY "Authenticated users can update their lead historico"
      ON public.lead_historico FOR UPDATE
      USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
      WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

    CREATE POLICY "Authenticated users can delete their lead historico"
      ON public.lead_historico FOR DELETE
      USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);
  END IF;
END $$;

COMMIT;
