BEGIN;

ALTER TABLE public.negociacoes
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ATIVO',
  ADD COLUMN IF NOT EXISTS cliente_nome TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS valor_credito NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grupo INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cota INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prazo INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxa NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_lance_entrada NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tipo_carta_credito TEXT NOT NULL DEFAULT 'NOVA_COTA',
  ADD COLUMN IF NOT EXISTS parcela_cheia NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parcela_reduzida NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS administradora TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo_bem TEXT NOT NULL DEFAULT 'IMOVEL',
  ADD COLUMN IF NOT EXISTS comissao_estimada_em_porcentagem NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS documentos_dados_cadastrais_checklist JSONB NOT NULL DEFAULT '[]'::jsonb;

DROP POLICY IF EXISTS "Authenticated users can view their negotiations" ON public.negociacoes;
DROP POLICY IF EXISTS "Authenticated users can insert their negotiations" ON public.negociacoes;
DROP POLICY IF EXISTS "Authenticated users can update their negotiations" ON public.negociacoes;
DROP POLICY IF EXISTS "Authenticated users can delete their negotiations" ON public.negociacoes;

CREATE POLICY "Authenticated users can view their negotiations"
  ON public.negociacoes FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their negotiations"
  ON public.negociacoes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their negotiations"
  ON public.negociacoes FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their negotiations"
  ON public.negociacoes FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS negociacoes_status_idx
  ON public.negociacoes (status);

COMMIT;
