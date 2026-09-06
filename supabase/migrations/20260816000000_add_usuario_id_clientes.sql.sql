BEGIN;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clientes;
CREATE POLICY "Authenticated users can view their clients"
  ON public.clientes FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clientes;
CREATE POLICY "Authenticated users can insert their clients"
  ON public.clientes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clientes;
CREATE POLICY "Authenticated users can update their clients"
  ON public.clientes FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clientes;
CREATE POLICY "Authenticated users can delete their clients"
  ON public.clientes FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS clientes_usuario_id_idx
  ON public.clientes (usuario_id);

COMMIT;
