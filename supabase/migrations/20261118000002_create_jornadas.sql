-- Migration: 20261118000002_create_jornadas.sql
-- Objetivo: Criar tabelas para as tres jornadas independentes (comercial, indicador, recrutamento).
-- Principio: FK para pessoas (identidade central) e vínculos. RLS por cargo. Historico e reunioes.
-- Compatibilidade: 10 perfis oficiais. Nao alterar migrations historicas.

BEGIN;

-- ============================================================
-- 1. TABELA jornadas
-- ============================================================

CREATE TABLE IF NOT EXISTS public.jornadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID REFERENCES public.pessoas(id) ON DELETE SET NULL,
  contato_id TEXT NOT NULL,
  contato_tipo TEXT NOT NULL CHECK (contato_tipo IN ('cliente', 'lead')),
  jornada_tipo TEXT NOT NULL CHECK (jornada_tipo IN ('cliente', 'indicador', 'recrutamento')),
  ativa BOOLEAN NOT NULL DEFAULT FALSE,
  etapa TEXT,
  iniciada_em TIMESTAMPTZ,
  encerrada_em TIMESTAMPTZ,
  responsavel TEXT,
  observacoes TEXT,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pessoa_id, jornada_tipo)
);

CREATE INDEX IF NOT EXISTS idx_jornadas_pessoa_id ON public.jornadas(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_jornadas_contato ON public.jornadas(contato_tipo, contato_id);
CREATE INDEX IF NOT EXISTS idx_jornadas_usuario_id ON public.jornadas(usuario_id);

-- ============================================================
-- 2. TABELA jornada_historico
-- ============================================================

CREATE TABLE IF NOT EXISTS public.jornada_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id UUID NOT NULL REFERENCES public.jornadas(id) ON DELETE CASCADE,
  etapa TEXT NOT NULL,
  data TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responsavel TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jornada_historico_jornada_id ON public.jornada_historico(jornada_id);

-- ============================================================
-- 3. TABELA jornada_reunioes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.jornada_reunioes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id UUID NOT NULL REFERENCES public.jornadas(id) ON DELETE CASCADE,
  data TIMESTAMPTZ NOT NULL,
  resultado TEXT NOT NULL CHECK (resultado IN ('positivo', 'neutro', 'negativo')),
  oportunidades TEXT[],
  observacoes TEXT,
  responsavel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jornada_reunioes_jornada_id ON public.jornada_reunioes(jornada_id);

-- ============================================================
-- 4. RLS — jornadas
-- ============================================================

ALTER TABLE public.jornadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jornadas: usuario ve proprias" ON public.jornadas FOR SELECT
  USING (usuario_id = auth.uid() OR public.is_admin_safe());

CREATE POLICY "Jornadas: gestor ve equipe" ON public.jornadas FOR SELECT
  USING (public.is_gestor_da_equipe(usuario_id));

CREATE POLICY "Jornadas: usuario insere para si" ON public.jornadas FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Jornadas: admin insere para terceiro" ON public.jornadas FOR INSERT
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Jornadas: usuario atualiza proprias" ON public.jornadas FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Jornadas: admin atualiza qualquer" ON public.jornadas FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Jornadas: admin exclui" ON public.jornadas FOR DELETE
  USING (public.is_admin_safe());

-- ============================================================
-- 5. RLS — jornada_historico
-- ============================================================

ALTER TABLE public.jornada_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "JornadaHistorico: usuario ve proprios" ON public.jornada_historico FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_historico.jornada_id AND j.usuario_id = auth.uid())
    OR public.is_admin_safe()
  );

CREATE POLICY "JornadaHistorico: gestor ve equipe" ON public.jornada_historico FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_historico.jornada_id AND public.is_gestor_da_equipe(j.usuario_id))
  );

CREATE POLICY "JornadaHistorico: usuario insere" ON public.jornada_historico FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_historico.jornada_id AND j.usuario_id = auth.uid())
  );

CREATE POLICY "JornadaHistorico: admin insere" ON public.jornada_historico FOR INSERT
  WITH CHECK (public.is_admin_safe());

-- ============================================================
-- 6. RLS — jornada_reunioes
-- ============================================================

ALTER TABLE public.jornada_reunioes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "JornadaReunioes: usuario ve proprias" ON public.jornada_reunioes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_reunioes.jornada_id AND j.usuario_id = auth.uid())
    OR public.is_admin_safe()
  );

CREATE POLICY "JornadaReunioes: gestor ve equipe" ON public.jornada_reunioes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_reunioes.jornada_id AND public.is_gestor_da_equipe(j.usuario_id))
  );

CREATE POLICY "JornadaReunioes: usuario insere" ON public.jornada_reunioes FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_reunioes.jornada_id AND j.usuario_id = auth.uid())
  );

CREATE POLICY "JornadaReunioes: admin insere" ON public.jornada_reunioes FOR INSERT
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "JornadaReunioes: usuario atualiza proprias" ON public.jornada_reunioes FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_reunioes.jornada_id AND j.usuario_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_reunioes.jornada_id AND j.usuario_id = auth.uid())
  );

CREATE POLICY "JornadaReunioes: admin atualiza qualquer" ON public.jornada_reunioes FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

COMMIT;
