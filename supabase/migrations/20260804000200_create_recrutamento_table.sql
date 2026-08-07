BEGIN;

CREATE TABLE IF NOT EXISTS public.recrutamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  vaga_interesse TEXT NOT NULL DEFAULT 'Consultor de Consorcio',
  etapa TEXT NOT NULL DEFAULT 'Triagem',
  fonte TEXT NOT NULL DEFAULT 'Indicacao',
  score_aderencia NUMERIC(5,2) NOT NULL DEFAULT 0,
  disponibilidade_inicio TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'Ativo',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.recrutamento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view recrutamento" ON public.recrutamento;
CREATE POLICY "Allow authenticated users to view recrutamento"
  ON public.recrutamento FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to insert recrutamento" ON public.recrutamento;
CREATE POLICY "Allow authenticated users to insert recrutamento"
  ON public.recrutamento FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to update recrutamento" ON public.recrutamento;
CREATE POLICY "Allow authenticated users to update recrutamento"
  ON public.recrutamento FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to delete recrutamento" ON public.recrutamento;
CREATE POLICY "Allow authenticated users to delete recrutamento"
  ON public.recrutamento FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION public.update_recrutamento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_recrutamento_updated_at ON public.recrutamento;
CREATE TRIGGER update_recrutamento_updated_at
BEFORE UPDATE ON public.recrutamento
FOR EACH ROW
EXECUTE FUNCTION public.update_recrutamento_updated_at();

CREATE INDEX IF NOT EXISTS recrutamento_created_at_idx ON public.recrutamento (created_at DESC);
CREATE INDEX IF NOT EXISTS recrutamento_status_idx ON public.recrutamento (status);
CREATE INDEX IF NOT EXISTS recrutamento_etapa_idx ON public.recrutamento (etapa);

COMMIT;