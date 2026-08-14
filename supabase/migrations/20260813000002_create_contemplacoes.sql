BEGIN;

CREATE TABLE IF NOT EXISTS public.contemplacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NULL REFERENCES public.clientes(id) ON DELETE SET NULL,
  grupo TEXT NOT NULL DEFAULT '',
  cota INTEGER NOT NULL DEFAULT 0,
  assembleia_id UUID NULL REFERENCES public.assembleias(id) ON DELETE SET NULL,
  data DATE NOT NULL DEFAULT NOW(),
  tipo TEXT NOT NULL DEFAULT 'Lance',
  resultado TEXT NOT NULL DEFAULT '',
  documentos TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contemplacao_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contemplacao_id UUID NOT NULL REFERENCES public.contemplacoes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'observacao',
  descricao TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contemplacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contemplacao_historico ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_contemplacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_contemplacoes_updated_at ON public.contemplacoes;
CREATE TRIGGER update_contemplacoes_updated_at
  BEFORE UPDATE ON public.contemplacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contemplacoes_updated_at();

CREATE POLICY "Authenticated users can view their contemplacoes"
  ON public.contemplacoes FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their contemplacoes"
  ON public.contemplacoes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their contemplacoes"
  ON public.contemplacoes FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their contemplacoes"
  ON public.contemplacoes FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can view their contemplacao historico"
  ON public.contemplacao_historico FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their contemplacao historico"
  ON public.contemplacao_historico FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their contemplacao historico"
  ON public.contemplacao_historico FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS contemplacoes_usuario_id_idx ON public.contemplacoes (usuario_id);
CREATE INDEX IF NOT EXISTS contemplacoes_cliente_id_idx ON public.contemplacoes (cliente_id);
CREATE INDEX IF NOT EXISTS contemplacoes_assembleia_id_idx ON public.contemplacoes (assembleia_id);
CREATE INDEX IF NOT EXISTS contemplacao_historico_contemplacao_id_idx ON public.contemplacao_historico (contemplacao_id);

COMMIT;
