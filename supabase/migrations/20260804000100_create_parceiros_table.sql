BEGIN;

CREATE TABLE IF NOT EXISTS public.parceiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT '',
  empresa TEXT NOT NULL DEFAULT '',
  segmento TEXT NOT NULL DEFAULT 'Administradora',
  telefone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Ativo',
  nivel_parceria TEXT NOT NULL DEFAULT 'Bronze',
  comissao_percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
  ultimo_contato TIMESTAMPTZ NULL,
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view parceiros" ON public.parceiros;
CREATE POLICY "Allow authenticated users to view parceiros"
  ON public.parceiros FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to insert parceiros" ON public.parceiros;
CREATE POLICY "Allow authenticated users to insert parceiros"
  ON public.parceiros FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to update parceiros" ON public.parceiros;
CREATE POLICY "Allow authenticated users to update parceiros"
  ON public.parceiros FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to delete parceiros" ON public.parceiros;
CREATE POLICY "Allow authenticated users to delete parceiros"
  ON public.parceiros FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION public.update_parceiros_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_parceiros_updated_at ON public.parceiros;
CREATE TRIGGER update_parceiros_updated_at
BEFORE UPDATE ON public.parceiros
FOR EACH ROW
EXECUTE FUNCTION public.update_parceiros_updated_at();

CREATE INDEX IF NOT EXISTS parceiros_created_at_idx ON public.parceiros (created_at DESC);
CREATE INDEX IF NOT EXISTS parceiros_status_idx ON public.parceiros (status);
CREATE INDEX IF NOT EXISTS parceiros_segmento_idx ON public.parceiros (segmento);

COMMIT;