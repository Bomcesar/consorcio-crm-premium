-- Migration: 20261121000002_fix_rls_recursao_policies.sql
-- Corrige recursão RLS (42P17) causada por policies duplicadas que consultam
-- profiles diretamente via EXISTS, criando referência circular.
-- Mantém apenas as policies que usam funções SECURITY DEFINER (is_admin_safe,
-- is_gestor_da_equipe) que bypassam RLS e não geram recursão.

BEGIN;

-- === CLIENTES: remover policies antigas com subquery direta em profiles ===
DROP POLICY IF EXISTS "Gestors can delete team clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can delete any cliente" ON public.clientes;
DROP POLICY IF EXISTS "Gestors can view team clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can view all clientes" ON public.clientes;
DROP POLICY IF EXISTS "Gestors can update team clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can update any cliente" ON public.clientes;

-- === LEADS: remover policies antigas com subquery direta em profiles ===
DROP POLICY IF EXISTS "Admins can delete any lead" ON public.leads;
DROP POLICY IF EXISTS "Gestors can delete team leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Gestors can view team leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can update any lead" ON public.leads;
DROP POLICY IF EXISTS "Gestors can update team leads" ON public.leads;

-- === PROFILES: recriar "gestor ve perfis da equipe" sem subquery em profiles ===
-- A policy original fazia is_gestor_da_equipe(id) AND EXISTS(SELECT 1 FROM profiles p ...)
-- que causava recursão. is_gestor_da_equipe já é SECURITY DEFINER e cobre a lógica.
DROP POLICY IF EXISTS "Profiles: gestor ve perfis da equipe" ON public.profiles;
CREATE POLICY "Profiles: gestor ve perfis da equipe" ON public.profiles
  FOR SELECT USING (is_gestor_da_equipe(id));

-- === PROFILES: remover policy antiga "Profiles: usuario pode ver o proprio perfil"
-- que mistura uid() = id com is_admin_safe() (ambos OK, mas redundante com as novas).
-- Mantida pois é necessária para o usuário ver o próprio perfil.

COMMIT;