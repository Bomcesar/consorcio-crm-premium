BEGIN;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS valor_estimado NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS probabilidade INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultimo_contato TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.lead_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'observacao',
  descricao TEXT NOT NULL DEFAULT '',
  usuario_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lead_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view lead historico"
  ON public.lead_historico FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert lead historico"
  ON public.lead_historico FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.lead_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT '',
  tamanho INTEGER NOT NULL DEFAULT 0,
  usuario_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lead_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view lead anexos"
  ON public.lead_anexos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert lead anexos"
  ON public.lead_anexos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete lead anexos"
  ON public.lead_anexos FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_leads_origem ON public.leads(origem);
CREATE INDEX IF NOT EXISTS idx_lead_historico_lead_id ON public.lead_historico(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_anexos_lead_id ON public.lead_anexos(lead_id);

COMMIT;
