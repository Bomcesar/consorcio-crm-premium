BEGIN;

CREATE TABLE IF NOT EXISTS public.assembleias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NULL REFERENCES public.clientes(id) ON DELETE SET NULL,
  grupo TEXT NOT NULL DEFAULT '',
  cota INTEGER NOT NULL DEFAULT 0,
  data DATE NOT NULL DEFAULT NOW(),
  numero_assembleia INTEGER NOT NULL DEFAULT 1,
  situacao TEXT NOT NULL DEFAULT 'Pendente',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assembleia_avisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembleia_id UUID NOT NULL REFERENCES public.assembleias(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'aviso',
  descricao TEXT NOT NULL DEFAULT '',
  data_envio TIMESTAMPTZ NULL,
  enviado BOOLEAN NOT NULL DEFAULT false,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assembleia_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembleia_id UUID NOT NULL REFERENCES public.assembleias(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'envio',
  descricao TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.assembleias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assembleia_avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assembleia_historico ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_assembleias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_assembleias_updated_at ON public.assembleias;
CREATE TRIGGER update_assembleias_updated_at
  BEFORE UPDATE ON public.assembleias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_assembleias_updated_at();

CREATE POLICY "Authenticated users can view their assembleias"
  ON public.assembleias FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their assembleias"
  ON public.assembleias FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their assembleias"
  ON public.assembleias FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their assembleias"
  ON public.assembleias FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can view their assembleia avisos"
  ON public.assembleia_avisos FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their assembleia avisos"
  ON public.assembleia_avisos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their assembleia avisos"
  ON public.assembleia_avisos FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their assembleia avisos"
  ON public.assembleia_avisos FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can view their assembleia historico"
  ON public.assembleia_historico FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their assembleia historico"
  ON public.assembleia_historico FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their assembleia historico"
  ON public.assembleia_historico FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS assembleias_usuario_id_idx ON public.assembleias (usuario_id);
CREATE INDEX IF NOT EXISTS assembleias_cliente_id_idx ON public.assembleias (cliente_id);
CREATE INDEX IF NOT EXISTS assembleias_data_idx ON public.assembleias (data);
CREATE INDEX IF NOT EXISTS assembleia_avisos_assembleia_id_idx ON public.assembleia_avisos (assembleia_id);
CREATE INDEX IF NOT EXISTS assembleia_historico_assembleia_id_idx ON public.assembleia_historico (assembleia_id);

COMMIT;
