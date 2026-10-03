BEGIN;

-- ============================================================
-- Fix: Allow Gestores (managers) to INSERT/UPDATE/DELETE metas
--
-- The original policies in 20260822000001_create_metas_system.sql.sql
-- only permitted Administradores for INSERT/UPDATE/DELETE.
-- However, the application-level permission system (hasPermission)
-- grants Gestores the "metas.editar" permission, and the module
-- visibility table grants Gestores access to the /metas route.
--
-- This caused a mismatch: Gestores passed the client-side permission
-- check but received a 403 Forbidden from the Supabase REST API
-- because the database RLS policy rejected them.
-- ============================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Only admins can insert metas" ON public.metas;
DROP POLICY IF EXISTS "Only admins can update metas" ON public.metas;
DROP POLICY IF EXISTS "Only admins can delete metas" ON public.metas;

-- Recreate INSERT policy: allow Administradores and Gestores
CREATE POLICY "Admins and Gestores can insert metas"
  ON public.metas FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

-- Recreate UPDATE policy: allow Administradores and Gestores
CREATE POLICY "Admins and Gestores can update metas"
  ON public.metas FOR UPDATE
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

-- Recreate DELETE policy: allow Administradores and Gestores
CREATE POLICY "Admins and Gestores can delete metas"
  ON public.metas FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

COMMIT;
