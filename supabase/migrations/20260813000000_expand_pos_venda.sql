BEGIN;

ALTER TABLE public.pos_venda
  ADD COLUMN IF NOT EXISTS boleto_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lembrete_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retencao_motivo TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS retencao_data TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.pos_venda_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_venda_id UUID NOT NULL REFERENCES public.pos_venda(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'observacao',
  descricao TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pos_venda_tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_venda_id UUID NOT NULL REFERENCES public.pos_venda(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  data_prevista DATE NOT NULL DEFAULT NOW(),
  data_realizada DATE NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pos_venda_comunicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_venda_id UUID NOT NULL REFERENCES public.pos_venda(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'whatsapp',
  descricao TEXT NOT NULL DEFAULT '',
  resultado TEXT NOT NULL DEFAULT '',
  data TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pos_venda_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_venda_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_venda_comunicacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view their pos_venda_historico"
  ON public.pos_venda_historico FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their pos_venda_historico"
  ON public.pos_venda_historico FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their pos_venda_historico"
  ON public.pos_venda_historico FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can view their pos_venda_tarefas"
  ON public.pos_venda_tarefas FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their pos_venda_tarefas"
  ON public.pos_venda_tarefas FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their pos_venda_tarefas"
  ON public.pos_venda_tarefas FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their pos_venda_tarefas"
  ON public.pos_venda_tarefas FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can view their pos_venda_comunicacoes"
  ON public.pos_venda_comunicacoes FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their pos_venda_comunicacoes"
  ON public.pos_venda_comunicacoes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their pos_venda_comunicacoes"
  ON public.pos_venda_comunicacoes FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their pos_venda_comunicacoes"
  ON public.pos_venda_comunicacoes FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS pos_venda_historico_pos_venda_id_idx ON public.pos_venda_historico (pos_venda_id);
CREATE INDEX IF NOT EXISTS pos_venda_tarefas_pos_venda_id_idx ON public.pos_venda_tarefas (pos_venda_id);
CREATE INDEX IF NOT EXISTS pos_venda_comunicacoes_pos_venda_id_idx ON public.pos_venda_comunicacoes (pos_venda_id);

COMMIT;
