BEGIN;

CREATE TABLE IF NOT EXISTS public.agenda_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ NOT NULL,
  local TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Reunião',
  status TEXT NOT NULL DEFAULT 'Agendado',
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agenda_eventos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_agenda_eventos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_agenda_eventos_updated_at ON public.agenda_eventos;
CREATE TRIGGER update_agenda_eventos_updated_at
  BEFORE UPDATE ON public.agenda_eventos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agenda_eventos_updated_at();

CREATE POLICY "Authenticated users can view their agenda events"
  ON public.agenda_eventos FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their agenda events"
  ON public.agenda_eventos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their agenda events"
  ON public.agenda_eventos FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their agenda events"
  ON public.agenda_eventos FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS agenda_eventos_usuario_id_idx
  ON public.agenda_eventos (usuario_id);

CREATE INDEX IF NOT EXISTS agenda_eventos_data_inicio_idx
  ON public.agenda_eventos (data_inicio);

COMMIT;
