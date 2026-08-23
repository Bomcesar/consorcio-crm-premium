BEGIN;

-- Tabela de metas individuais e de equipe
CREATE TABLE IF NOT EXISTS public.metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'individual',
  valor_alvo NUMERIC NOT NULL DEFAULT 0,
  valor_realizado NUMERIC NOT NULL DEFAULT 0,
  periodo_inicio DATE NOT NULL DEFAULT NOW(),
  periodo_fim DATE NOT NULL DEFAULT NOW(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_aplicavel TEXT NOT NULL DEFAULT 'Consultor',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_metas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_metas_updated_at ON public.metas;
CREATE TRIGGER update_metas_updated_at
  BEFORE UPDATE ON public.metas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_metas_updated_at();

CREATE POLICY "Authenticated users can view relevant metas"
  ON public.metas FOR SELECT
  USING (
    (
      perfil_aplicavel IN ('Consultor', 'Assistente')
      AND (
        auth.uid() = usuario_id
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.perfil IN ('Administrador', 'Gestor')
        )
      )
    )
    OR perfil_aplicavel = 'Equipe'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Only admins can insert metas"
  ON public.metas FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Only admins can update metas"
  ON public.metas FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Only admins can delete metas"
  ON public.metas FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE INDEX IF NOT EXISTS metas_usuario_id_idx ON public.metas (usuario_id);
CREATE INDEX IF NOT EXISTS metas_perfil_aplicavel_idx ON public.metas (perfil_aplicavel);
CREATE INDEX IF NOT EXISTS metas_periodo_idx ON public.metas (periodo_inicio, periodo_fim);

COMMIT;
