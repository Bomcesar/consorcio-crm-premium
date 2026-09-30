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
