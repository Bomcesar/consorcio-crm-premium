BEGIN;

-- Tabela de permissões padrão do sistema
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de concessão de permissões por usuário
CREATE TABLE IF NOT EXISTS public.user_permission_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permissao_id UUID NOT NULL REFERENCES public.user_permissions(id) ON DELETE CASCADE,
  concedido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  concedido_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(usuario_id, permissao_id)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_grants ENABLE ROW LEVEL SECURITY;

-- Permissões padrão do sistema
INSERT INTO public.user_permissions (codigo, nome, categoria, descricao)
VALUES
  ('leads.ver', 'Ver Leads', 'Leads', 'Visualizar leads'),
  ('leads.criar', 'Criar Leads', 'Leads', 'Cadastrar novos leads'),
  ('leads.editar', 'Editar Leads', 'Leads', 'Editar leads existentes'),
  ('leads.excluir', 'Excluir Leads', 'Leads', 'Excluir leads'),
  ('leads.ver_todos', 'Ver Leads de Todos', 'Leads', 'Visualizar leads de toda a equipe'),
  ('clientes.ver', 'Ver Clientes', 'Clientes', 'Visualizar clientes'),
  ('clientes.criar', 'Criar Clientes', 'Clientes', 'Cadastrar novos clientes'),
  ('clientes.editar', 'Editar Clientes', 'Clientes', 'Editar clientes'),
  ('clientes.excluir', 'Excluir Clientes', 'Clientes', 'Excluir clientes'),
  ('clientes.ver_todos', 'Ver Clientes de Todos', 'Clientes', 'Visualizar clientes de toda a equipe'),
  ('indicadores.ver', 'Ver Indicadores', 'Indicadores', 'Visualizar indicadores'),
  ('indicadores.criar', 'Criar Indicadores', 'Indicadores', 'Cadastrar indicadores'),
  ('indicadores.editar', 'Editar Indicadores', 'Indicadores', 'Editar indicadores'),
  ('indicadores.excluir', 'Excluir Indicadores', 'Indicadores', 'Excluir indicadores'),
  ('indicadores.ver_todos', 'Ver Indicadores de Todos', 'Indicadores', 'Visualizar indicadores de toda a equipe'),
  ('agenda.ver', 'Ver Agenda', 'Agenda', 'Visualizar agenda'),
  ('agenda.criar', 'Criar Agenda', 'Agenda', 'Criar eventos na agenda'),
  ('agenda.editar', 'Editar Agenda', 'Agenda', 'Editar eventos da agenda'),
  ('agenda.excluir', 'Excluir Agenda', 'Agenda', 'Excluir eventos da agenda'),
  ('negociacoes.ver', 'Ver Negociações', 'Negociações', 'Visualizar negociações'),
  ('negociacoes.criar', 'Criar Negociações', 'Negociações', 'Criar negociações'),
  ('negociacoes.editar', 'Editar Negociações', 'Negociações', 'Editar negociações'),
  ('negociacoes.excluir', 'Excluir Negociações', 'Negociações', 'Excluir negociações'),
  ('negociacoes.ver_todas', 'Ver Negociações da Equipe', 'Negociações', 'Visualizar negociações de toda a equipe'),
  ('pos_venda.ver', 'Ver Pós-venda', 'Pós-venda', 'Visualizar pós-venda'),
  ('pos_venda.criar', 'Criar Pós-venda', 'Pós-venda', 'Criar pós-venda'),
  ('pos_venda.editar', 'Editar Pós-venda', 'Pós-venda', 'Editar pós-venda'),
  ('comissoes.ver_proprias', 'Ver Próprias Comissões', 'Comissões', 'Visualizar próprias comissões'),
  ('comissoes.ver_todas', 'Ver Comissões da Equipe', 'Comissões', 'Visualizar comissões de toda a equipe'),
  ('relatorios.ver', 'Ver Relatórios', 'Relatórios', 'Visualizar relatórios'),
  ('relatorios.ver_equipe', 'Ver Relatórios da Equipe', 'Relatórios', 'Visualizar relatórios da equipe'),
  ('metas.ver', 'Ver Metas', 'Metas', 'Visualizar metas'),
  ('metas.editar', 'Editar Metas', 'Metas', 'Editar metas'),
  ('materiais.ver', 'Ver Materiais', 'Materiais', 'Visualizar materiais'),
  ('materiais.criar', 'Criar Materiais', 'Materiais', 'Criar materiais'),
  ('materiais.editar', 'Editar Materiais', 'Materiais', 'Editar materiais'),
  ('materiais.excluir', 'Excluir Materiais', 'Materiais', 'Excluir materiais'),
  ('treinamentos.ver', 'Ver Treinamentos', 'Treinamentos', 'Visualizar treinamentos'),
  ('treinamentos.criar', 'Criar Treinamentos', 'Treinamentos', 'Criar treinamentos'),
  ('treinamentos.editar', 'Editar Treinamentos', 'Treinamentos', 'Editar treinamentos'),
  ('treinamentos.excluir', 'Excluir Treinamentos', 'Treinamentos', 'Excluir treinamentos'),
  ('usuarios.ver', 'Ver Usuários', 'Usuários', 'Visualizar usuários'),
  ('usuarios.criar', 'Criar Usuários', 'Usuários', 'Criar usuários'),
  ('usuarios.editar', 'Editar Usuários', 'Usuários', 'Editar usuários'),
  ('usuarios.excluir', 'Excluir Usuários', 'Usuários', 'Excluir/desativar usuários'),
  ('usuarios.permissoes', 'Gerenciar Permissões', 'Usuários', 'Gerenciar permissões de usuários'),
  ('configuracoes.ver', 'Ver Configurações', 'Configurações', 'Visualizar configurações'),
  ('configuracoes.editar', 'Editar Configurações', 'Configurações', 'Editar configurações do sistema')
ON CONFLICT (codigo) DO NOTHING;

-- Policies para user_permissions
CREATE POLICY "Authenticated users can view permissions"
  ON public.user_permissions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can insert permissions"
  ON public.user_permissions FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Only admins can update permissions"
  ON public.user_permissions FOR UPDATE
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

CREATE POLICY "Only admins can delete permissions"
  ON public.user_permissions FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

-- Policies para user_permission_grants
CREATE POLICY "Users can view their own permission grants"
  ON public.user_permission_grants FOR SELECT
  USING (
    auth.uid() = usuario_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Only admins can insert permission grants"
  ON public.user_permission_grants FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Only admins can update permission grants"
  ON public.user_permission_grants FOR UPDATE
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

CREATE POLICY "Only admins can delete permission grants"
  ON public.user_permission_grants FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE INDEX IF NOT EXISTS user_permission_grants_usuario_id_idx ON public.user_permission_grants (usuario_id);
CREATE INDEX IF NOT EXISTS user_permission_grants_permissao_id_idx ON public.user_permission_grants (permissao_id);

COMMIT;
