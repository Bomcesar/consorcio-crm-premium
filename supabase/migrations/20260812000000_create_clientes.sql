BEGIN;

CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  cpf_cnpj TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Ativo',
  origem TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Authenticated users can view clients"
  ON public.clientes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert clients"
  ON public.clientes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update clients"
  ON public.clientes FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete clients"
  ON public.clientes FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS clientes_status_idx
  ON public.clientes (status);

CREATE INDEX IF NOT EXISTS clientes_nome_idx
  ON public.clientes (nome);

COMMIT;
