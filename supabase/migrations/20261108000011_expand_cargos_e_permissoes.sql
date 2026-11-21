-- Migration: 20261108000011_expand_cargos_e_permissoes.sql
-- Objetivo: expandir cargos e permissoes do sistema hierarquico.
-- Principio: apenas adicionar o que esta ausente. Nao DROP CASCADE. Nao apagar dados.
--           Nao alterar o modulo Credito Investimento. Preservar marked_id.
-- Compatibilidade: 10 perfis (Administrador, Gestor Pleno, Gestor, Consultor Pleno,
--           Consultor, Consultor em prévia, Líder em treinamento, Indicador, Trainee, Secretaria).
-- AUTossuficiente: cria tabelas ausentes e os dez presets, se as migrations anteriores nao foram aplicadas.

BEGIN;

-- ============================================================
-- 0. GARANTIR QUE TABELAS BASE EXISTEM (caso migrations anteriores nao tenham sido aplicadas)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permission_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permission_preset_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id UUID NOT NULL REFERENCES public.permission_presets(id) ON DELETE CASCADE,
  permissao_id UUID NOT NULL REFERENCES public.user_permissions(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 0,
  UNIQUE(preset_id, permissao_id)
);

-- ============================================================
-- 1. DEZ PRESETS (todos cadastrados com ON CONFLICT DO NOTHING)
-- ============================================================

INSERT INTO public.permission_presets (nome, descricao, categoria)
VALUES
  ('Administrador', 'Acesso total ao sistema', 'Administracao'),
  ('Gestor Pleno', 'Gestao operacional ampliada, sem configuracoes estruturais', 'Gerencia'),
  ('Gestor', 'Gerenciamento de equipe e indicadores', 'Gerencia'),
  ('Consultor Pleno', 'Autonomia operacional ampliada', 'Comercial'),
  ('Consultor', 'Operacoes de vendas e atendimento', 'Comercial'),
  ('Consultor em previa', 'Acesso operacional restrito', 'Comercial'),
  ('Lider em treinamento', 'Acesso limitado de desenvolvimento', 'Gerencia'),
  ('Indicador', 'Acesso inicial restrito', 'Comercial'),
  ('Trainee', 'Legado, equivalente a Consultor em previa', 'Comercial'),
  ('Secretaria', 'Apoio operacional, matriz independente', 'Administrativo')
ON CONFLICT (nome) DO NOTHING;

-- ============================================================
-- 2. PERMISSÕES AUSENTES NA TABELA user_permissions
-- Códigos referenciados por src/lib/auth-user.ts que ainda não existem.
-- ============================================================

INSERT INTO public.user_permissions (codigo, nome, categoria, descricao)
VALUES
  -- Metas
  ('metas.excluir', 'Excluir Metas', 'Metas', 'Excluir metas de venda'),

  -- Usuarios / hierarquia
  ('usuarios.promover_admin', 'Promover para Administrador', 'Usuarios', 'Promover usuario ao perfil Administrador'),
  ('usuarios.alterar_gestor', 'Alterar Gestor do Usuario', 'Usuarios', 'Alterar o gestor responsavel por um usuario'),

  -- Seguranca / estrutura
  ('seguranca.global', 'Seguranca Global', 'Seguranca', 'Acesso a configuracoes de segurancas globais'),
  ('schema.alterar', 'Alterar Schema', 'Seguranca', 'Alterar estrutura do banco de dados'),
  ('rls.alterar', 'Alterar Policies RLS', 'Seguranca', 'Alterar políticas de seguranca em nivel de linha'),

  -- Credito Investimento (modulo preservado — apenas registros de permissao)
  ('credito_investimento.visualizar', 'Ver Credito Investimento', 'Credito Investimento', 'Visualizar pipeline de credito'),
  ('credito_investimento.criar', 'Criar Credito Investimento', 'Credito Investimento', 'Criar novos registros de credito'),
  ('credito_investimento.editar', 'Editar Credito Investimento', 'Credito Investimento', 'Editar registros de credito existentes'),

  -- Links uteis
  ('links_uteis.visualizar', 'Ver Links Uteis', 'Links Uteis', 'Visualizar links uteis'),
  ('links_uteis.criar', 'Criar Links Uteis', 'Links Uteis', 'Criar links uteis'),
  ('links_uteis.editar', 'Editar Links Uteis', 'Links Uteis', 'Editar links uteis existentes'),

  -- Playbooks
  ('playbooks.visualizar', 'Ver Playbooks', 'Playbooks', 'Visualizar playbooks de atendimento'),
  ('playbooks.criar', 'Criar Playbooks', 'Playbooks', 'Criar playbooks de atendimento'),
  ('playbooks.editar', 'Editar Playbooks', 'Playbooks', 'Editar playbooks existentes'),

  -- Simulacoes
  ('simulacoes.visualizar', 'Ver Simulacoes', 'Simulacoes', 'Visualizar simulacoes de credito'),
  ('simulacoes.criar', 'Criar Simulacoes', 'Simulacoes', 'Criar simulacoes de credito'),
  ('simulacoes.editar', 'Editar Simulacoes', 'Simulacoes', 'Editar simulacoes existentes'),

  -- Reunioes
  ('reunioes.visualizar', 'Ver Reunioes', 'Reunioes', 'Visualizar reunioes agendadas'),
  ('reunioes.criar', 'Criar Reunioes', 'Reunioes', 'Criar novas reunioes'),
  ('reunioes.editar', 'Editar Reunioes', 'Reunioes', 'Editar reunioes existentes'),

  -- Tarefas
  ('tarefas.visualizar', 'Ver Tarefas', 'Tarefas', 'Visualizar tarefas'),
  ('tarefas.criar', 'Criar Tarefas', 'Tarefas', 'Criar novas tarefas'),
  ('tarefas.editar', 'Editar Tarefas', 'Tarefas', 'Editar tarefas existentes')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- 3. VINCULACAO DE PERMISSOES AOS PRESETS (matriz intencionalmente definida para todos os dez cargos)
-- ============================================================

-- 3.1. Administrador — acesso total (24 permissoes)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Administrador'
  AND up.codigo IN (
    'metas.excluir',
    'usuarios.promover_admin',
    'usuarios.alterar_gestor',
    'seguranca.global',
    'schema.alterar',
    'rls.alterar',
    'credito_investimento.visualizar',
    'credito_investimento.criar',
    'credito_investimento.editar',
    'links_uteis.visualizar',
    'links_uteis.criar',
    'links_uteis.editar',
    'playbooks.visualizar',
    'playbooks.criar',
    'playbooks.editar',
    'simulacoes.visualizar',
    'simulacoes.criar',
    'simulacoes.editar',
    'reunioes.visualizar',
    'reunioes.criar',
    'reunioes.editar',
    'tarefas.visualizar',
    'tarefas.criar',
    'tarefas.editar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.2. Gestor Pleno — gestao operacional ampliada (19 permissoes)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Gestor Pleno'
  AND up.codigo IN (
    'metas.excluir',
    'credito_investimento.visualizar',
    'credito_investimento.criar',
    'credito_investimento.editar',
    'links_uteis.visualizar',
    'links_uteis.criar',
    'links_uteis.editar',
    'playbooks.visualizar',
    'playbooks.criar',
    'playbooks.editar',
    'simulacoes.visualizar',
    'simulacoes.criar',
    'simulacoes.editar',
    'reunioes.visualizar',
    'reunioes.criar',
    'reunioes.editar',
    'tarefas.visualizar',
    'tarefas.criar',
    'tarefas.editar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.3. Gestor — gerenciamento de equipe (19 permissoes)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Gestor'
  AND up.codigo IN (
    'metas.excluir',
    'credito_investimento.visualizar',
    'credito_investimento.criar',
    'credito_investimento.editar',
    'links_uteis.visualizar',
    'links_uteis.criar',
    'links_uteis.editar',
    'playbooks.visualizar',
    'playbooks.criar',
    'playbooks.editar',
    'simulacoes.visualizar',
    'simulacoes.criar',
    'simulacoes.editar',
    'reunioes.visualizar',
    'reunioes.criar',
    'reunioes.editar',
    'tarefas.visualizar',
    'tarefas.criar',
    'tarefas.editar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.4. Consultor Pleno — autonomia operacional ampliada (19 permissoes)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Consultor Pleno'
  AND up.codigo IN (
    'credito_investimento.visualizar',
    'credito_investimento.criar',
    'credito_investimento.editar',
    'links_uteis.visualizar',
    'links_uteis.criar',
    'links_uteis.editar',
    'playbooks.visualizar',
    'playbooks.criar',
    'playbooks.editar',
    'simulacoes.visualizar',
    'simulacoes.criar',
    'simulacoes.editar',
    'reunioes.visualizar',
    'reunioes.criar',
    'reunioes.editar',
    'tarefas.visualizar',
    'tarefas.criar',
    'tarefas.editar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.5. Consultor — operacoes de vendas e atendimento (14 permissoes)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Consultor'
  AND up.codigo IN (
    'credito_investimento.visualizar',
    'credito_investimento.criar',
    'credito_investimento.editar',
    'playbooks.visualizar',
    'simulacoes.visualizar',
    'simulacoes.criar',
    'simulacoes.editar',
    'reunioes.visualizar',
    'reunioes.criar',
    'reunioes.editar',
    'tarefas.visualizar',
    'tarefas.criar',
    'tarefas.editar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.6. Consultor em previa — acesso operacional restrito (1 permissao: playbooks.visualizar)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Consultor em previa'
  AND up.codigo IN (
    'playbooks.visualizar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.7. Lider em treinamento — acesso limitado de desenvolvimento (1 permissao: playbooks.visualizar)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Lider em treinamento'
  AND up.codigo IN (
    'playbooks.visualizar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.8. Indicador — acesso inicial restrito (1 permissao: playbooks.visualizar)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Indicador'
  AND up.codigo IN (
    'playbooks.visualizar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.9. Trainee — legado, equivalente a Consultor em previa (1 permissao: playbooks.visualizar)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Trainee'
  AND up.codigo IN (
    'playbooks.visualizar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.10. Secretaria — apoio operacional, matriz independente (14 permissoes)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Secretaria'
  AND up.codigo IN (
    'credito_investimento.visualizar',
    'credito_investimento.criar',
    'credito_investimento.editar',
    'playbooks.visualizar',
    'simulacoes.visualizar',
    'simulacoes.criar',
    'simulacoes.editar',
    'reunioes.visualizar',
    'reunioes.criar',
    'reunioes.editar',
    'tarefas.visualizar',
    'tarefas.criar',
    'tarefas.editar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- ============================================================
-- 4. INDICES DE SUPORTE (somente se ausentes)
-- ============================================================

CREATE INDEX IF NOT EXISTS user_permissions_categoria_idx ON public.user_permissions (categoria);
CREATE INDEX IF NOT EXISTS permission_presets_nome_idx ON public.permission_presets (nome);
CREATE INDEX IF NOT EXISTS permission_preset_items_preset_id_idx ON public.permission_preset_items (preset_id);
CREATE INDEX IF NOT EXISTS permission_preset_items_permissao_id_idx ON public.permission_preset_items (permissao_id);

-- ============================================================
-- 5. SEGURANÇA — ROW LEVEL SECURITY NAS TABELAS DE PRESETS
-- ============================================================

-- Habilitar RLS nas duas tabelas (nao depende de funcoes da migration 00003)
ALTER TABLE public.permission_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_preset_items ENABLE ROW LEVEL SECURITY;

-- Policies para permission_presets
DROP POLICY IF EXISTS "Authenticated users can view permission presets" ON public.permission_presets;
CREATE POLICY "Authenticated users can view permission presets"
  ON public.permission_presets FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Only admins can insert permission presets" ON public.permission_presets;
CREATE POLICY "Only admins can insert permission presets"
  ON public.permission_presets FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

DROP POLICY IF EXISTS "Only admins can update permission presets" ON public.permission_presets;
CREATE POLICY "Only admins can update permission presets"
  ON public.permission_presets FOR UPDATE
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

DROP POLICY IF EXISTS "Only admins can delete permission presets" ON public.permission_presets;
CREATE POLICY "Only admins can delete permission presets"
  ON public.permission_presets FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

-- Policies para permission_preset_items
DROP POLICY IF EXISTS "Authenticated users can view permission preset items" ON public.permission_preset_items;
CREATE POLICY "Authenticated users can view permission preset items"
  ON public.permission_preset_items FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Only admins can insert permission preset items" ON public.permission_preset_items;
CREATE POLICY "Only admins can insert permission preset items"
  ON public.permission_preset_items FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

DROP POLICY IF EXISTS "Only admins can update permission preset items" ON public.permission_preset_items;
CREATE POLICY "Only admins can update permission preset items"
  ON public.permission_preset_items FOR UPDATE
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

DROP POLICY IF EXISTS "Only admins can delete permission preset items" ON public.permission_preset_items;
CREATE POLICY "Only admins can delete permission preset items"
  ON public.permission_preset_items FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

COMMIT;
