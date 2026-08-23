BEGIN;

-- ============================================================
-- MIGRATION 4 — HIERARQUIA DE EQUIPES, EVOLUÇÃO E PRESETS
-- Incremental. Não altera Migrations 1, 2 ou 3.
-- ============================================================

-- ============================================================
-- FUNÇÕES AUXILIARES (SECURITY DEFINER)
-- Evitam recursão RLS nas policies.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TEXT AS $$
DECLARE
  v_perfil TEXT;
BEGIN
  SELECT perfil INTO v_perfil FROM public.profiles WHERE id = auth.uid();
  RETURN v_perfil;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_current_user_profile() = 'Administrador';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_gestor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_current_user_profile() = 'Gestor';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_gestor_of(p_target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND perfil = 'Gestor'
      AND p_target_user_id IN (
        SELECT id FROM public.profiles WHERE gestor_id = auth.uid()
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.record_user_evolution()
RETURNS TRIGGER AS $$
DECLARE
  v_perfil_mudou BOOLEAN := (OLD.perfil IS DISTINCT FROM NEW.perfil);
  v_gestor_mudou BOOLEAN := (OLD.gestor_id IS DISTINCT FROM NEW.gestor_id);
  v_alterado_por UUID := auth.uid();
BEGIN
  IF v_perfil_mudou OR v_gestor_mudou THEN
    INSERT INTO public.user_evolution_history (
      usuario_id,
      perfil_anterior,
      perfil_novo,
      gestor_anterior,
      gestor_novo,
      motivo,
      alterado_por,
      created_at
    )
    VALUES (
      NEW.id,
      OLD.perfil,
      NEW.perfil,
      OLD.gestor_id,
      NEW.gestor_id,
      '',
      v_alterado_por,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 1. PROFILES — VÍNCULO HIERÁRQUICO
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gestor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_gestor_id_idx ON public.profiles (gestor_id);

-- ============================================================
-- 2. EVOLUÇÃO DO USUÁRIO
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_evolution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_anterior TEXT,
  perfil_novo TEXT NOT NULL,
  gestor_anterior UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  gestor_novo UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  motivo TEXT NOT NULL DEFAULT '',
  alterado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_evolution_history_usuario_id_idx ON public.user_evolution_history (usuario_id);
CREATE INDEX IF NOT EXISTS user_evolution_history_created_at_idx ON public.user_evolution_history (created_at);

DROP TRIGGER IF EXISTS trg_record_user_evolution ON public.profiles;
CREATE TRIGGER trg_record_user_evolution
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.record_user_evolution();

-- ============================================================
-- 3. PRESETS DE PERMISSÕES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.permission_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permission_preset_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id UUID NOT NULL REFERENCES public.permission_presets(id) ON DELETE CASCADE,
  permissao_id UUID NOT NULL REFERENCES public.user_permissions(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 0,
  UNIQUE(preset_id, permissao_id)
);

CREATE INDEX IF NOT EXISTS permission_preset_items_preset_id_idx ON public.permission_preset_items (preset_id);
CREATE INDEX IF NOT EXISTS permission_preset_items_permissao_id_idx ON public.permission_preset_items (permissao_id);

-- ============================================================
-- 4. METAS — CONSTRAINTS (compatível com PostgreSQL)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'metas' AND constraint_name = 'metas_tipo_check'
  ) THEN
    ALTER TABLE public.metas ADD CONSTRAINT metas_tipo_check CHECK (tipo IN ('individual', 'equipe'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'metas' AND constraint_name = 'metas_perfil_aplicavel_check'
  ) THEN
    ALTER TABLE public.metas ADD CONSTRAINT metas_perfil_aplicavel_check CHECK (perfil_aplicavel IN ('Consultor', 'Assistente', 'Equipe'));
  END IF;
END $$;

-- ============================================================
-- 5. RLS — NOVAS TABELAS
-- ============================================================

ALTER TABLE public.user_evolution_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_preset_items ENABLE ROW LEVEL SECURITY;

-- Policies para user_evolution_history
CREATE POLICY "Users can view own evolution history"
  ON public.user_evolution_history FOR SELECT
  USING (
    auth.uid() = usuario_id
    OR public.is_admin()
  );

CREATE POLICY "Admins and gestors can insert evolution history"
  ON public.user_evolution_history FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (public.is_admin() OR public.is_gestor())
  );

-- Policies para permission_presets
CREATE POLICY "Authenticated users can view permission presets"
  ON public.permission_presets FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can insert permission presets"
  ON public.permission_presets FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

CREATE POLICY "Only admins can update permission presets"
  ON public.permission_presets FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

CREATE POLICY "Only admins can delete permission presets"
  ON public.permission_presets FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

-- Policies para permission_preset_items
CREATE POLICY "Authenticated users can view permission preset items"
  ON public.permission_preset_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can insert permission preset items"
  ON public.permission_preset_items FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

CREATE POLICY "Only admins can update permission preset items"
  ON public.permission_preset_items FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

CREATE POLICY "Only admins can delete permission preset items"
  ON public.permission_preset_items FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

-- ============================================================
-- 6. AJUSTE DE POLICIES — PROFILES, METAS E USER_PERMISSION_GRANTS
-- Substitui policies antigas pela lógica hierárquica.
-- ============================================================

-- PROFILES
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Gestors can view team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Gestors can update team profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Gestors can view team profiles"
  ON public.profiles FOR SELECT
  USING (
    public.is_gestor()
    AND profiles.gestor_id = auth.uid()
  );

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Gestors can update team profiles"
  ON public.profiles FOR UPDATE
  USING (
    public.is_gestor()
    AND profiles.gestor_id = auth.uid()
  )
  WITH CHECK (
    public.is_gestor()
    AND profiles.gestor_id = auth.uid()
    AND NEW.perfil <> 'Administrador'
    AND NEW.gestor_id = OLD.gestor_id
  );

-- METAS
DROP POLICY IF EXISTS "Authenticated users can view relevant metas" ON public.metas;
DROP POLICY IF EXISTS "Only admins can insert metas" ON public.metas;
DROP POLICY IF EXISTS "Only admins can update metas" ON public.metas;
DROP POLICY IF EXISTS "Only admins can delete metas" ON public.metas;

CREATE POLICY "Admins can view all metas"
  ON public.metas FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Gestors can view team metas"
  ON public.metas FOR SELECT
  USING (
    public.is_gestor()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = metas.usuario_id
        AND profiles.gestor_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own metas"
  ON public.metas FOR SELECT
  USING (
    auth.uid() = usuario_id
    AND perfil_aplicavel IN ('Consultor', 'Assistente')
  );

CREATE POLICY "Only admins can insert metas"
  ON public.metas FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

CREATE POLICY "Only admins can update metas"
  ON public.metas FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND public.is_admin()
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

CREATE POLICY "Only admins can delete metas"
  ON public.metas FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

-- USER_PERMISSION_GRANTS
DROP POLICY IF EXISTS "Users can view their own permission grants" ON public.user_permission_grants;
DROP POLICY IF EXISTS "Only admins can insert permission grants" ON public.user_permission_grants;
DROP POLICY IF EXISTS "Only admins can update permission grants" ON public.user_permission_grants;
DROP POLICY IF EXISTS "Only admins can delete permission grants" ON public.user_permission_grants;

CREATE POLICY "Users can view own permission grants"
  ON public.user_permission_grants FOR SELECT
  USING (
    auth.uid() = usuario_id
    OR public.is_admin()
    OR (
      public.is_gestor()
      AND public.is_gestor_of(usuario_id)
    )
  );

CREATE POLICY "Only admins can insert permission grants"
  ON public.user_permission_grants FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

CREATE POLICY "Only admins can update permission grants"
  ON public.user_permission_grants FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND public.is_admin()
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

CREATE POLICY "Only admins can delete permission grants"
  ON public.user_permission_grants FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

-- ============================================================
-- 7. PRESETS INICIAIS
-- ============================================================

INSERT INTO public.permission_presets (nome, descricao, categoria)
VALUES
  ('Administrador', 'Acesso total ao sistema', 'Administração'),
  ('Gestor', 'Gerenciamento de equipe e indicadores', 'Gerência'),
  ('Líder em treinamento', 'Acesso parcial para treinamento', 'Gerência'),
  ('Consultor', 'Operações de vendas e atendimento', 'Comercial'),
  ('Indicador', 'Acesso limitado a módulos específicos', 'Comercial'),
  ('Assistente', 'Apoio operacional', 'Administrativo')
ON CONFLICT (nome) DO NOTHING;

COMMIT;
