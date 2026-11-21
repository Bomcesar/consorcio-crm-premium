-- PACOTE 1: alteracoes aditivas seguras
-- Gerado a partir de supabase/migrations. Nao editar manualmente.
--
-- Aditivo e idempotente. Nao altera policies existentes e nao remove dados.
--
-- Como aplicar:
--   1. Execute 00-pre-voo.sql e confira o resultado.
--   2. Gere backup de producao (painel do Supabase ou pg_dump).
--   3. Cole este arquivo no SQL Editor e execute.
--   Escopo: apenas 20260930000000 e 20261121000001. Nao altera policies.

-- ============================================================
-- 20260930000000  (20260930000000_add_metas_and_usuarios_online_visibility.sql)
-- ============================================================
BEGIN;

-- ============================================================
-- VISIBILIDADE: Módulos adicionados após o seed original
-- Metas e Usuários Online não foram incluídos no seed inicial
-- da migration 20260824000001, causando inconsistência entre
-- localhost (sem module_visibility populada) e produção.
-- ============================================================

INSERT INTO public.module_visibility (perfil, modulo, href, titulo, visivel)
VALUES
  -- Metas: apenas Administrador e Gestor (conforme allowedRoles em navigation.ts)
  ('Administrador', 'Metas', '/metas', 'Metas', true),
  ('Gestor', 'Metas', '/metas', 'Metas', true),
  -- Usuários Online: todos os perfis
  ('Administrador', 'Usuários Online', '/usuarios-online', 'Usuários Online', true),
  ('Gestor', 'Usuários Online', '/usuarios-online', 'Usuários Online', true),
  ('Consultor', 'Usuários Online', '/usuarios-online', 'Usuários Online', true),
  ('Trainee', 'Usuários Online', '/usuarios-online', 'Usuários Online', true),
  ('Indicador', 'Usuários Online', '/usuarios-online', 'Usuários Online', true),
  ('Secretaria', 'Usuários Online', '/usuarios-online', 'Usuários Online', true)
ON CONFLICT (perfil, modulo) DO NOTHING;

COMMIT;

-- ============================================================
-- 20261121000001  (20261121000001_add_tags_to_leads.sql)
-- ============================================================
-- Migration: 20261121000001_add_tags_to_leads.sql
-- Adiciona coluna tags na tabela leads para suportar etiquetas comerciais.

BEGIN;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS tags TEXT;

COMMIT;
