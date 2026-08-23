-- Corrige recursão infinita em profiles removendo policies que consultam profiles

-- Remove TODAS as policies de profiles
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins and gestors can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins and gestors can update all profiles" ON public.profiles;

-- Recria policies SIMPLES sem recursão
-- Usuário autenticado pode ver e editar apenas SEU PRÓPRIO perfil
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = id);

-- Permite INSERT de perfil durante cadastro (apenas para o próprio usuário)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = id);
