BEGIN;

CREATE TABLE IF NOT EXISTS public.propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negociacao_id UUID REFERENCES public.negociacoes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'consorcio',
  conteudo TEXT NOT NULL DEFAULT '',
  link_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  acessos INTEGER NOT NULL DEFAULT 0,
  ultima_visualizacao TIMESTAMPTZ,
  data_envio TIMESTAMPTZ,
  enviado_para TEXT,
  enviado_canal TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_propostas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_propostas_updated_at ON public.propostas;
CREATE TRIGGER update_propostas_updated_at
  BEFORE UPDATE ON public.propostas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_propostas_updated_at();

CREATE OR REPLACE FUNCTION public.increment_proposta_acessos(proposta_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.propostas
    SET acessos = acessos + 1,
        ultima_visualizacao = NOW()
    WHERE id = proposta_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Users can view their proposals"
  ON public.propostas FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Public can view proposals by token"
  ON public.propostas FOR SELECT
  USING (true);

CREATE POLICY "Public can insert proposal events"
  ON public.proposta_eventos FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS propostas_usuario_id_idx
  ON public.propostas (usuario_id);

CREATE INDEX IF NOT EXISTS propostas_negociacao_id_idx
  ON public.propostas (negociacao_id);

CREATE INDEX IF NOT EXISTS propostas_link_token_idx
  ON public.propostas (link_token);

CREATE TABLE IF NOT EXISTS public.proposta_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  evento TEXT NOT NULL,
  detalhes TEXT,
  ip_origem TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.proposta_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for their proposals"
  ON public.proposta_eventos FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.propostas p
      WHERE p.id = proposta_id AND p.usuario_id = auth.uid()
    )
  );

CREATE POLICY "System can insert proposal events"
  ON public.proposta_eventos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS proposta_eventos_proposta_id_idx
  ON public.proposta_eventos (proposta_id);

CREATE INDEX IF NOT EXISTS proposta_eventos_created_at_idx
  ON public.proposta_eventos (created_at);

NOTIFY postgrest, 'reload schema';

COMMIT;
