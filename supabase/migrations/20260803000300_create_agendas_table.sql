BEGIN;

CREATE TABLE IF NOT EXISTS public.agendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  indicador_id UUID NOT NULL REFERENCES public.indicadores(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  data_hora TIMESTAMPTZ NOT NULL,
  duracao_minutos INTEGER NOT NULL DEFAULT 30,
  tipo TEXT NOT NULL DEFAULT 'Reuniao',
  status TEXT NOT NULL DEFAULT 'Agendado',
  local_online TEXT NOT NULL DEFAULT '',
  notas_conclusao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agendas ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_agendas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_agendas_updated_at ON public.agendas;
CREATE TRIGGER update_agendas_updated_at
BEFORE UPDATE ON public.agendas
FOR EACH ROW
EXECUTE FUNCTION public.update_agendas_updated_at();

CREATE INDEX IF NOT EXISTS agendas_usuario_id_idx ON public.agendas (usuario_id);
CREATE INDEX IF NOT EXISTS agendas_indicador_id_idx ON public.agendas (indicador_id);
CREATE INDEX IF NOT EXISTS agendas_data_hora_idx ON public.agendas (data_hora);
CREATE INDEX IF NOT EXISTS agendas_status_idx ON public.agendas (status);

DROP POLICY IF EXISTS "Authenticated users can view their agendas" ON public.agendas;
CREATE POLICY "Authenticated users can view their agendas"
  ON public.agendas FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can insert their agendas" ON public.agendas;
CREATE POLICY "Authenticated users can insert their agendas"
  ON public.agendas FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can update their agendas" ON public.agendas;
CREATE POLICY "Authenticated users can update their agendas"
  ON public.agendas FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can delete their agendas" ON public.agendas;
CREATE POLICY "Authenticated users can delete their agendas"
  ON public.agendas FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

COMMIT;
