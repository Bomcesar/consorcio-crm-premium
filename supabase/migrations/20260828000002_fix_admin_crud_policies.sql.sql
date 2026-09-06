BEGIN;

-- ============================================================
-- AJUSTE DE PERMISSÕES CRUD PARA MATERIAIS, TREINAMENTOS E LINKS
-- Garante que Administrador e Gestor possam gerenciar qualquer
-- registro, independentemente do usuario_id.
-- ============================================================

-- MATERIAIS CONSULTORES
DROP POLICY IF EXISTS "Authenticated users with admin/gestor can insert materiais_consultores" ON public.materiais_consultores;
DROP POLICY IF EXISTS "Authenticated users with admin/gestor can update their materiais_consultores" ON public.materiais_consultores;
DROP POLICY IF EXISTS "Authenticated users with admin/gestor can delete their materiais_consultores" ON public.materiais_consultores;

CREATE POLICY "Admin/gestor can insert materiais_consultores"
  ON public.materiais_consultores FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admin/gestor can update any materiais_consultores"
  ON public.materiais_consultores FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admin/gestor can delete any materiais_consultores"
  ON public.materiais_consultores FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

-- TREINAMENTOS
DROP POLICY IF EXISTS "Authenticated users with admin/gestor can insert treinamentos" ON public.treinamentos;
DROP POLICY IF EXISTS "Authenticated users with admin/gestor can update their treinamentos" ON public.treinamentos;
DROP POLICY IF EXISTS "Authenticated users with admin/gestor can delete their treinamentos" ON public.treinamentos;

CREATE POLICY "Admin/gestor can insert treinamentos"
  ON public.treinamentos FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admin/gestor can update any treinamentos"
  ON public.treinamentos FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admin/gestor can delete any treinamentos"
  ON public.treinamentos FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

-- LINKS ÚTEIS
DROP POLICY IF EXISTS "Authenticated users with admin/gestor can insert links_uteis" ON public.links_uteis;
DROP POLICY IF EXISTS "Authenticated users with admin/gestor can update their links_uteis" ON public.links_uteis;
DROP POLICY IF EXISTS "Authenticated users with admin/gestor can delete their links_uteis" ON public.links_uteis;

CREATE POLICY "Admin/gestor can insert links_uteis"
  ON public.links_uteis FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admin/gestor can update any links_uteis"
  ON public.links_uteis FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admin/gestor can delete any links_uteis"
  ON public.links_uteis FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

COMMIT;
