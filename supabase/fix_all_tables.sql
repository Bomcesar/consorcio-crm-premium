-- Script definitivo: corrige usuario_id e RLS em todas as tabelas do CRM

BEGIN;

-- ==========================================
-- TABELAS QUE PRECISAM DE usuario_id
-- ==========================================

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

-- CENTRAL INDICADORES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'central_indicadores' AND column_name = 'usuario_id'
  ) THEN
    ALTER TABLE public.central_indicadores ADD COLUMN usuario_id UUID;
    UPDATE public.central_indicadores SET usuario_id = '00000000-0000-0000-0000-000000000000' WHERE usuario_id IS NULL;
    ALTER TABLE public.central_indicadores ALTER COLUMN usuario_id SET NOT NULL;
  END IF;
END $$;

-- ==========================================
-- CORRIGE RLS DE CLIENTES
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
-- CORRIGE RLS DE CENTRAL INDICADORES
-- ==========================================

DROP POLICY IF EXISTS "Allow authenticated users to view central_indicadores" ON public.central_indicadores;
DROP POLICY IF EXISTS "Allow authenticated users to insert central_indicadores" ON public.central_indicadores;
DROP POLICY IF EXISTS "Allow authenticated users to update central_indicadores" ON public.central_indicadores;
DROP POLICY IF EXISTS "Allow authenticated users to delete central_indicadores" ON public.central_indicadores;

CREATE POLICY "Authenticated users can view their central_indicadores"
  ON public.central_indicadores FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their central_indicadores"
  ON public.central_indicadores FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their central_indicadores"
  ON public.central_indicadores FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their central_indicadores"
  ON public.central_indicadores FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

-- ==========================================
-- CRIA ÍNDICES
-- ==========================================

CREATE INDEX IF NOT EXISTS clientes_usuario_id_idx ON public.clientes (usuario_id);
CREATE INDEX IF NOT EXISTS central_indicadores_usuario_id_idx ON public.central_indicadores (usuario_id);

COMMIT;
