BEGIN;

CREATE TABLE IF NOT EXISTS public.pos_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL DEFAULT 'Follow-up',
  descricao TEXT NOT NULL DEFAULT '',
  data_prevista DATE NOT NULL DEFAULT NOW(),
  data_realizada DATE NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

CREATE POLICY "Authenticated users can view their pos-venda"
  ON public.pos_venda FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their pos-venda"
  ON public.pos_venda FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their pos-venda"
  ON public.pos_venda FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their pos-venda"
  ON public.pos_venda FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS pos_venda_usuario_id_idx
  ON public.pos_venda (usuario_id);

CREATE INDEX IF NOT EXISTS pos_venda_status_idx
  ON public.pos_venda (status);

COMMIT;
