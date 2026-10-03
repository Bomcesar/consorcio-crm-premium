BEGIN;

-- ============================================================
-- MÓDULO: LIVE DE VOZ (FASE 6)
-- Categorias, presentes e envios.
--
-- IMPORTANTE: o presente representa uma FAIXA DE CRÉDITO
-- associada a quem está na cadeira. NÃO é transferência
-- financeira, não é saldo, não é pagamento. Não existe
-- carteira nem integração com gateway neste módulo.
-- ============================================================

-- ------------------------------------------------------------
-- live_presentes_categorias
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_presentes_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  emoji TEXT NOT NULL DEFAULT '',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS live_presentes_categorias_ordem_idx
  ON public.live_presentes_categorias (ordem, nome);

-- Subcategorias de SERVIÇOS (Saúde, Estética, Educação, Cursos, Outros)
CREATE TABLE IF NOT EXISTS public.live_presentes_subcategorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES public.live_presentes_categorias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (categoria_id, slug)
);

CREATE INDEX IF NOT EXISTS live_presentes_subcategorias_categoria_id_idx
  ON public.live_presentes_subcategorias (categoria_id, ordem);

-- ------------------------------------------------------------
-- live_presentes  (cadastro administrável — nada hard-coded no app)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_presentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES public.live_presentes_categorias(id) ON DELETE RESTRICT,
  subcategoria_id UUID REFERENCES public.live_presentes_subcategorias(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  -- Representação de crédito. NÃO é valor financeiro.
  valor_credito NUMERIC(12, 2) NOT NULL CHECK (valor_credito >= 0),
  imagem_path TEXT NOT NULL DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- O nome do presente é único dentro da categoria: evita duas
  -- faixas de crédito iguais registradas para o mesmo grupo.
  CONSTRAINT live_presentes_categoria_nome_unico UNIQUE (categoria_id, nome)
);

CREATE INDEX IF NOT EXISTS live_presentes_categoria_id_idx
  ON public.live_presentes (categoria_id, ordem);

CREATE INDEX IF NOT EXISTS live_presentes_ativo_idx
  ON public.live_presentes (ativo);

-- ------------------------------------------------------------
-- live_presentes_envios
-- Snapshot de valor e categoria no momento do envio:
-- desativar ou editar um presente NÃO altera o histórico.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_presentes_envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id UUID NOT NULL REFERENCES public.live_rooms(id) ON DELETE CASCADE,
  presente_id UUID REFERENCES public.live_presentes(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES public.live_presentes_categorias(id) ON DELETE SET NULL,
  categoria_nome TEXT NOT NULL DEFAULT '',
  presente_nome TEXT NOT NULL DEFAULT '',
  remetente_usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  remetente_convidado_hash TEXT,
  destinatario_participante_id UUID NOT NULL REFERENCES public.live_participantes(id) ON DELETE CASCADE,
  valor_credito_representado NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT live_presentes_envios_origem_check CHECK (
    (remetente_usuario_id IS NOT NULL AND remetente_convidado_hash IS NULL) OR
    (remetente_usuario_id IS NULL AND remetente_convidado_hash IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS live_presentes_envios_live_id_idx
  ON public.live_presentes_envios (live_id, created_at DESC);

CREATE INDEX IF NOT EXISTS live_presentes_envios_destinatario_idx
  ON public.live_presentes_envios (destinatario_participante_id, created_at DESC);

-- ------------------------------------------------------------
-- Triggers updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_live_presentes_categorias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_live_presentes_categorias_updated_at ON public.live_presentes_categorias;
CREATE TRIGGER update_live_presentes_categorias_updated_at
  BEFORE UPDATE ON public.live_presentes_categorias
  FOR EACH ROW EXECUTE FUNCTION public.update_live_presentes_categorias_updated_at();

CREATE OR REPLACE FUNCTION public.update_live_presentes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_live_presentes_updated_at ON public.live_presentes;
CREATE TRIGGER update_live_presentes_updated_at
  BEFORE UPDATE ON public.live_presentes
  FOR EACH ROW EXECUTE FUNCTION public.update_live_presentes_updated_at();

DROP TRIGGER IF EXISTS update_live_presentes_subcategorias_updated_at ON public.live_presentes_subcategorias;
CREATE TRIGGER update_live_presentes_subcategorias_updated_at
  BEFORE UPDATE ON public.live_presentes_subcategorias
  FOR EACH ROW EXECUTE FUNCTION public.update_live_presentes_updated_at();

-- ------------------------------------------------------------
-- Garantia: só é possível enviar presente para quem está EM CADEIRA
-- (a regra é do banco, não apenas da interface).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.live_presentes_destinatario_em_cadeira()
RETURNS TRIGGER AS $$
DECLARE
  v_em_cadeira BOOLEAN;
BEGIN
  SELECT (cadeira IS NOT NULL AND saiu_em IS NULL) INTO v_em_cadeira
  FROM public.live_participantes
  WHERE id = NEW.destinatario_participante_id
    AND live_id = NEW.live_id;

  IF v_em_cadeira IS NOT TRUE THEN
    RAISE EXCEPTION 'destinatario_fora_da_cadeira'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS live_presentes_destinatario_em_cadeira ON public.live_presentes_envios;
CREATE TRIGGER live_presentes_destinatario_em_cadeira
  BEFORE INSERT ON public.live_presentes_envios
  FOR EACH ROW EXECUTE FUNCTION public.live_presentes_destinatario_em_cadeira();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.live_presentes_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_presentes_subcategorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_presentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_presentes_envios ENABLE ROW LEVEL SECURITY;

-- Categorias -------------------------------------------------------------
-- Participantes veem só o que está ativo; o admin enxerga também os
-- registros desativados, para poder reativá-los.
DROP POLICY IF EXISTS "Autenticados veem categorias ativas" ON public.live_presentes_categorias;
CREATE POLICY "Autenticados veem categorias ativas"
  ON public.live_presentes_categorias FOR SELECT
  USING (auth.role() = 'authenticated' AND (ativo = TRUE OR public.is_admin()));

DROP POLICY IF EXISTS "Somente admin gerencia categorias" ON public.live_presentes_categorias;
CREATE POLICY "Somente admin gerencia categorias"
  ON public.live_presentes_categorias FOR ALL
  USING (auth.role() = 'authenticated' AND public.is_admin())
  WITH CHECK (auth.role() = 'authenticated' AND public.is_admin());

-- Subcategorias ----------------------------------------------------------
DROP POLICY IF EXISTS "Autenticados veem subcategorias ativas" ON public.live_presentes_subcategorias;
CREATE POLICY "Autenticados veem subcategorias ativas"
  ON public.live_presentes_subcategorias FOR SELECT
  USING (auth.role() = 'authenticated' AND (ativo = TRUE OR public.is_admin()));

DROP POLICY IF EXISTS "Somente admin gerencia subcategorias" ON public.live_presentes_subcategorias;
CREATE POLICY "Somente admin gerencia subcategorias"
  ON public.live_presentes_subcategorias FOR ALL
  USING (auth.role() = 'authenticated' AND public.is_admin())
  WITH CHECK (auth.role() = 'authenticated' AND public.is_admin());

-- Presentes --------------------------------------------------------------
DROP POLICY IF EXISTS "Autenticados veem presentes ativos" ON public.live_presentes;
CREATE POLICY "Autenticados veem presentes ativos"
  ON public.live_presentes FOR SELECT
  USING (auth.role() = 'authenticated' AND (ativo = TRUE OR public.is_admin()));

DROP POLICY IF EXISTS "Somente admin gerencia presentes" ON public.live_presentes;
CREATE POLICY "Somente admin gerencia presentes"
  ON public.live_presentes FOR ALL
  USING (auth.role() = 'authenticated' AND public.is_admin())
  WITH CHECK (auth.role() = 'authenticated' AND public.is_admin());

-- Envios -----------------------------------------------------------------
DROP POLICY IF EXISTS "Leio os presentes da sala" ON public.live_presentes_envios;
CREATE POLICY "Leio os presentes da sala"
  ON public.live_presentes_envios FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      public.live_e_anfitriao(live_id)
      OR public.live_participa(live_id)
      OR public.live_aberta(live_id)
    )
  );

DROP POLICY IF EXISTS "Envio presente em meu nome" ON public.live_presentes_envios;
CREATE POLICY "Envio presente em meu nome"
  ON public.live_presentes_envios FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      (remetente_usuario_id = auth.uid() AND remetente_convidado_hash IS NULL)
      OR public.live_e_anfitriao(live_id)
    )
    AND public.live_participa(live_id)
  );

-- Envios são imutáveis (preserva o histórico e o indicador)
DROP POLICY IF EXISTS "Ninguem altera envios" ON public.live_presentes_envios;
CREATE POLICY "Ninguem altera envios"
  ON public.live_presentes_envios FOR UPDATE
  USING (FALSE);

DROP POLICY IF EXISTS "Ninguem apaga envios" ON public.live_presentes_envios;
CREATE POLICY "Ninguem apaga envios"
  ON public.live_presentes_envios FOR DELETE
  USING (FALSE);

-- ============================================================
-- SEED — categorias e valores iniciais (editáveis no admin)
-- ============================================================

INSERT INTO public.live_presentes_categorias (nome, slug, emoji, ordem, ativo)
VALUES
  ('Motors / Veículos', 'motors', '🚗', 1, TRUE),
  ('Motos', 'motos', '🏍️', 2, TRUE),
  ('Lar / Imóveis', 'lar', '🏠', 3, TRUE),
  ('Serviços', 'servicos', '🛠️', 4, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  emoji = EXCLUDED.emoji,
  ordem = EXCLUDED.ordem;

INSERT INTO public.live_presentes_subcategorias (categoria_id, nome, slug, ordem, ativo)
SELECT c.id, s.nome, s.slug, s.ordem, TRUE
FROM public.live_presentes_categorias c
CROSS JOIN (
  VALUES
    ('Saúde', 'saude', 1),
    ('Estética', 'estetica', 2),
    ('Educação', 'educacao', 3),
    ('Cursos', 'cursos', 4),
    ('Outros', 'outros', 5)
) AS s(nome, slug, ordem)
WHERE c.slug = 'servicos'
ON CONFLICT (categoria_id, slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  ordem = EXCLUDED.ordem;

-- Valores de crédito representáveis: de R$ 1.000 a R$ 1.000.000.
-- O ID é derivado de md5(categoria + valor) e o conflito é resolvido
-- por (categoria, nome): reexecutar a migration não duplica linhas
-- nem sobrescreve ajustes feitos no admin.
-- Um registro por faixa, aplicado a todas as categorias.
INSERT INTO public.live_presentes (id, categoria_id, nome, valor_credito, imagem_path, ativo, ordem)
SELECT
  md5(c.slug || '-' || v.valor::text)::uuid,
  c.id,
  'R$ ' || to_char(v.valor, 'FM999,999,999'),
  v.valor,
  '',
  TRUE,
  (row_number() OVER (ORDER BY v.valor))::int
FROM public.live_presentes_categorias c
CROSS JOIN (
  VALUES
    (1000::numeric), (2000), (3000), (4000), (5000),
    (10000), (20000), (30000), (40000), (50000),
    (60000), (70000), (80000), (90000), (100000),
    (200000), (300000), (400000), (500000), (600000),
    (700000), (800000), (900000), (1000000)
) AS v(valor)
WHERE c.ativo = TRUE
ON CONFLICT (categoria_id, nome) DO NOTHING;

COMMIT;
