BEGIN;

ALTER TABLE IF EXISTS public.clientes ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.clientes TO authenticated;

DROP POLICY IF EXISTS "Allow authenticated users to view clientes" ON public.clientes;
CREATE POLICY "Allow authenticated users to view clientes"
  ON public.clientes FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to insert clientes" ON public.clientes;
CREATE POLICY "Allow authenticated users to insert clientes"
  ON public.clientes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to update clientes" ON public.clientes;
CREATE POLICY "Allow authenticated users to update clientes"
  ON public.clientes FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to delete clientes" ON public.clientes;
CREATE POLICY "Allow authenticated users to delete clientes"
  ON public.clientes FOR DELETE
  USING (auth.role() = 'authenticated');

COMMIT;
