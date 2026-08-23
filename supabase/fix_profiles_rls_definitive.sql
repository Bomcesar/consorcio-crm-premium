BEGIN;

-- Remove todas as policies existentes na tabela profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON public.profiles;

-- Policy simples para usuário ver apenas seu próprio perfil
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy simples para usuário atualizar apenas seu próprio perfil
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy para Administrador ver todos os perfis sem recursão
CREATE POLICY "profiles_admin_select_all"
  ON public.profiles FOR SELECT
  USING (
    (SELECT perfil FROM public.profiles WHERE id = auth.uid()) = 'Administrador'
  );

-- Policy para Administrador atualizar todos os perfis sem recursão
CREATE POLICY "profiles_admin_update_all"
  ON public.profiles FOR UPDATE
  USING (
    (SELECT perfil FROM public.profiles WHERE id = auth.uid()) = 'Administrador'
  )
  WITH CHECK (
    (SELECT perfil FROM public.profiles WHERE id = auth.uid()) = 'Administrador'
  );

COMMIT;
