BEGIN;

CREATE TABLE IF NOT EXISTS public.whatsapp_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone TEXT NOT NULL DEFAULT '',
  mensagem TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'texto',
  status TEXT NOT NULL DEFAULT 'pendente',
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.whatsapp_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view their whatsapp messages"
  ON public.whatsapp_mensagens FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their whatsapp messages"
  ON public.whatsapp_mensagens FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their whatsapp messages"
  ON public.whatsapp_mensagens FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their whatsapp messages"
  ON public.whatsapp_mensagens FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS whatsapp_mensagens_usuario_id_idx
  ON public.whatsapp_mensagens (usuario_id);

CREATE INDEX IF NOT EXISTS whatsapp_mensagens_status_idx
  ON public.whatsapp_mensagens (status);

COMMIT;
