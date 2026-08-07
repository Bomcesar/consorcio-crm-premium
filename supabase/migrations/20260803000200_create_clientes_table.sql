BEGIN;

CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Ativo',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

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

CREATE OR REPLACE FUNCTION public.update_clientes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_clientes_updated_at ON public.clientes;
CREATE TRIGGER update_clientes_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.update_clientes_updated_at();

CREATE INDEX IF NOT EXISTS clientes_created_at_idx ON public.clientes (created_at DESC);
CREATE INDEX IF NOT EXISTS clientes_status_idx ON public.clientes (status);

COMMIT;
