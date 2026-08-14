BEGIN;

ALTER TABLE public.agenda_eventos
  ADD COLUMN IF NOT EXISTS indicador_id UUID REFERENCES public.indicadores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS negociacao_id UUID REFERENCES public.negociacoes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pos_venda_id UUID REFERENCES public.pos_venda(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proxima_acao TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS data_proxima_acao DATE,
  ADD COLUMN IF NOT EXISTS lembrete_em TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.agenda_tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ NOT NULL,
  local TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Tarefa',
  status TEXT NOT NULL DEFAULT 'Pendente',
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  indicador_id UUID REFERENCES public.indicadores(id) ON DELETE SET NULL,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agenda_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID REFERENCES public.agenda_eventos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  data_prevista DATE NOT NULL DEFAULT NOW(),
  data_realizada DATE NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agenda_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_followups ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_agenda_tarefas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_agenda_tarefas_updated_at ON public.agenda_tarefas;
CREATE TRIGGER update_agenda_tarefas_updated_at
  BEFORE UPDATE ON public.agenda_tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agenda_tarefas_updated_at();

CREATE OR REPLACE FUNCTION public.update_agenda_followups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_agenda_followups_updated_at ON public.agenda_followups;
CREATE TRIGGER update_agenda_followups_updated_at
  BEFORE UPDATE ON public.agenda_followups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agenda_followups_updated_at();

CREATE POLICY "Authenticated users can view their agenda tarefas"
  ON public.agenda_tarefas FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their agenda tarefas"
  ON public.agenda_tarefas FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their agenda tarefas"
  ON public.agenda_tarefas FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their agenda tarefas"
  ON public.agenda_tarefas FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can view their agenda followups"
  ON public.agenda_followups FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their agenda followups"
  ON public.agenda_followups FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their agenda followups"
  ON public.agenda_followups FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their agenda followups"
  ON public.agenda_followups FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS agenda_eventos_indicador_id_idx ON public.agenda_eventos (indicador_id);
CREATE INDEX IF NOT EXISTS agenda_eventos_negociacao_id_idx ON public.agenda_eventos (negociacao_id);
CREATE INDEX IF NOT EXISTS agenda_eventos_pos_venda_id_idx ON public.agenda_eventos (pos_venda_id);
CREATE INDEX IF NOT EXISTS agenda_tarefas_usuario_id_idx ON public.agenda_tarefas (usuario_id);
CREATE INDEX IF NOT EXISTS agenda_followups_evento_id_idx ON public.agenda_followups (evento_id);
CREATE INDEX IF NOT EXISTS agenda_followups_usuario_id_idx ON public.agenda_followups (usuario_id);

COMMIT;
