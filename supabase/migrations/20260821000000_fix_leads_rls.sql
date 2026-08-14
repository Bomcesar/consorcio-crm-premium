-- Fix leads RLS: add usuario_id and restrict access to owner
BEGIN;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS usuario_id UUID NOT NULL DEFAULT auth.uid()::uuid
  REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS leads_usuario_id_idx ON public.leads (usuario_id);

DROP POLICY IF EXISTS "Allow authenticated users to view leads" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated users to insert leads" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated users to update leads" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated users to delete leads" ON public.leads;

CREATE POLICY "Authenticated users can view their leads"
  ON public.leads FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their leads"
  ON public.leads FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their leads"
  ON public.leads FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their leads"
  ON public.leads FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

COMMIT;
