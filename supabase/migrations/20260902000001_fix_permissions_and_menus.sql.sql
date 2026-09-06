BEGIN;

-- ==========================================
-- 1. Add missing menu permissions
-- ==========================================

INSERT INTO public.user_permissions (codigo, nome, categoria, descricao) VALUES
  ('central_indicadores.ver', 'Ver Central de Indicadores', 'Central de Indicadores', 'Visualizar central de indicadores'),
  ('contatos.ver', 'Ver Contatos', 'Contatos', 'Visualizar contatos'),
  ('whatsapp.ver', 'Ver WhatsApp', 'WhatsApp', 'Visualizar conversas do WhatsApp'),
  ('comunicacao.ver', 'Ver Comunicação', 'Comunicação', 'Visualizar comunicação'),
  ('parceiros.ver', 'Ver Parceiros', 'Parceiros', 'Visualizar parceiros'),
  ('parceiros.criar', 'Criar Parceiros', 'Parceiros', 'Cadastrar parceiros'),
  ('parceiros.editar', 'Editar Parceiros', 'Parceiros', 'Editar parceiros'),
  ('parceiros.excluir', 'Excluir Parceiros', 'Parceiros', 'Excluir parceiros'),
  ('recrutamento.ver', 'Ver Recrutamento', 'Recrutamento', 'Visualizar recrutamento'),
  ('recrutamento.criar', 'Criar Recrutamento', 'Recrutamento', 'Cadastrar recrutamento'),
  ('recrutamento.editar', 'Editar Recrutamento', 'Recrutamento', 'Editar recrutamento'),
  ('recrutamento.excluir', 'Excluir Recrutamento', 'Recrutamento', 'Excluir recrutamento'),
  ('biblioteca.ver', 'Ver Biblioteca', 'Biblioteca', 'Visualizar biblioteca'),
  ('links_uteis.ver', 'Ver Links Úteis', 'Links Úteis', 'Visualizar links úteis'),
  ('cobranca.ver', 'Ver Cobranças', 'Cobranças', 'Visualizar cobranças')
ON CONFLICT (codigo) DO NOTHING;

-- ==========================================
-- 2. Recreate RLS policies for user_permission_grants
-- ==========================================

DROP POLICY IF EXISTS "Users can view their own permission grants" ON public.user_permission_grants;
DROP POLICY IF EXISTS "Only admins can insert permission grants" ON public.user_permission_grants;
DROP POLICY IF EXISTS "Only admins can update permission grants" ON public.user_permission_grants;
DROP POLICY IF EXISTS "Only admins can delete permission grants" ON public.user_permission_grants;

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

-- ==========================================
-- 3. Add INSERT/UPDATE/DELETE policies for user_permissions
-- ==========================================

DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Only admins can insert permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Only admins can update permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Only admins can delete permissions" ON public.user_permissions;

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

NOTIFY postgrest, 'reload schema';

COMMIT;
