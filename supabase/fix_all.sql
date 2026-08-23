-- Script definitivo: corrige recursão em profiles e adiciona usuario_id nas tabelas que faltam

-- ==========================================
-- 1. CORRIGE PROFILES (remove recursão)
-- ==========================================

-- Remove todas as policies antigas de profiles
DROP POLICY IF EXISTS "Allow authenticated users to view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Gestors can view team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Gestors can update team profiles" ON public.profiles;

-- Recria policies SEM RECURSÃO
CREATE POLICY "Authenticated users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = id);

CREATE POLICY "Authenticated users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = id);

-- Admins e Gestores podem gerenciar perfis (usa auth.uid() diretamente, sem subconsulta)
CREATE POLICY "Admins and gestors can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admins and gestors can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE perfil IN ('Administrador', 'Gestor')
    )
  );

-- ==========================================
-- 2. ADICIONA usuario_id NAS TABELAS QUE FALTAM
-- ==========================================

-- LEADS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'usuario_id'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN usuario_id UUID;
    UPDATE public.leads SET usuario_id = '00000000-0000-0000-0000-000000000000' WHERE usuario_id IS NULL;
    ALTER TABLE public.leads ALTER COLUMN usuario_id SET NOT NULL;
  END IF;
END $$;

-- CLIENTES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'usuario_id'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN usuario_id UUID;
    UPDATE public.clientes SET usuario_id = '00000000-0000-0000-0000-000000000000' WHERE usuario_id IS NULL;
    ALTER TABLE public.clientes ALTER COLUMN usuario_id SET NOT NULL;
  END IF;
END $$;

-- ==========================================
-- 3. CORRIGE RLS DE LEADS
-- ==========================================

DROP POLICY IF EXISTS "Allow authenticated users to view leads" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated users to insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can view their leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert their leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update their leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can delete their leads" ON public.leads;

CREATE POLICY "Authenticated users can view their leads"
  ON public.leads FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their leads"
  ON public.leads FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their leads"
  ON public.leads FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their leads"
  ON public.leads FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

-- ==========================================
-- 4. CORRIGE RLS DE CLIENTES
-- ==========================================

DROP POLICY IF EXISTS "Allow authenticated users to view clientes" ON public.clientes;
DROP POLICY IF EXISTS "Allow authenticated users to insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Allow authenticated users to update clientes" ON public.clientes;
DROP POLICY IF EXISTS "Allow authenticated users to delete clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can view their clients" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can insert their clients" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can update their clients" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can delete their clients" ON public.clientes;
DROP POLICY IF EXISTS "Admins can view all clientes" ON public.clientes;
DROP POLICY IF EXISTS "Gestors can view team clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can update any cliente" ON public.clientes;
DROP POLICY IF EXISTS "Gestors can update team clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can delete any cliente" ON public.clientes;
DROP POLICY IF EXISTS "Gestors can delete team clientes" ON public.clientes;

CREATE POLICY "Authenticated users can view their clients"
  ON public.clientes FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their clients"
  ON public.clientes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their clients"
  ON public.clientes FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their clients"
  ON public.clientes FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

-- ==========================================
-- 5. CRIA ÍNDICES PARA PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS leads_usuario_id_idx ON public.leads (usuario_id);
CREATE INDEX IF NOT EXISTS clientes_usuario_id_idx ON public.clientes (usuario_id);
