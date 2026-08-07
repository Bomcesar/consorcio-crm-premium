BEGIN;

ALTER TABLE public.agendas
  ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE;

ALTER TABLE public.agendas
  ALTER COLUMN indicador_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agendas_target_check'
  ) THEN
    ALTER TABLE public.agendas
      ADD CONSTRAINT agendas_target_check
      CHECK (
        (indicador_id IS NOT NULL AND cliente_id IS NULL)
        OR (indicador_id IS NULL AND cliente_id IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS agendas_cliente_id_idx ON public.agendas (cliente_id);

CREATE TABLE IF NOT EXISTS public.pos_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  agenda_id UUID NULL REFERENCES public.agendas(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Boas-vindas',
  priority TEXT NOT NULL DEFAULT 'Media',
  satisfaction INTEGER NOT NULL DEFAULT 3,
  next_contact_at TIMESTAMPTZ NULL,
  last_contact_at TIMESTAMPTZ NULL,
  channel TEXT NOT NULL DEFAULT 'Telefone',
  needs_attention BOOLEAN NOT NULL DEFAULT FALSE,
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pos_venda_satisfaction_check CHECK (satisfaction BETWEEN 1 AND 5),
  CONSTRAINT pos_venda_cliente_usuario_unique UNIQUE (usuario_id, cliente_id)
);

ALTER TABLE public.pos_venda ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_pos_venda_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_pos_venda_updated_at ON public.pos_venda;
CREATE TRIGGER update_pos_venda_updated_at
BEFORE UPDATE ON public.pos_venda
FOR EACH ROW
EXECUTE FUNCTION public.update_pos_venda_updated_at();

CREATE INDEX IF NOT EXISTS pos_venda_usuario_id_idx ON public.pos_venda (usuario_id);
CREATE INDEX IF NOT EXISTS pos_venda_cliente_id_idx ON public.pos_venda (cliente_id);
CREATE INDEX IF NOT EXISTS pos_venda_next_contact_at_idx ON public.pos_venda (next_contact_at);
CREATE INDEX IF NOT EXISTS pos_venda_status_idx ON public.pos_venda (status);

DROP POLICY IF EXISTS "Authenticated users can view their pos_venda" ON public.pos_venda;
CREATE POLICY "Authenticated users can view their pos_venda"
  ON public.pos_venda FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can insert their pos_venda" ON public.pos_venda;
CREATE POLICY "Authenticated users can insert their pos_venda"
  ON public.pos_venda FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can update their pos_venda" ON public.pos_venda;
CREATE POLICY "Authenticated users can update their pos_venda"
  ON public.pos_venda FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can delete their pos_venda" ON public.pos_venda;
CREATE POLICY "Authenticated users can delete their pos_venda"
  ON public.pos_venda FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

COMMIT;