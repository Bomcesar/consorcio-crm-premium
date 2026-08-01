BEGIN;

CREATE TABLE IF NOT EXISTS public.comissoes_indicadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id UUID NOT NULL REFERENCES public.indicadores(id) ON DELETE CASCADE,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pendente',
  pix TEXT NOT NULL DEFAULT '',
  data_pagamento DATE NULL,
  observacoes TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.comissoes_indicadores ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_comissoes_indicadores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_comissoes_indicadores_updated_at ON public.comissoes_indicadores;
CREATE TRIGGER update_comissoes_indicadores_updated_at
BEFORE UPDATE ON public.comissoes_indicadores
FOR EACH ROW
EXECUTE FUNCTION public.update_comissoes_indicadores_updated_at();

CREATE INDEX IF NOT EXISTS comissoes_indicadores_indicador_id_idx
  ON public.comissoes_indicadores (indicador_id);

CREATE INDEX IF NOT EXISTS comissoes_indicadores_usuario_id_idx
  ON public.comissoes_indicadores (usuario_id);

CREATE INDEX IF NOT EXISTS comissoes_indicadores_status_idx
  ON public.comissoes_indicadores (status);

DROP POLICY IF EXISTS "Authenticated users can view their indicator commissions" ON public.comissoes_indicadores;
CREATE POLICY "Authenticated users can view their indicator commissions"
  ON public.comissoes_indicadores FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can insert their indicator commissions" ON public.comissoes_indicadores;
CREATE POLICY "Authenticated users can insert their indicator commissions"
  ON public.comissoes_indicadores FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can update their indicator commissions" ON public.comissoes_indicadores;
CREATE POLICY "Authenticated users can update their indicator commissions"
  ON public.comissoes_indicadores FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can delete their indicator commissions" ON public.comissoes_indicadores;
CREATE POLICY "Authenticated users can delete their indicator commissions"
  ON public.comissoes_indicadores FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

COMMIT;
