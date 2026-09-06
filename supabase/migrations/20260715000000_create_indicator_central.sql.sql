BEGIN;

CREATE TABLE IF NOT EXISTS public.central_indicadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  perfil TEXT NOT NULL DEFAULT 'Indicador',
  status TEXT NOT NULL DEFAULT 'Ativo',
  observacoes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.central_indicadores ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.central_indicador_contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id UUID NOT NULL REFERENCES public.central_indicadores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  etapa TEXT NOT NULL DEFAULT 'Contatos indicados',
  status TEXT NOT NULL DEFAULT 'Em prospecção',
  observacoes TEXT NOT NULL DEFAULT '',
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.central_indicador_contatos ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.central_indicador_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id UUID NOT NULL REFERENCES public.central_indicadores(id) ON DELETE CASCADE,
  contato_id UUID REFERENCES public.central_indicador_contatos(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  etapa TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.central_indicador_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view indicator central" ON public.central_indicadores;
DROP POLICY IF EXISTS "Authenticated users can insert indicator central" ON public.central_indicadores;
DROP POLICY IF EXISTS "Authenticated users can update indicator central" ON public.central_indicadores;

CREATE POLICY "Authenticated users can view indicator central"
  ON public.central_indicadores FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert indicator central"
  ON public.central_indicadores FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update indicator central"
  ON public.central_indicadores FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view indicator contacts" ON public.central_indicador_contatos;
DROP POLICY IF EXISTS "Authenticated users can insert indicator contacts" ON public.central_indicador_contatos;
DROP POLICY IF EXISTS "Authenticated users can update indicator contacts" ON public.central_indicador_contatos;

CREATE POLICY "Authenticated users can view indicator contacts"
  ON public.central_indicador_contatos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert indicator contacts"
  ON public.central_indicador_contatos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update indicator contacts"
  ON public.central_indicador_contatos FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view indicator history" ON public.central_indicador_historico;
DROP POLICY IF EXISTS "Authenticated users can insert indicator history" ON public.central_indicador_historico;
DROP POLICY IF EXISTS "Authenticated users can update indicator history" ON public.central_indicador_historico;

CREATE POLICY "Authenticated users can view indicator history"
  ON public.central_indicador_historico FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert indicator history"
  ON public.central_indicador_historico FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update indicator history"
  ON public.central_indicador_historico FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION public.update_central_indicadores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_central_indicador_contatos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_central_indicadores_updated_at ON public.central_indicadores;
CREATE TRIGGER update_central_indicadores_updated_at
BEFORE UPDATE ON public.central_indicadores
FOR EACH ROW
EXECUTE FUNCTION public.update_central_indicadores_updated_at();

DROP TRIGGER IF EXISTS update_central_indicador_contatos_updated_at ON public.central_indicador_contatos;
CREATE TRIGGER update_central_indicador_contatos_updated_at
BEFORE UPDATE ON public.central_indicador_contatos
FOR EACH ROW
EXECUTE FUNCTION public.update_central_indicador_contatos_updated_at();

CREATE INDEX IF NOT EXISTS central_indicadores_status_idx
  ON public.central_indicadores (status);

CREATE INDEX IF NOT EXISTS central_indicador_contatos_indicator_idx
  ON public.central_indicador_contatos (indicador_id);

CREATE INDEX IF NOT EXISTS central_indicador_historico_indicator_idx
  ON public.central_indicador_historico (indicador_id);

COMMIT;
