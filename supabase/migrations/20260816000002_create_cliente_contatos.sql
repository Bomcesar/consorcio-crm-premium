BEGIN;

CREATE TABLE IF NOT EXISTS public.cliente_contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'principal',
  observacoes TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cliente_contatos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_cliente_contatos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_cliente_contatos_updated_at ON public.cliente_contatos;
CREATE TRIGGER update_cliente_contatos_updated_at
  BEFORE UPDATE ON public.cliente_contatos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cliente_contatos_updated_at();

CREATE POLICY "Authenticated users can view their client contacts"
  ON public.cliente_contatos FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their client contacts"
  ON public.cliente_contatos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their client contacts"
  ON public.cliente_contatos FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their client contacts"
  ON public.cliente_contatos FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS cliente_contatos_cliente_id_idx
  ON public.cliente_contatos (cliente_id);

CREATE INDEX IF NOT EXISTS cliente_contatos_usuario_id_idx
  ON public.cliente_contatos (usuario_id);

COMMIT;
