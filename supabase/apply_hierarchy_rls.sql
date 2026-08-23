BEGIN;

-- CLIENTES
DROP POLICY IF EXISTS "Admins can view all clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can update clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can delete clientes" ON public.clientes;

CREATE POLICY "Admins can view all clientes"
  ON public.clientes FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.perfil = 'Administrador'
      )
      OR
      clientes.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert clientes"
  ON public.clientes FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.perfil = 'Administrador'
      )
      OR
      clientes.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update clientes"
  ON public.clientes FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.perfil = 'Administrador'
      )
      OR
      clientes.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.perfil = 'Administrador'
      )
      OR
      clientes.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete clientes"
  ON public.clientes FOR DELETE
  USING (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.perfil = 'Administrador'
      )
      OR
      clientes.usuario_id = auth.uid()
    )
  );

-- LEADS
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can update leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;

CREATE POLICY "Admins can view all leads"
  ON public.leads FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.perfil = 'Administrador'
      )
      OR
      leads.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert leads"
  ON public.leads FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.perfil = 'Administrador'
      )
      OR
      leads.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update leads"
  ON public.leads FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.perfil = 'Administrador'
      )
      OR
      leads.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.perfil = 'Administrador'
      )
      OR
      leads.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete leads"
  ON public.leads FOR DELETE
  USING (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.perfil = 'Administrador'
      )
      OR
      leads.usuario_id = auth.uid()
    )
  );

-- NEGOCIACOES
DROP POLICY IF EXISTS "Admins can view all negociacoes" ON public.negociacoes;
DROP POLICY IF EXISTS "Admins can insert negociacoes" ON public.negociacoes;
DROP POLICY IF EXISTS "Admins can update negociacoes" ON public.negociacoes;
DROP POLICY IF EXISTS "Admins can delete negociacoes" ON public.negociacoes;

CREATE POLICY "Admins can view all negociacoes"
  ON public.negociacoes FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.perfil = 'Administrador'
      )
      OR
      negociacoes.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert negociacoes"
  ON public.negociacoes FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.perfil = 'Administrador'
      )
      OR
      negociacoes.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update negociacoes"
  ON public.negociacoes FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.perfil = 'Administrador'
      )
      OR
      negociacoes.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.perfil = 'Administrador'
      )
      OR
      negociacoes.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete negociacoes"
  ON public.negociacoes FOR DELETE
  USING (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.perfil = 'Administrador'
      )
      OR
      negociacoes.usuario_id = auth.uid()
    )
  );

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.profiles AS p
        WHERE p.id = auth.uid() AND p.perfil = 'Administrador'
      )
      OR
      profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.profiles AS p
        WHERE p.id = auth.uid() AND p.perfil = 'Administrador'
      )
      OR
      profiles.id = auth.uid()
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.profiles AS p
        WHERE p.id = auth.uid() AND p.perfil = 'Administrador'
      )
      OR
      profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.perfil = 'Administrador'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.perfil = 'Administrador'
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.perfil = 'Administrador'
    )
  );

COMMIT;
