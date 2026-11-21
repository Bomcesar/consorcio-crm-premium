-- Migration: 20261118000001_create_pessoas_identidade.sql
-- Objetivo: Criar estrutura central de identidade (pessoas) e vinculos (pessoa_vinculos).
-- Principio: UUID central, integridade referencial, prevencao de duplicatas, RLS por cargo.
--           Nao alterar migrations historicas. Nao DROP CASCADE. Preservar dados existentes.
-- Compatibilidade: 10 perfis oficiais. Nao mesclar pessoas automaticamente.

BEGIN;

-- ============================================================
-- 1. TABELA pessoas — identidade central da pessoa
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pessoas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cpf_cnpj TEXT,
  cidade TEXT,
  estado TEXT,
  observacoes TEXT,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pessoas_usuario_id ON public.pessoas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pessoas_email ON public.pessoas(email);

-- ============================================================
-- 2. TABELA pessoa_vinculos — vinculos com entidades existentes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pessoa_vinculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  tipo_entidade TEXT NOT NULL CHECK (tipo_entidade IN ('cliente', 'lead', 'indicador', 'recrutamento')),
  entidade_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pessoa_id, tipo_entidade, entidade_id)
);

CREATE INDEX IF NOT EXISTS idx_pessoa_vinculos_pessoa_id ON public.pessoa_vinculos(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_pessoa_vinculos_entidade ON public.pessoa_vinculos(tipo_entidade, entidade_id);

-- ============================================================
-- 3. RLS — pessoas
-- ============================================================

ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;

-- SELECT: usuario ve proprias pessoas ou admin/gestor ve equipe
CREATE POLICY "Pessoas: usuario ve proprias" ON public.pessoas FOR SELECT
  USING (usuario_id = auth.uid() OR public.is_admin_safe());

CREATE POLICY "Pessoas: gestor ve equipe" ON public.pessoas FOR SELECT
  USING (public.is_gestor_da_equipe(usuario_id));

-- INSERT: usuario cria para si, admin para terceiro
CREATE POLICY "Pessoas: usuario insere para si" ON public.pessoas FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Pessoas: admin insere para terceiro" ON public.pessoas FOR INSERT
  WITH CHECK (public.is_admin_safe());

-- UPDATE: usuario atualiza proprias, admin atualiza qualquer
CREATE POLICY "Pessoas: usuario atualiza proprias" ON public.pessoas FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Pessoas: admin atualiza qualquer" ON public.pessoas FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

-- DELETE: admin exclui
CREATE POLICY "Pessoas: admin exclui" ON public.pessoas FOR DELETE
  USING (public.is_admin_safe());

-- ============================================================
-- 4. RLS — pessoa_vinculos
-- ============================================================

ALTER TABLE public.pessoa_vinculos ENABLE ROW LEVEL SECURITY;

-- SELECT: via pessoa (usuario da pessoa ou admin/gestor)
CREATE POLICY "Vinculos: usuario ve proprios" ON public.pessoa_vinculos FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.pessoas p WHERE p.id = pessoa_vinculos.pessoa_id AND p.usuario_id = auth.uid())
    OR public.is_admin_safe()
  );

CREATE POLICY "Vinculos: gestor ve equipe" ON public.pessoa_vinculos FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.pessoas p WHERE p.id = pessoa_vinculos.pessoa_id AND public.is_gestor_da_equipe(p.usuario_id))
  );

-- INSERT: usuario cria vinculo para pessoa propria, admin para terceiro
CREATE POLICY "Vinculos: usuario insere" ON public.pessoa_vinculos FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pessoas p WHERE p.id = pessoa_vinculos.pessoa_id AND p.usuario_id = auth.uid())
  );

CREATE POLICY "Vinculos: admin insere" ON public.pessoa_vinculos FOR INSERT
  WITH CHECK (public.is_admin_safe());

-- DELETE: admin exclui
CREATE POLICY "Vinculos: admin exclui" ON public.pessoa_vinculos FOR DELETE
  USING (public.is_admin_safe());

COMMIT;
