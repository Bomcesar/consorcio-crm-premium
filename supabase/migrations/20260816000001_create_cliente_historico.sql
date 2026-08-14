BEGIN;

CREATE TABLE IF NOT EXISTS public.cliente_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'observacao',
  descricao TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cliente_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view their client history"
  ON public.cliente_historico FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their client history"
  ON public.cliente_historico FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS cliente_historico_cliente_id_idx
  ON public.cliente_historico (cliente_id);

COMMIT;
