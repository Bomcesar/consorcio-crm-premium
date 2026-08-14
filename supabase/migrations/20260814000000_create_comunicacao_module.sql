BEGIN;

CREATE TABLE IF NOT EXISTS public.comunicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL DEFAULT 'WhatsApp',
  contato TEXT NOT NULL DEFAULT '',
  observacao TEXT NOT NULL DEFAULT '',
  resultado TEXT NOT NULL DEFAULT '',
  data DATE NOT NULL DEFAULT NOW(),
  horario TIME NOT NULL DEFAULT NOW(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  indicador_id UUID REFERENCES public.indicadores(id) ON DELETE SET NULL,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.comunicacoes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_comunicacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_comunicacoes_updated_at ON public.comunicacoes;
CREATE TRIGGER update_comunicacoes_updated_at
  BEFORE UPDATE ON public.comunicacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comunicacoes_updated_at();

CREATE POLICY "Authenticated users can view their comunicacoes"
  ON public.comunicacoes FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their comunicacoes"
  ON public.comunicacoes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their comunicacoes"
  ON public.comunicacoes FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their comunicacoes"
  ON public.comunicacoes FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE TABLE IF NOT EXISTS public.comunicacao_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL DEFAULT '',
  conteudo TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'WhatsApp',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.comunicacao_templates ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_comunicacao_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_comunicacao_templates_updated_at ON public.comunicacao_templates;
CREATE TRIGGER update_comunicacao_templates_updated_at
  BEFORE UPDATE ON public.comunicacao_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comunicacao_templates_updated_at();

CREATE POLICY "Authenticated users can view their comunicacao templates"
  ON public.comunicacao_templates FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their comunicacao templates"
  ON public.comunicacao_templates FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their comunicacao templates"
  ON public.comunicacao_templates FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their comunicacao templates"
  ON public.comunicacao_templates FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS comunicacoes_usuario_id_idx ON public.comunicacoes (usuario_id);
CREATE INDEX IF NOT EXISTS comunicacoes_lead_id_idx ON public.comunicacoes (lead_id);
CREATE INDEX IF NOT EXISTS comunicacoes_cliente_id_idx ON public.comunicacoes (cliente_id);
CREATE INDEX IF NOT EXISTS comunicacoes_indicador_id_idx ON public.comunicacoes (indicador_id);
CREATE INDEX IF NOT EXISTS comunicacoes_data_idx ON public.comunicacoes (data);
CREATE INDEX IF NOT EXISTS comunicacao_templates_usuario_id_idx ON public.comunicacao_templates (usuario_id);

COMMIT;
