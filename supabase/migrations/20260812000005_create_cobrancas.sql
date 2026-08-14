BEGIN;

CREATE TABLE IF NOT EXISTS public.cobrancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_pago NUMERIC(12,2) NOT NULL DEFAULT 0,
  metodo_pagamento TEXT NOT NULL DEFAULT '',
  data_vencimento DATE NOT NULL DEFAULT NOW(),
  data_pagamento DATE NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_cobrancas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_cobrancas_updated_at ON public.cobrancas;
CREATE TRIGGER update_cobrancas_updated_at
  BEFORE UPDATE ON public.cobrancas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cobrancas_updated_at();

CREATE POLICY "Authenticated users can view their cobrancas"
  ON public.cobrancas FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their cobrancas"
  ON public.cobrancas FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their cobrancas"
  ON public.cobrancas FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their cobrancas"
  ON public.cobrancas FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS cobrancas_usuario_id_idx
  ON public.cobrancas (usuario_id);

CREATE INDEX IF NOT EXISTS cobrancas_status_idx
  ON public.cobrancas (status);

COMMIT;
