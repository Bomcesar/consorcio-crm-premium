-- Migration: 20261108000012_funcoes_auxiliares_hierarquia.sql
-- Objetivo: funções auxiliares de hierarquia (SECURITY DEFINER) para uso em
--           policies RLS e validação server-side, evitando recursão RLS.
-- Principio: apenas criar funções novas. Nao alterar tabelas existentes.
--           Nao DROP CASCADE. Nao apagar dados.

BEGIN;

-- ============================================================
-- 1. FUNÇÃO: pode atribuir perfil (can_assign_profile)
-- Verifica se o usuário corrente pode atribuir um determinado perfil a outro usuário.
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_assign_profile(
  p_current_user_id UUID,
  p_new_profile TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_perfil TEXT;
BEGIN
  -- Obter perfil do usuário corrente
  SELECT perfil INTO v_current_perfil FROM public.profiles WHERE id = p_current_user_id;

  IF v_current_perfil IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Administrador pode atribuir qualquer perfil
  IF v_current_perfil = 'Administrador' THEN
    RETURN TRUE;
  END IF;

  -- Nunca pode atribuir Administrador nem Gestor Pleno (exceto Administrador)
  IF p_new_profile IN ('Administrador', 'Gestor Pleno') THEN
    RETURN FALSE;
  END IF;

  -- Gestor Pleno pode atribuir: Gestor, Consultor Pleno, Consultor, Consultor em prévia, Líder em treinamento, Indicador
  IF v_current_perfil = 'Gestor Pleno' THEN
    RETURN p_new_profile IN (
      'Gestor', 'Consultor Pleno', 'Consultor', 'Consultor em prévia', 'Líder em treinamento', 'Indicador'
    );
  END IF;

  -- Gestor pode atribuir: Consultor, Consultor em prévia, Líder em treinamento, Indicador
  IF v_current_perfil = 'Gestor' THEN
    RETURN p_new_profile IN (
      'Consultor', 'Consultor em prévia', 'Líder em treinamento', 'Indicador'
    );
  END IF;

  -- Consultor Pleno pode atribuir: Consultor, Consultor em prévia, Indicador
  IF v_current_perfil = 'Consultor Pleno' THEN
    RETURN p_new_profile IN ('Consultor', 'Consultor em prévia', 'Indicador');
  END IF;

  -- Outros perfis não podem atribuir
  RETURN FALSE;
END;
$$;

-- ============================================================
-- 2. FUNÇÃO: pode promover usuário (can_promote_to)
-- Verifica se o usuário corrente pode promover o usuário alvo para um novo perfil.
-- Impede auto-promoção e autoelevação.
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_promote_to(
  p_current_user_id UUID,
  p_target_user_id UUID,
  p_new_profile TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_target_perfil TEXT;
  v_target_rank INTEGER;
BEGIN
  -- Não permite auto-promoção
  IF p_current_user_id = p_target_user_id THEN
    RETURN FALSE;
  END IF;

  -- Verificar se pode atribuir o perfil
  IF NOT public.can_assign_profile(p_current_user_id, p_new_profile) THEN
    RETURN FALSE;
  END IF;

  -- Obter perfil atual do usuário alvo
  SELECT perfil INTO v_target_perfil FROM public.profiles WHERE id = p_target_user_id;

  IF v_target_perfil IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Calcular ranks para verificar se é promoção (rank deve aumentar)
  SELECT
    CASE v_target_perfil
      WHEN 'Gestor Pleno' THEN 95
      WHEN 'Gestor' THEN 90
      WHEN 'Consultor Pleno' THEN 80
      WHEN 'Consultor' THEN 70
      WHEN 'Consultor em prévia' THEN 60
      WHEN 'Líder em treinamento' THEN 50
      WHEN 'Indicador' THEN 40
      WHEN 'Trainee' THEN 60
      WHEN 'Secretaria' THEN 55
      ELSE 0
    END
  INTO v_target_rank;

  DECLARE
    v_new_rank INTEGER;
  BEGIN
    SELECT
      CASE p_new_profile
        WHEN 'Gestor Pleno' THEN 95
        WHEN 'Gestor' THEN 90
        WHEN 'Consultor Pleno' THEN 80
        WHEN 'Consultor' THEN 70
        WHEN 'Consultor em prévia' THEN 60
        WHEN 'Líder em treinamento' THEN 50
        WHEN 'Indicador' THEN 40
        WHEN 'Trainee' THEN 60
        WHEN 'Secretaria' THEN 55
        ELSE 0
      END
    INTO v_new_rank;

    -- Não pode promover para um perfil igual ou inferior ao atual
    IF v_target_rank >= v_new_rank THEN
      RETURN FALSE;
    END IF;
  END;

  RETURN TRUE;
END;
$$;

-- ============================================================
-- 3. FUNÇÃO: obter membros da equipe (get_team_members)
-- Retorna os IDs dos usuários gerenciados por um gestor (via gestor_id).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_team_members(
  p_manager_id UUID
)
RETURNS TABLE (
  usuario_id UUID,
  perfil TEXT,
  ativo BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT id, perfil, ativo
  FROM public.profiles
  WHERE gestor_id = p_manager_id;
END;
$$;

-- ============================================================
-- 4. FUNÇÃO: é gestor de (is_gestor_of_direct)
-- Verifica se o usuário corrente é gestor direto do usuário alvo.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_gestor_of_direct(
  p_target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND perfil = 'Gestor'
      AND gestor_id IS NOT NULL
      AND p_target_user_id IN (
        SELECT id FROM public.profiles WHERE gestor_id = auth.uid()
      )
  );
END;
$$;

COMMIT;
