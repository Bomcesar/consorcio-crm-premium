BEGIN;

ALTER TABLE public.recrutamento
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'ficha_completa',
  ADD COLUMN IF NOT EXISTS genero TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS endereco TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS equipe TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS veio_por TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS indicacao BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS catho BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS instagram BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS outros TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS trabalhou_vendas BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS trabalhou_comissionado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS clt BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS conhecimento_office BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS entende_prospeccao BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS facilidade_equipe BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS disponibilidade_integral BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS disponibilidade_finais_semana BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS conhece_consorcios BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS conhece_ademicon BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS por_onde_conheceu TEXT NOT NULL DEFAULT '';

DROP POLICY IF EXISTS "Authenticated users can view own recrutamento" ON public.recrutamento;
DROP POLICY IF EXISTS "Authenticated users can insert own recrutamento" ON public.recrutamento;
DROP POLICY IF EXISTS "Authenticated users can update own recrutamento" ON public.recrutamento;
DROP POLICY IF EXISTS "Authenticated users can delete own recrutamento" ON public.recrutamento;

CREATE POLICY "Authenticated users can view own recrutamento"
  ON public.recrutamento FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert own recrutamento"
  ON public.recrutamento FOR INSERT
  WITH CHECK (
    auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Authenticated users can update own recrutamento"
  ON public.recrutamento FOR UPDATE
  USING (
    auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Authenticated users can delete own recrutamento"
  ON public.recrutamento FOR DELETE
  USING (
    auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE INDEX IF NOT EXISTS recrutamento_tipo_idx ON public.recrutamento (tipo);
CREATE INDEX IF NOT EXISTS recrutamento_status_idx ON public.recrutamento (status);

COMMIT;
