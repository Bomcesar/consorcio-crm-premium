BEGIN;

CREATE TABLE IF NOT EXISTS public.negociacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL DEFAULT '',
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  etapa TEXT NOT NULL DEFAULT 'Prospecção',
  probabilidade INTEGER NOT NULL DEFAULT 0 CHECK (probabilidade >= 0 AND probabilidade <= 100),
  data_prevista DATE NOT NULL DEFAULT NOW(),
  observacoes TEXT NOT NULL DEFAULT '',
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.negociacoes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_negociacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_negociacoes_updated_at ON public.negociacoes;
CREATE TRIGGER update_negociacoes_updated_at
  BEFORE UPDATE ON public.negociacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_negociacoes_updated_at();

CREATE POLICY "Authenticated users can view their negotiations"
  ON public.negociacoes FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their negotiations"
  ON public.negociacoes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their negotiations"
  ON public.negociacoes FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their negotiations"
  ON public.negociacoes FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS negociacoes_usuario_id_idx
  ON public.negociacoes (usuario_id);

CREATE INDEX IF NOT EXISTS negociacoes_lead_id_idx
  ON public.negociacoes (lead_id);

CREATE INDEX IF NOT EXISTS negociacoes_etapa_idx
  ON public.negociacoes (etapa);

COMMIT;
