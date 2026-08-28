BEGIN;

-- ============================================================
-- AJUSTE DE PERMISSÕES CRUD PARA INDICADORES
-- Garante que Administrador e Gestor possam gerenciar qualquer
-- indicador, independentemente do usuario_id.
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view their indicators" ON public.indicadores;
DROP POLICY IF EXISTS "Authenticated users can insert their indicators" ON public.indicadores;
DROP POLICY IF EXISTS "Authenticated users can update their indicators" ON public.indicadores;
DROP POLICY IF EXISTS "Authenticated users can delete their indicators" ON public.indicadores;

CREATE POLICY "Admin/gestor can view any indicators"
  ON public.indicadores FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      auth.uid() = usuario_id
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.perfil IN ('Administrador', 'Gestor')
      )
    )
  );

CREATE POLICY "Admin/gestor can insert indicators"
  ON public.indicadores FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      auth.uid() = usuario_id
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.perfil IN ('Administrador', 'Gestor')
      )
    )
  );

CREATE POLICY "Admin/gestor can update any indicators"
  ON public.indicadores FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND (
      auth.uid() = usuario_id
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.perfil IN ('Administrador', 'Gestor')
      )
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      auth.uid() = usuario_id
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.perfil IN ('Administrador', 'Gestor')
      )
    )
  );

CREATE POLICY "Admin/gestor can delete any indicators"
  ON public.indicadores FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND (
      auth.uid() = usuario_id
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.perfil IN ('Administrador', 'Gestor')
      )
    )
  );

COMMIT;
