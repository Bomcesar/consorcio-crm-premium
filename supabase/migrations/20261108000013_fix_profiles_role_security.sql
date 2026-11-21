-- Migration: 20261108000013_fix_profiles_role_security.sql
-- Objetivo: Eliminar possibilidade de autoelevação de cargo em public.profiles.
-- Principio: proteger a coluna perfil contra alteracao por nao-administradores.
--           Nao alterar migrations historicas. Nao DROP CASCADE. Nao apagar dados.
--           Nao modificar o modulo Credito Investimento. Preservar marked_id.
--           Nao executar SQL remoto.
-- Compatibilidade com a migration 20261108000011_expand_cargos_e_permissoes.sql.

BEGIN;

-- ============================================================
-- 0. GARANTIR COLUNA gestor_id (compatível com migration 00003 se aplicada)
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gestor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================
-- 1. FUNÇÃO AUXILIAR SEGURA: is_admin_safe()
-- Evita recursão RLS ao consultar public.profiles.
-- SECURITY DEFINER, search_path vazio, referências qualificadas.
-- Retorna sempre TRUE ou FALSE, nunca NULL.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_perfil TEXT;
BEGIN
  -- Usuário não autenticado nunca é Administrador
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT perfil INTO v_perfil
  FROM public.profiles
  WHERE id = auth.uid();

  -- Se não encontrou perfil ou não é Administrador, retorna FALSE
  IF v_perfil IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN v_perfil = 'Administrador';
END;
$$;

-- ============================================================
-- 2. CORRIGIR POLICIES DE UPDATE EM PROFILES
-- Usuario comum só edita nome e avatar_url (campos pessoais).
-- Nao usamos OLD nas policies (não disponível em RLS).
-- A validação de colunas alteradas ocorre no trigger profiles_protect_role_change().
-- Apenas Administrador altera perfil, gestor_id, ativo, ultimo_login, email.
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own personal fields" ON public.profiles;

CREATE POLICY "Users can update own personal fields"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Only admins can update profile administrative fields"
  ON public.profiles
  FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

-- Corrigir policy SELECT para evitar recursão RLS
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_admin_safe()
  );

-- ============================================================
-- 3. CORRIGIR handle_new_user()
-- Cadastro publico recebe sempre Indicador, ignorando metadata de cargo.
-- ON CONFLICT DO NOTHING: nunca rebaixa ou sobrescreve perfil existente.
-- SECURITY DEFINER com search_path vazio.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_nome TEXT;
  v_avatar_url TEXT;
BEGIN
  v_nome := trim(COALESCE(NULLIF(NEW.raw_user_meta_data->>'nome', ''), split_part(NEW.email, '@', 1)));
  v_avatar_url := NULLIF(NEW.raw_user_meta_data->>'avatar_url', '');

  -- Perfil sempre Indicador para cadastro publico. O cliente nao escolhe.
  -- ON CONFLICT DO NOTHING: nunca rebaixa ou sobrescreve perfil existente.
  INSERT INTO public.profiles (id, nome, email, perfil, ativo, ultimo_login, avatar_url)
  VALUES (NEW.id, v_nome, NEW.email, 'Indicador', TRUE, NULL, v_avatar_url)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 4. TRIGGER DE PROTECAO CONTRA AUTO ELEVACAO DE CARGO
-- Impede UPDATE que altere id, perfil, gestor_id, ativo, ultimo_login,
-- email, created_at ou updated_at a menos que o usuario corrente seja
-- Administrador (verificado via is_admin_safe()).
-- auth.uid() IS NULL nao autoriza alteracoes (apenas operações internas
-- via service_role, que bypassa RLS nativamente, são afetadas).
-- ============================================================

CREATE OR REPLACE FUNCTION public.profiles_protect_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Se campos administrativos foram alterados, exige Administrador verificado
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.perfil IS DISTINCT FROM OLD.perfil
     OR NEW.gestor_id IS DISTINCT FROM OLD.gestor_id
     OR NEW.ativo IS DISTINCT FROM OLD.ativo
     OR NEW.ultimo_login IS DISTINCT FROM OLD.ultimo_login
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.updated_at IS DISTINCT FROM OLD.updated_at THEN
    -- auth.uid() IS NULL não autoriza: apenas operações internas via
    -- service_role, que bypassam RLS nativamente no Supabase, passam aqui.
    -- Chamadas públicas autenticadas nunca têm auth.uid() NULL.
    IF NOT public.is_admin_safe() THEN
      RAISE EXCEPTION 'Somente Administrador pode alterar campos administrativos do usuario.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_protect_role_change ON public.profiles;

CREATE TRIGGER trg_profiles_protect_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_protect_role_change();

-- ============================================================
-- 5. INDICES DE SUPORTE
-- ============================================================

CREATE INDEX IF NOT EXISTS profiles_gestor_id_idx ON public.profiles (gestor_id);

COMMIT;
