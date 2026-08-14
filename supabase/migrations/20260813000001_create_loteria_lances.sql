BEGIN;

CREATE TABLE IF NOT EXISTS public.loteria_federal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_extracao INTEGER NOT NULL,
  data DATE NOT NULL DEFAULT NOW(),
  resultado TEXT NOT NULL DEFAULT '',
  grupo TEXT NOT NULL DEFAULT '',
  cota INTEGER NOT NULL DEFAULT 0,
  cliente_id UUID NULL REFERENCES public.clientes(id) ON DELETE SET NULL,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
  data DATE NOT NULL DEFAULT NOW(),
  assembleia_id UUID NULL REFERENCES public.assembleias(id) ON DELETE SET NULL,
  grupo TEXT NOT NULL DEFAULT '',
  cota INTEGER NOT NULL DEFAULT 0,
  cliente_id UUID NULL REFERENCES public.clientes(id) ON DELETE SET NULL,
  resultado TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Aguardando',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.loteria_federal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lances ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_loteria_federal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_lances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_loteria_federal_updated_at ON public.loteria_federal;
CREATE TRIGGER update_loteria_federal_updated_at
  BEFORE UPDATE ON public.loteria_federal
  FOR EACH ROW
  EXECUTE FUNCTION public.update_loteria_federal_updated_at();

DROP TRIGGER IF EXISTS update_lances_updated_at ON public.lances;
CREATE TRIGGER update_lances_updated_at
  BEFORE UPDATE ON public.lances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lances_updated_at();

CREATE POLICY "Authenticated users can view their loteria_federal"
  ON public.loteria_federal FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their loteria_federal"
  ON public.loteria_federal FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their loteria_federal"
  ON public.loteria_federal FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their loteria_federal"
  ON public.loteria_federal FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can view their lances"
  ON public.lances FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their lances"
  ON public.lances FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their lances"
  ON public.lances FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their lances"
  ON public.lances FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS loteria_federal_usuario_id_idx ON public.loteria_federal (usuario_id);
CREATE INDEX IF NOT EXISTS loteria_federal_data_idx ON public.loteria_federal (data);
CREATE INDEX IF NOT EXISTS lances_usuario_id_idx ON public.lances (usuario_id);
CREATE INDEX IF NOT EXISTS lances_assembleia_id_idx ON public.lances (assembleia_id);
CREATE INDEX IF NOT EXISTS lances_status_idx ON public.lances (status);

COMMIT;
