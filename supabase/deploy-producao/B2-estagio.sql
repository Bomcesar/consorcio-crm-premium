-- ============================================================
-- Estagio B2 - Politicas RLS, pessoas e jornadas
-- Aplicar SOMENTE apos 00-pre-voo.sql e 01-pacote-aditivo.sql, e apos B1/B2 (para B2/B3).
-- Ordem interna preservada; cada migration em BEGIN/COMMIT proprio.
-- ============================================================

-- 20261110000000  (20261110000000_correcao_seguranca_rls.sql)
-- ============================================================
-- Migration: 20261110000000_correcao_seguranca_rls.sql
-- Objetivo: CorreÃ§Ã£o integrada de seguranÃ§a RLS, perfis, cargos e polÃ­ticas
--           para o Sistema Operacional do Consultor.
-- PrincÃ­pios:
--   - NÃ£o alterar migrations histÃ³ricas.
--   - NÃ£o utilizar DROP CASCADE.
--   - NÃ£o excluir tabelas, colunas ou registros existentes.
--   - Ser idempotente: verificar estado antes de alterar.
--   - Preservar todos os dados existentes.
--   - NÃ£o implementar Secretaria nem tabela secretaria_vinculos_operacionais.
--
-- Aplicar manualmente no Supabase Studio apÃ³s revisÃ£o.

BEGIN;

-- ============================================================
-- 0. GARANTIR COLUNAS AUSENTES EM public.profiles
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'gestor_id'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN gestor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'ativo'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
END $$;

-- ============================================================
-- 1. CORRIGIR CHECK CONSTRAINT DE profiles.perfil (10 cargos oficiais)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_perfil_check'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_perfil_check;
  END IF;

  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_perfil_check
    CHECK (perfil IN (
      'Administrador',
      'Gestor Pleno',
      'Gestor',
      'Consultor Pleno',
      'Consultor',
      'Consultor em prÃ©via',
      'LÃ­der em treinamento',
      'Indicador',
      'Trainee',
      'Secretaria'
    )) NOT VALID;

  ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_perfil_check;
END $$;

-- Ãndice de suporte para gestor_id
CREATE INDEX IF NOT EXISTS profiles_gestor_id_idx ON public.profiles (gestor_id);

-- ============================================================
-- 2. FUNÃ‡ÃƒO: is_admin_safe()
-- Verifica se o usuÃ¡rio autenticado Ã© Administrador ATIVO.
-- search_path vazio, referÃªncias qualificadas, SECURITY DEFINER.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_perfil TEXT;
  v_ativo BOOLEAN;
BEGIN
  -- UsuÃ¡rio nÃ£o autenticado nunca Ã© Administrador
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT perfil, ativo INTO v_perfil, v_ativo
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_perfil IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Exigir ativo = TRUE (cobre NULL e FALSE)
  IF NOT v_ativo THEN
    RETURN FALSE;
  END IF;

  RETURN v_perfil = 'Administrador';
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin_safe() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_safe() TO authenticated;

-- ============================================================
-- 3. FUNÃ‡ÃƒO: is_gestor_da_equipe(p_proprietario_id UUID)
-- Verifica se o usuÃ¡rio autenticado (Gestor ou Gestor Pleno, ativo)
-- Ã© o gestor direto do proprietÃ¡rio informado, e que o proprietÃ¡rio estÃ¡ ativo.
-- Evita recursÃ£o RLS: nÃ£o aceita UUID fornecido pelo cliente para o chamador;
-- usa auth.uid() internamente. Usa search_path vazio.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_gestor_da_equipe(p_proprietario_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_perfil TEXT;
  v_caller_ativo BOOLEAN;
  v_owner_perfil TEXT;
  v_owner_ativo BOOLEAN;
  v_owner_gestor_id UUID;
BEGIN
  -- Obter dados do chamador (auth.uid() da sessÃ£o, nÃ£o parÃ¢metro do cliente)
  SELECT perfil, ativo INTO v_caller_perfil, v_caller_ativo
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_perfil IS NULL OR NOT v_caller_ativo THEN
    RETURN FALSE;
  END IF;

  -- Apenas Gestor e Gestor Pleno podem acessar equipe
  IF v_caller_perfil NOT IN ('Gestor', 'Gestor Pleno') THEN
    RETURN FALSE;
  END IF;

  -- Obter dados do proprietÃ¡rio do registro
  SELECT perfil, ativo, gestor_id INTO v_owner_perfil, v_owner_ativo, v_owner_gestor_id
  FROM public.profiles
  WHERE id = p_proprietario_id;

  IF v_owner_perfil IS NULL OR NOT v_owner_ativo THEN
    RETURN FALSE;
  END IF;

  -- Validar relaÃ§Ã£o hierÃ¡rquica real: proprietÃ¡rio Ã© liderado pelo chamador
  RETURN v_owner_gestor_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.is_gestor_da_equipe(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_gestor_da_equipe(UUID) TO authenticated;

-- ============================================================
-- 4. TABELA: public.audit_log
-- Registro de operaÃ§Ãµes administrativas. Sem senhas, tokens ou segredos.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela TEXT NOT NULL,
  registro_id UUID NOT NULL,
  acao TEXT NOT NULL,
  usuario_responsavel UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_afetado UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  valores_antes JSONB,
  valores_depois JSONB,
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Somente Administrador pode consultar audit_log
DROP POLICY IF EXISTS "Audit log: admin pode consultar" ON public.audit_log;
CREATE POLICY "Audit log: admin pode consultar"
  ON public.audit_log FOR SELECT
  USING (public.is_admin_safe());

-- Somente service_role (backend) pode inserir
DROP POLICY IF EXISTS "Audit log: backend pode inserir" ON public.audit_log;
CREATE POLICY "Audit log: backend pode inserir"
  ON public.audit_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Nenhum pode atualizar ou excluir (imutÃ¡vel)
DROP POLICY IF EXISTS "Audit log: sem atualizacao" ON public.audit_log;
CREATE POLICY "Audit log: sem atualizacao"
  ON public.audit_log FOR UPDATE
  USING (FALSE);

DROP POLICY IF EXISTS "Audit log: sem exclusao" ON public.audit_log;
CREATE POLICY "Audit log: sem exclusao"
  ON public.audit_log FOR DELETE
  USING (FALSE);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON public.audit_log (created_at);
CREATE INDEX IF NOT EXISTS audit_log_usuario_responsavel_idx ON public.audit_log (usuario_responsavel);
CREATE INDEX IF NOT EXISTS audit_log_tabela_registro_idx ON public.audit_log (tabela, registro_id);

-- ============================================================
-- 5. CORRIGIR handle_new_user()
-- Cadastro pÃºblico recebe sempre 'Indicador'. NÃ£o confiar em raw_user_meta_data.
-- ON CONFLICT DO NOTHING: nunca sobrescrever perfil existente.
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

  -- Perfil sempre Indicador para cadastro pÃºblico
  INSERT INTO public.profiles (id, nome, email, perfil, ativo, ultimo_login, avatar_url)
  VALUES (NEW.id, v_nome, NEW.email, 'Indicador', TRUE, NULL, v_avatar_url)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 6. TRIGGER: profiles_protect_role_change()
-- Impede alteraÃ§Ã£o de campos administrativos por nÃ£o-administradores.
-- service_role Ã© permitido (operaÃ§Ãµes backend prÃ©-validadas pelo Server Action).
-- UsuÃ¡rios autenticados precisam de is_admin_safe().
-- ============================================================

CREATE OR REPLACE FUNCTION public.profiles_protect_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.perfil IS DISTINCT FROM OLD.perfil
     OR NEW.gestor_id IS DISTINCT FROM OLD.gestor_id
     OR NEW.ativo IS DISTINCT FROM OLD.ativo
     OR NEW.ultimo_login IS DISTINCT FROM OLD.ultimo_login
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.updated_at IS DISTINCT FROM OLD.updated_at THEN

    -- OperaÃ§Ãµes backend via service_role sÃ£o prÃ©-validadas pelo Server Action
    IF auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;

    -- UsuÃ¡rios autenticados precisam ser Administrador ativo
    IF NOT public.is_admin_safe() THEN
      RAISE EXCEPTION 'Somente Administrador ativo pode alterar campos administrativos do usuario.'
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
-- 7. TRIGGER: prohibit_usuario_id_change()
-- Impede alteraÃ§Ã£o de usuario_id em registros comerciais apÃ³s a criaÃ§Ã£o.
-- service_role permitido (transferÃªncia administrativa prÃ©-validada).
-- ============================================================

CREATE OR REPLACE FUNCTION public.prohibit_usuario_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.usuario_id IS DISTINCT FROM OLD.usuario_id THEN
    -- service_role: transferÃªncia administrativa prÃ©-validada pelo Server Action
    IF auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;

    -- UsuÃ¡rios autenticados nunca podem alterar usuario_id
    RAISE EXCEPTION 'usuario_id nao pode ser alterado apos a criacao.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 8. TRIGGER: validate_admin_insert()
-- Valida INSERT em tabelas comerciais.
-- INSERT prÃ³prio (usuario_id = auth.uid()): permitido se policy permitir.
-- INSERT para terceiro: somente service_role (prÃ©-validado) ou Administrador.
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_admin_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_dest_perfil TEXT;
  v_dest_ativo BOOLEAN;
BEGIN
  -- InserÃ§Ã£o prÃ³pria: usuario_id bate com auth.uid() da sessÃ£o autenticada
  IF NEW.usuario_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  -- service_role: operaÃ§Ã£o backend prÃ©-validada pelo Server Action.
  -- Validar apenas integridade de destino.
  IF auth.role() = 'service_role' THEN
    SELECT perfil, ativo INTO v_dest_perfil, v_dest_ativo
    FROM public.profiles
    WHERE id = NEW.usuario_id;

    IF v_dest_perfil IS NULL OR NOT v_dest_ativo THEN
      RAISE EXCEPTION 'Usuario de destino nao existe ou esta inativo.'
        USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  -- UsuÃ¡rio autenticado (Administrador) inserindo para terceiro: permitido
  IF public.is_admin_safe() THEN
    SELECT perfil, ativo INTO v_dest_perfil, v_dest_ativo
    FROM public.profiles
    WHERE id = NEW.usuario_id;

    IF v_dest_perfil IS NULL OR NOT v_dest_ativo THEN
      RAISE EXCEPTION 'Usuario de destino nao existe ou esta inativo.'
        USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  -- UsuÃ¡rio autenticado inserindo para terceiro: sempre bloqueado
  RAISE EXCEPTION 'Somente operacao administrativa pode criar registros para terceiros.'
    USING ERRCODE = '42501';
END;
$$;

-- ============================================================
-- 9. APLICAR TRIGGERS NAS TABELAS COMERCIAIS
-- Tabelas com coluna usuario_id NOT NULL
-- ============================================================

-- Clientes
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.clientes;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.clientes;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- Leads
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.leads;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.leads;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- Indicadores
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.indicadores;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.indicadores
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.indicadores;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.indicadores
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- Agenda Eventos
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.agenda_eventos;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.agenda_eventos
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.agenda_eventos;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.agenda_eventos
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- Negociacoes
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.negociacoes;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.negociacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.negociacoes;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.negociacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- Cobrancas
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.cobrancas;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.cobrancas
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.cobrancas;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.cobrancas
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- Pos Venda
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.pos_venda;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.pos_venda
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.pos_venda;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.pos_venda
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- Recrutamento
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.recrutamento;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.recrutamento
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.recrutamento;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.recrutamento
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- Parceiros
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.parceiros;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.parceiros
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.parceiros;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.parceiros
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- Comissoes Indicadores
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.comissoes_indicadores;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.comissoes_indicadores
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.comissoes_indicadores;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.comissoes_indicadores
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- Metas (usuario_id nullable)
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.metas;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.metas
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.metas;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.metas
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- User Permission Grants
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.user_permission_grants;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.user_permission_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.user_permission_grants;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.user_permission_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- User Evolution History
-- Tabela user_evolution_history pode nÃ£o existir em instalaÃ§Ãµes que nÃ£o aplicaram
-- a migration que a cria. Protegemos toda a operaÃ§Ã£o com verificaÃ§Ã£o de existÃªncia.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_evolution_history') THEN
    DROP TRIGGER IF EXISTS trg_prohibitUsuario_id_change ON public.user_evolution_history;
    CREATE TRIGGER trg_prohibitUsuario_id_change
      BEFORE UPDATE ON public.user_evolution_history
      FOR EACH ROW
      EXECUTE FUNCTION public.prohibit_usuario_id_change();

    DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.user_evolution_history;
    CREATE TRIGGER trg_validate_admin_insert
      BEFORE INSERT ON public.user_evolution_history
      FOR EACH ROW
      EXECUTE FUNCTION public.validate_admin_insert();
  END IF;
END $$;

-- ============================================================
-- 10. CORRIGIR POLICIES RLS â€” TABELAS COMERCIAIS
-- Remover policies antigas permissivas e criar novas restritivas.
-- ============================================================

-- Helper macro para drop de policies antigas (executado individualmente por tabela)

-- ===== CLIENTES =====
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can view their clients" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can insert their clients" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can update their clients" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can delete their clients" ON public.clientes;

CREATE POLICY "Clientes: usuario pode ver seus proprios registros"
  ON public.clientes FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Clientes: gestor ve registros da equipe"
  ON public.clientes FOR SELECT
  USING (public.is_gestor_da_equipe(clientes.usuario_id));

CREATE POLICY "Clientes: admin ve todos"
  ON public.clientes FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Clientes: usuario pode inserir para si"
  ON public.clientes FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Clientes: admin pode inserir para terceiro"
  ON public.clientes FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = clientes.usuario_id AND p.ativo = TRUE
    )
  );

CREATE POLICY "Clientes: usuario pode atualizar seus proprios registros"
  ON public.clientes FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Clientes: gestor atualiza registros da equipe"
  ON public.clientes FOR UPDATE
  USING (public.is_gestor_da_equipe(clientes.usuario_id))
  WITH CHECK (public.is_gestor_da_equipe(clientes.usuario_id));

CREATE POLICY "Clientes: admin atualiza qualquer registro"
  ON public.clientes FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Clientes: usuario pode excluir seus proprios registros"
  ON public.clientes FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Clientes: gestor exclui registros da equipe"
  ON public.clientes FOR DELETE
  USING (public.is_gestor_da_equipe(clientes.usuario_id));

CREATE POLICY "Clientes: admin exclui qualquer registro"
  ON public.clientes FOR DELETE
  USING (public.is_admin_safe());

-- ===== LEADS =====
DROP POLICY IF EXISTS "Allow authenticated users to view leads" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated users to insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can view their leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert their leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update their leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can delete their leads" ON public.leads;

CREATE POLICY "Leads: usuario pode ver seus proprios registros"
  ON public.leads FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Leads: gestor ve registros da equipe"
  ON public.leads FOR SELECT
  USING (public.is_gestor_da_equipe(leads.usuario_id));

CREATE POLICY "Leads: admin ve todos"
  ON public.leads FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Leads: usuario pode inserir para si"
  ON public.leads FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Leads: admin pode inserir para terceiro"
  ON public.leads FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = leads.usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "Leads: usuario pode atualizar seus proprios registros"
  ON public.leads FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Leads: gestor atualiza registros da equipe"
  ON public.leads FOR UPDATE
  USING (public.is_gestor_da_equipe(leads.usuario_id))
  WITH CHECK (public.is_gestor_da_equipe(leads.usuario_id));

CREATE POLICY "Leads: admin atualiza qualquer registro"
  ON public.leads FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Leads: usuario pode excluir seus proprios registros"
  ON public.leads FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Leads: gestor exclui registros da equipe"
  ON public.leads FOR DELETE
  USING (public.is_gestor_da_equipe(leads.usuario_id));

CREATE POLICY "Leads: admin exclui qualquer registro"
  ON public.leads FOR DELETE
  USING (public.is_admin_safe());

-- ===== INDICADORES =====
DROP POLICY IF EXISTS "Authenticated users can view their indicators" ON public.indicadores;
DROP POLICY IF EXISTS "Authenticated users can insert their indicators" ON public.indicadores;
DROP POLICY IF EXISTS "Authenticated users can update their indicators" ON public.indicadores;
DROP POLICY IF EXISTS "Authenticated users can delete their indicators" ON public.indicadores;

CREATE POLICY "Indicadores: usuario pode ver seus proprios registros"
  ON public.indicadores FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Indicadores: gestor ve registros da equipe"
  ON public.indicadores FOR SELECT
  USING (public.is_gestor_da_equipe(indicadores.usuario_id));

CREATE POLICY "Indicadores: admin ve todos"
  ON public.indicadores FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Indicadores: usuario pode inserir para si"
  ON public.indicadores FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Indicadores: admin pode inserir para terceiro"
  ON public.indicadores FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = indicadores.usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "Indicadores: usuario pode atualizar seus proprios registros"
  ON public.indicadores FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Indicadores: gestor atualiza registros da equipe"
  ON public.indicadores FOR UPDATE
  USING (public.is_gestor_da_equipe(indicadores.usuario_id))
  WITH CHECK (public.is_gestor_da_equipe(indicadores.usuario_id));

CREATE POLICY "Indicadores: admin atualiza qualquer registro"
  ON public.indicadores FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Indicadores: usuario pode excluir seus proprios registros"
  ON public.indicadores FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Indicadores: gestor exclui registros da equipe"
  ON public.indicadores FOR DELETE
  USING (public.is_gestor_da_equipe(indicadores.usuario_id));

CREATE POLICY "Indicadores: admin exclui qualquer registro"
  ON public.indicadores FOR DELETE
  USING (public.is_admin_safe());

-- ===== AGENDA_EVENTOS =====
DROP POLICY IF EXISTS "Authenticated users can view their agenda events" ON public.agenda_eventos;
DROP POLICY IF EXISTS "Authenticated users can insert their agenda events" ON public.agenda_eventos;
DROP POLICY IF EXISTS "Authenticated users can update their agenda events" ON public.agenda_eventos;
DROP POLICY IF EXISTS "Authenticated users can delete their agenda events" ON public.agenda_eventos;

CREATE POLICY "Agenda: usuario pode ver seus proprios registros"
  ON public.agenda_eventos FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Agenda: gestor ve registros da equipe"
  ON public.agenda_eventos FOR SELECT
  USING (public.is_gestor_da_equipe(agenda_eventos.usuario_id));

CREATE POLICY "Agenda: admin ve todos"
  ON public.agenda_eventos FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Agenda: usuario pode inserir para si"
  ON public.agenda_eventos FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Agenda: admin pode inserir para terceiro"
  ON public.agenda_eventos FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = agenda_eventos.usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "Agenda: usuario pode atualizar seus proprios registros"
  ON public.agenda_eventos FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Agenda: gestor atualiza registros da equipe"
  ON public.agenda_eventos FOR UPDATE
  USING (public.is_gestor_da_equipe(agenda_eventos.usuario_id))
  WITH CHECK (public.is_gestor_da_equipe(agenda_eventos.usuario_id));

CREATE POLICY "Agenda: admin atualiza qualquer registro"
  ON public.agenda_eventos FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Agenda: usuario pode excluir seus proprios registros"
  ON public.agenda_eventos FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Agenda: gestor exclui registros da equipe"
  ON public.agenda_eventos FOR DELETE
  USING (public.is_gestor_da_equipe(agenda_eventos.usuario_id));

CREATE POLICY "Agenda: admin exclui qualquer registro"
  ON public.agenda_eventos FOR DELETE
  USING (public.is_admin_safe());

-- ===== NEGOCIACOES =====
DROP POLICY IF EXISTS "Authenticated users can view their negotiations" ON public.negociacoes;
DROP POLICY IF EXISTS "Authenticated users can insert their negotiations" ON public.negociacoes;
DROP POLICY IF EXISTS "Authenticated users can update their negotiations" ON public.negociacoes;
DROP POLICY IF EXISTS "Authenticated users can delete their negotiations" ON public.negociacoes;

CREATE POLICY "Negociacoes: usuario pode ver seus proprios registros"
  ON public.negociacoes FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Negociacoes: gestor ve registros da equipe"
  ON public.negociacoes FOR SELECT
  USING (public.is_gestor_da_equipe(negociacoes.usuario_id));

CREATE POLICY "Negociacoes: admin ve todos"
  ON public.negociacoes FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Negociacoes: usuario pode inserir para si"
  ON public.negociacoes FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Negociacoes: admin pode inserir para terceiro"
  ON public.negociacoes FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = negociacoes.usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "Negociacoes: usuario pode atualizar seus proprios registros"
  ON public.negociacoes FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Negociacoes: gestor atualiza registros da equipe"
  ON public.negociacoes FOR UPDATE
  USING (public.is_gestor_da_equipe(negociacoes.usuario_id))
  WITH CHECK (public.is_gestor_da_equipe(negociacoes.usuario_id));

CREATE POLICY "Negociacoes: admin atualiza qualquer registro"
  ON public.negociacoes FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Negociacoes: usuario pode excluir seus proprios registros"
  ON public.negociacoes FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Negociacoes: gestor exclui registros da equipe"
  ON public.negociacoes FOR DELETE
  USING (public.is_gestor_da_equipe(negociacoes.usuario_id));

CREATE POLICY "Negociacoes: admin exclui qualquer registro"
  ON public.negociacoes FOR DELETE
  USING (public.is_admin_safe());

-- ===== COBRANCAS =====
DROP POLICY IF EXISTS "Authenticated users can view their cobrancas" ON public.cobrancas;
DROP POLICY IF EXISTS "Authenticated users can insert their cobrancas" ON public.cobrancas;
DROP POLICY IF EXISTS "Authenticated users can update their cobrancas" ON public.cobrancas;
DROP POLICY IF EXISTS "Authenticated users can delete their cobrancas" ON public.cobrancas;

CREATE POLICY "Cobrancas: usuario pode ver seus proprios registros"
  ON public.cobrancas FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Cobrancas: gestor ve registros da equipe"
  ON public.cobrancas FOR SELECT
  USING (public.is_gestor_da_equipe(cobrancas.usuario_id));

CREATE POLICY "Cobrancas: admin ve todos"
  ON public.cobrancas FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Cobrancas: usuario pode inserir para si"
  ON public.cobrancas FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Cobrancas: admin pode inserir para terceiro"
  ON public.cobrancas FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = cobrancas.usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "Cobrancas: usuario pode atualizar seus proprios registros"
  ON public.cobrancas FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Cobrancas: gestor atualiza registros da equipe"
  ON public.cobrancas FOR UPDATE
  USING (public.is_gestor_da_equipe(cobrancas.usuario_id))
  WITH CHECK (public.is_gestor_da_equipe(cobrancas.usuario_id));

CREATE POLICY "Cobrancas: admin atualiza qualquer registro"
  ON public.cobrancas FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Cobrancas: usuario pode excluir seus proprios registros"
  ON public.cobrancas FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Cobrancas: gestor exclui registros da equipe"
  ON public.cobrancas FOR DELETE
  USING (public.is_gestor_da_equipe(cobrancas.usuario_id));

CREATE POLICY "Cobrancas: admin exclui qualquer registro"
  ON public.cobrancas FOR DELETE
  USING (public.is_admin_safe());

-- ===== POS_VENDA =====
DROP POLICY IF EXISTS "Authenticated users can view their pos-venda" ON public.pos_venda;
DROP POLICY IF EXISTS "Authenticated users can insert their pos-venda" ON public.pos_venda;
DROP POLICY IF EXISTS "Authenticated users can update their pos-venda" ON public.pos_venda;
DROP POLICY IF EXISTS "Authenticated users can delete their pos-venda" ON public.pos_venda;

CREATE POLICY "PosVenda: usuario pode ver seus proprios registros"
  ON public.pos_venda FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "PosVenda: gestor ve registros da equipe"
  ON public.pos_venda FOR SELECT
  USING (public.is_gestor_da_equipe(pos_venda.usuario_id));

CREATE POLICY "PosVenda: admin ve todos"
  ON public.pos_venda FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "PosVenda: usuario pode inserir para si"
  ON public.pos_venda FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "PosVenda: admin pode inserir para terceiro"
  ON public.pos_venda FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = pos_venda.usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "PosVenda: usuario pode atualizar seus proprios registros"
  ON public.pos_venda FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "PosVenda: gestor atualiza registros da equipe"
  ON public.pos_venda FOR UPDATE
  USING (public.is_gestor_da_equipe(pos_venda.usuario_id))
  WITH CHECK (public.is_gestor_da_equipe(pos_venda.usuario_id));

CREATE POLICY "PosVenda: admin atualiza qualquer registro"
  ON public.pos_venda FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "PosVenda: usuario pode excluir seus proprios registros"
  ON public.pos_venda FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE POLICY "PosVenda: gestor exclui registros da equipe"
  ON public.pos_venda FOR DELETE
  USING (public.is_gestor_da_equipe(pos_venda.usuario_id));

CREATE POLICY "PosVenda: admin exclui qualquer registro"
  ON public.pos_venda FOR DELETE
  USING (public.is_admin_safe());

-- ===== RECRUTAMENTO =====
DROP POLICY IF EXISTS "Authenticated users can view own recrutamento" ON public.recrutamento;
DROP POLICY IF EXISTS "Authenticated users can insert own recrutamento" ON public.recrutamento;
DROP POLICY IF EXISTS "Authenticated users can update own recrutamento" ON public.recrutamento;
DROP POLICY IF EXISTS "Authenticated users can delete own recrutamento" ON public.recrutamento;

CREATE POLICY "Recrutamento: usuario pode ver seus proprios registros"
  ON public.recrutamento FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Recrutamento: gestor ve registros da equipe"
  ON public.recrutamento FOR SELECT
  USING (public.is_gestor_da_equipe(recrutamento.usuario_id));

CREATE POLICY "Recrutamento: admin ve todos"
  ON public.recrutamento FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Recrutamento: usuario pode inserir para si"
  ON public.recrutamento FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Recrutamento: admin pode inserir para terceiro"
  ON public.recrutamento FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = recrutamento.usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "Recrutamento: usuario pode atualizar seus proprios registros"
  ON public.recrutamento FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Recrutamento: gestor atualiza registros da equipe"
  ON public.recrutamento FOR UPDATE
  USING (public.is_gestor_da_equipe(recrutamento.usuario_id))
  WITH CHECK (public.is_gestor_da_equipe(recrutamento.usuario_id));

CREATE POLICY "Recrutamento: admin atualiza qualquer registro"
  ON public.recrutamento FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Recrutamento: usuario pode excluir seus proprios registros"
  ON public.recrutamento FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Recrutamento: gestor exclui registros da equipe"
  ON public.recrutamento FOR DELETE
  USING (public.is_gestor_da_equipe(recrutamento.usuario_id));

CREATE POLICY "Recrutamento: admin exclui qualquer registro"
  ON public.recrutamento FOR DELETE
  USING (public.is_admin_safe());

-- ===== PARCEIROS =====
DROP POLICY IF EXISTS "Authenticated users can view own parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "Authenticated users can insert own parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "Authenticated users can update own parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "Authenticated users can delete own parceiros" ON public.parceiros;

CREATE POLICY "Parceiros: usuario pode ver seus proprios registros"
  ON public.parceiros FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Parceiros: gestor ve registros da equipe"
  ON public.parceiros FOR SELECT
  USING (public.is_gestor_da_equipe(parceiros.usuario_id));

CREATE POLICY "Parceiros: admin ve todos"
  ON public.parceiros FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Parceiros: usuario pode inserir para si"
  ON public.parceiros FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Parceiros: admin pode inserir para terceiro"
  ON public.parceiros FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = parceiros.usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "Parceiros: usuario pode atualizar seus proprios registros"
  ON public.parceiros FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Parceiros: gestor atualiza registros da equipe"
  ON public.parceiros FOR UPDATE
  USING (public.is_gestor_da_equipe(parceiros.usuario_id))
  WITH CHECK (public.is_gestor_da_equipe(parceiros.usuario_id));

CREATE POLICY "Parceiros: admin atualiza qualquer registro"
  ON public.parceiros FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Parceiros: usuario pode excluir seus proprios registros"
  ON public.parceiros FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Parceiros: gestor exclui registros da equipe"
  ON public.parceiros FOR DELETE
  USING (public.is_gestor_da_equipe(parceiros.usuario_id));

CREATE POLICY "Parceiros: admin exclui qualquer registro"
  ON public.parceiros FOR DELETE
  USING (public.is_admin_safe());

-- ===== COMISSOES_INDICADORES =====
DROP POLICY IF EXISTS "Authenticated users can view their indicator commissions" ON public.comissoes_indicadores;
DROP POLICY IF EXISTS "Authenticated users can insert their indicator commissions" ON public.comissoes_indicadores;
DROP POLICY IF EXISTS "Authenticated users can update their indicator commissions" ON public.comissoes_indicadores;
DROP POLICY IF EXISTS "Authenticated users can delete their indicator commissions" ON public.comissoes_indicadores;

CREATE POLICY "Comissoes: usuario pode ver seus proprios registros"
  ON public.comissoes_indicadores FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Comissoes: admin ve todos"
  ON public.comissoes_indicadores FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Comissoes: usuario pode inserir para si"
  ON public.comissoes_indicadores FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Comissoes: admin pode inserir para terceiro"
  ON public.comissoes_indicadores FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = comissoes_indicadores.usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "Comissoes: usuario pode atualizar seus proprios registros"
  ON public.comissoes_indicadores FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Comissoes: admin atualiza qualquer registro"
  ON public.comissoes_indicadores FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Comissoes: usuario pode excluir seus proprios registros"
  ON public.comissoes_indicadores FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Comissoes: admin exclui qualquer registro"
  ON public.comissoes_indicadores FOR DELETE
  USING (public.is_admin_safe());

-- ===== METAS =====
DROP POLICY IF EXISTS "Authenticated users can view relevant metas" ON public.metas;
DROP POLICY IF EXISTS "Only admins can insert metas" ON public.metas;
DROP POLICY IF EXISTS "Only admins can update metas" ON public.metas;
DROP POLICY IF EXISTS "Only admins can delete metas" ON public.metas;

CREATE POLICY "Metas: usuario pode ver suas proprias metas"
  ON public.metas FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Metas: gestor ve metas da equipe"
  ON public.metas FOR SELECT
  USING (public.is_gestor_da_equipe(metas.usuario_id));

CREATE POLICY "Metas: admin ve todas"
  ON public.metas FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Metas: admin pode inserir"
  ON public.metas FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = metas.usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "Metas: admin pode atualizar"
  ON public.metas FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Metas: admin pode excluir"
  ON public.metas FOR DELETE
  USING (public.is_admin_safe());

-- ===== USER_PERMISSION_GRANTS =====
DROP POLICY IF EXISTS "Users can view their own permission grants" ON public.user_permission_grants;
DROP POLICY IF EXISTS "Only admins can insert permission grants" ON public.user_permission_grants;
DROP POLICY IF EXISTS "Only admins can update permission grants" ON public.user_permission_grants;
DROP POLICY IF EXISTS "Only admins can delete permission grants" ON public.user_permission_grants;

CREATE POLICY "Grants: usuario pode ver suas proprias permissoes"
  ON public.user_permission_grants FOR SELECT
  USING (auth.uid() = usuario_id OR public.is_admin_safe());

CREATE POLICY "Grants: gestor ve permissoes da equipe"
  ON public.user_permission_grants FOR SELECT
  USING (public.is_gestor_da_equipe(usuario_id));

CREATE POLICY "Grants: admin pode inserir"
  ON public.user_permission_grants FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "Grants: admin pode atualizar"
  ON public.user_permission_grants FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Grants: admin pode excluir"
  ON public.user_permission_grants FOR DELETE
  USING (public.is_admin_safe());

-- ===== USER_EVOLUTION_HISTORY =====
-- Tabela user_evolution_history pode nÃ£o existir em instalaÃ§Ãµes sem a migration criadora.
-- Protegemos toda a operaÃ§Ã£o com verificaÃ§Ã£o de existÃªncia.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_evolution_history') THEN
    DROP POLICY IF EXISTS "Evolution: usuario pode ver seu proprio historico" ON public.user_evolution_history;
    DROP POLICY IF EXISTS "Evolution: gestor ve historico da equipe" ON public.user_evolution_history;
    DROP POLICY IF EXISTS "Evolution: admin pode inserir" ON public.user_evolution_history;

    CREATE POLICY "Evolution: usuario pode ver seu proprio historico"
      ON public.user_evolution_history FOR SELECT
      USING (auth.uid() = usuario_id OR public.is_admin_safe());

    CREATE POLICY "Evolution: gestor ve historico da equipe"
      ON public.user_evolution_history FOR SELECT
      USING (public.is_gestor_da_equipe(user_evolution_history.usuario_id));

    CREATE POLICY "Evolution: admin pode inserir"
      ON public.user_evolution_history FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = usuario_id AND p.ativo = TRUE)
      );
  END IF;
END $$;

-- ===== PROFILES =====
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Gestors can view team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Gestors can update team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own personal fields" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can update profile administrative fields" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Profiles: usuario pode ver o proprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin_safe());

CREATE POLICY "Profiles: gestor ve perfis da equipe"
  ON public.profiles FOR SELECT
  USING (
    public.is_gestor_da_equipe(id)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.ativo = TRUE AND p.perfil IN ('Gestor', 'Gestor Pleno')
    )
  );

CREATE POLICY "Profiles: admin ve todos os perfis"
  ON public.profiles FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Profiles: usuario atualiza campos pessoais"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles: admin atualiza campos administrativos"
  ON public.profiles FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Profiles: usuario pode inserir o proprio perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles: admin exclui qualquer perfil"
  ON public.profiles FOR DELETE
  USING (public.is_admin_safe());

COMMIT;

-- ============================================================

-- 20261111000000  (20261111000000_correcao_rls_tabelas_restantes.sql)
-- ============================================================
-- Migration: 20261111000000_correcao_rls_tabelas_restantes.sql
-- Objetivo: Corrigir polÃ­ticas RLS de todas as tabelas que ainda possuem
--           regras permissivas ou ausentes apÃ³s a migration 20261110000000.
-- PrincÃ­pios:
--   - NÃ£o alterar migrations histÃ³ricas.
--   - NÃ£o utilizar DROP CASCADE.
--   - NÃ£o excluir tabelas, colunas ou registros existentes.
--   - Ser idempotente: verificar estado antes de alterar.
--   - NÃ£o aplicar no Supabase remoto nesta etapa.
--   - NÃ£o utilizar marked_id (coluna inexistente).
--   - Substituir public.is_admin() por public.is_admin_safe() onde usado.

BEGIN;

-- ============================================================
-- 0. REMOVER POLÃCIAS PERMISSIVAS PERIGOSAS DE MIGRAÃ‡Ã•ES ANTIGAS
-- ============================================================

-- profiles: polÃ­tica de 20260910000002 permite ANY authenticated ver TODOS os perfis
DROP POLICY IF EXISTS "Authenticated users can view basic profiles for identification" ON public.profiles;

-- usuario_status: polÃ­tica de 20260910000001 permite ANY authenticated ver TODOS os status
DROP POLICY IF EXISTS "Authenticated users can view status" ON public.usuario_status;

-- propostas: polÃ­tica pÃºblica perigosa - qualquer um (mesmo nÃ£o autenticado) vÃª todas
DROP POLICY IF EXISTS "Public can view proposals by token" ON public.propostas;

-- proposta_eventos: insert pÃºblico perigoso
DROP POLICY IF EXISTS "Public can insert proposal events" ON public.proposta_eventos;

-- ============================================================
-- 1. TABELAS COM usuario_id - POLÃCIAS PROPRIETÃRIO + GESTOR + ADMIN
-- ============================================================
-- Estas tabelas seguem o mesmo padrÃ£o da migration 20261110000000:
--   SELECT: proprietÃ¡rio OR gestor da equipe OR admin
--   INSERT: proprietÃ¡rio para si, ou admin para terceiro
--   UPDATE/DELETE: proprietÃ¡rio OR gestor da equipe OR admin

DO $$
BEGIN
  -- Contatos Indicados
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='contatos_indicados') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their indicated contacts" ON public.contatos_indicados;
    DROP POLICY IF EXISTS "Authenticated users can insert their indicated contacts" ON public.contatos_indicados;
    DROP POLICY IF EXISTS "Authenticated users can update their indicated contacts" ON public.contatos_indicados;
    DROP POLICY IF EXISTS "Authenticated users can delete their indicated contacts" ON public.contatos_indicados;

    CREATE POLICY "ContatosIndicados: usuario pode ver seus proprios registros"
      ON public.contatos_indicados FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ContatosIndicados: gestor ve registros da equipe"
      ON public.contatos_indicados FOR SELECT
      USING (public.is_gestor_da_equipe(contatos_indicados.usuario_id));
    CREATE POLICY "ContatosIndicados: admin ve todos"
      ON public.contatos_indicados FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "ContatosIndicados: usuario pode inserir para si"
      ON public.contatos_indicados FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ContatosIndicados: admin pode inserir para terceiro"
      ON public.contatos_indicados FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = contatos_indicados.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "ContatosIndicados: usuario pode atualizar seus proprios registros"
      ON public.contatos_indicados FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ContatosIndicados: gestor atualiza registros da equipe"
      ON public.contatos_indicados FOR UPDATE
      USING (public.is_gestor_da_equipe(contatos_indicados.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(contatos_indicados.usuario_id));
    CREATE POLICY "ContatosIndicados: admin atualiza qualquer registro"
      ON public.contatos_indicados FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "ContatosIndicados: usuario pode excluir seus proprios registros"
      ON public.contatos_indicados FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ContatosIndicados: gestor exclui registros da equipe"
      ON public.contatos_indicados FOR DELETE
      USING (public.is_gestor_da_equipe(contatos_indicados.usuario_id));
    CREATE POLICY "ContatosIndicados: admin exclui qualquer registro"
      ON public.contatos_indicados FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Cliente Contatos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cliente_contatos') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their client contacts" ON public.cliente_contatos;
    DROP POLICY IF EXISTS "Authenticated users can insert their client contacts" ON public.cliente_contatos;
    DROP POLICY IF EXISTS "Authenticated users can update their client contacts" ON public.cliente_contatos;
    DROP POLICY IF EXISTS "Authenticated users can delete their client contacts" ON public.cliente_contatos;

    CREATE POLICY "ClienteContatos: usuario pode ver seus proprios registros"
      ON public.cliente_contatos FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ClienteContatos: gestor ve registros da equipe"
      ON public.cliente_contatos FOR SELECT
      USING (public.is_gestor_da_equipe(cliente_contatos.usuario_id));
    CREATE POLICY "ClienteContatos: admin ve todos"
      ON public.cliente_contatos FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "ClienteContatos: usuario pode inserir para si"
      ON public.cliente_contatos FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ClienteContatos: admin pode inserir para terceiro"
      ON public.cliente_contatos FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = cliente_contatos.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "ClienteContatos: usuario pode atualizar seus proprios registros"
      ON public.cliente_contatos FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ClienteContatos: gestor atualiza registros da equipe"
      ON public.cliente_contatos FOR UPDATE
      USING (public.is_gestor_da_equipe(cliente_contatos.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(cliente_contatos.usuario_id));
    CREATE POLICY "ClienteContatos: admin atualiza qualquer registro"
      ON public.cliente_contatos FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "ClienteContatos: usuario pode excluir seus proprios registros"
      ON public.cliente_contatos FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ClienteContatos: gestor exclui registros da equipe"
      ON public.cliente_contatos FOR DELETE
      USING (public.is_gestor_da_equipe(cliente_contatos.usuario_id));
    CREATE POLICY "ClienteContatos: admin exclui qualquer registro"
      ON public.cliente_contatos FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Cliente Historico
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cliente_historico') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their client history" ON public.cliente_historico;
    DROP POLICY IF EXISTS "Authenticated users can insert their client history" ON public.cliente_historico;

    CREATE POLICY "ClienteHistorico: usuario pode ver seus proprios registros"
      ON public.cliente_historico FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ClienteHistorico: gestor ve registros da equipe"
      ON public.cliente_historico FOR SELECT
      USING (public.is_gestor_da_equipe(cliente_historico.usuario_id));
    CREATE POLICY "ClienteHistorico: admin ve todos"
      ON public.cliente_historico FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "ClienteHistorico: usuario pode inserir para si"
      ON public.cliente_historico FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ClienteHistorico: admin pode inserir para terceiro"
      ON public.cliente_historico FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = cliente_historico.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "ClienteHistorico: usuario pode atualizar seus proprios registros"
      ON public.cliente_historico FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ClienteHistorico: gestor atualiza registros da equipe"
      ON public.cliente_historico FOR UPDATE
      USING (public.is_gestor_da_equipe(cliente_historico.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(cliente_historico.usuario_id));
    CREATE POLICY "ClienteHistorico: admin atualiza qualquer registro"
      ON public.cliente_historico FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "ClienteHistorico: usuario pode excluir seus proprios registros"
      ON public.cliente_historico FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ClienteHistorico: gestor exclui registros da equipe"
      ON public.cliente_historico FOR DELETE
      USING (public.is_gestor_da_equipe(cliente_historico.usuario_id));
    CREATE POLICY "ClienteHistorico: admin exclui qualquer registro"
      ON public.cliente_historico FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Negociacao Historico
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='negociacao_historico') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their negotiation history" ON public.negociacao_historico;
    DROP POLICY IF EXISTS "Authenticated users can insert their negotiation history" ON public.negociacao_historico;

    CREATE POLICY "NegociacaoHistorico: usuario pode ver seus proprios registros"
      ON public.negociacao_historico FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "NegociacaoHistorico: gestor ve registros da equipe"
      ON public.negociacao_historico FOR SELECT
      USING (public.is_gestor_da_equipe(negociacao_historico.usuario_id));
    CREATE POLICY "NegociacaoHistorico: admin ve todos"
      ON public.negociacao_historico FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "NegociacaoHistorico: usuario pode inserir para si"
      ON public.negociacao_historico FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "NegociacaoHistorico: admin pode inserir para terceiro"
      ON public.negociacao_historico FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = negociacao_historico.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "NegociacaoHistorico: usuario pode atualizar seus proprios registros"
      ON public.negociacao_historico FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "NegociacaoHistorico: gestor atualiza registros da equipe"
      ON public.negociacao_historico FOR UPDATE
      USING (public.is_gestor_da_equipe(negociacao_historico.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(negociacao_historico.usuario_id));
    CREATE POLICY "NegociacaoHistorico: admin atualiza qualquer registro"
      ON public.negociacao_historico FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "NegociacaoHistorico: usuario pode excluir seus proprios registros"
      ON public.negociacao_historico FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "NegociacaoHistorico: gestor exclui registros da equipe"
      ON public.negociacao_historico FOR DELETE
      USING (public.is_gestor_da_equipe(negociacao_historico.usuario_id));
    CREATE POLICY "NegociacaoHistorico: admin exclui qualquer registro"
      ON public.negociacao_historico FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Anexos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='anexos') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their anexos" ON public.anexos;
    DROP POLICY IF EXISTS "Authenticated users can insert their anexos" ON public.anexos;
    DROP POLICY IF EXISTS "Authenticated users can update their anexos" ON public.anexos;
    DROP POLICY IF EXISTS "Authenticated users can delete their anexos" ON public.anexos;

    CREATE POLICY "Anexos: usuario pode ver seus proprios registros"
      ON public.anexos FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Anexos: gestor ve registros da equipe"
      ON public.anexos FOR SELECT
      USING (public.is_gestor_da_equipe(anexos.usuario_id));
    CREATE POLICY "Anexos: admin ve todos"
      ON public.anexos FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "Anexos: usuario pode inserir para si"
      ON public.anexos FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Anexos: admin pode inserir para terceiro"
      ON public.anexos FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = anexos.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "Anexos: usuario pode atualizar seus proprios registros"
      ON public.anexos FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Anexos: gestor atualiza registros da equipe"
      ON public.anexos FOR UPDATE
      USING (public.is_gestor_da_equipe(anexos.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(anexos.usuario_id));
    CREATE POLICY "Anexos: admin atualiza qualquer registro"
      ON public.anexos FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "Anexos: usuario pode excluir seus proprios registros"
      ON public.anexos FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Anexos: gestor exclui registros da equipe"
      ON public.anexos FOR DELETE
      USING (public.is_gestor_da_equipe(anexos.usuario_id));
    CREATE POLICY "Anexos: admin exclui qualquer registro"
      ON public.anexos FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Whatsapp Mensagens
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='whatsapp_mensagens') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their whatsapp messages" ON public.whatsapp_mensagens;
    DROP POLICY IF EXISTS "Authenticated users can insert their whatsapp messages" ON public.whatsapp_mensagens;
    DROP POLICY IF EXISTS "Authenticated users can update their whatsapp messages" ON public.whatsapp_mensagens;
    DROP POLICY IF EXISTS "Authenticated users can delete their whatsapp messages" ON public.whatsapp_mensagens;

    CREATE POLICY "WhatsappMensagens: usuario pode ver seus proprios registros"
      ON public.whatsapp_mensagens FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "WhatsappMensagens: gestor ve registros da equipe"
      ON public.whatsapp_mensagens FOR SELECT
      USING (public.is_gestor_da_equipe(whatsapp_mensagens.usuario_id));
    CREATE POLICY "WhatsappMensagens: admin ve todos"
      ON public.whatsapp_mensagens FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "WhatsappMensagens: usuario pode inserir para si"
      ON public.whatsapp_mensagens FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "WhatsappMensagens: admin pode inserir para terceiro"
      ON public.whatsapp_mensagens FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = whatsapp_mensagens.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "WhatsappMensagens: usuario pode atualizar seus proprios registros"
      ON public.whatsapp_mensagens FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "WhatsappMensagens: gestor atualiza registros da equipe"
      ON public.whatsapp_mensagens FOR UPDATE
      USING (public.is_gestor_da_equipe(whatsapp_mensagens.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(whatsapp_mensagens.usuario_id));
    CREATE POLICY "WhatsappMensagens: admin atualiza qualquer registro"
      ON public.whatsapp_mensagens FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "WhatsappMensagens: usuario pode excluir seus proprios registros"
      ON public.whatsapp_mensagens FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "WhatsappMensagens: gestor exclui registros da equipe"
      ON public.whatsapp_mensagens FOR DELETE
      USING (public.is_gestor_da_equipe(whatsapp_mensagens.usuario_id));
    CREATE POLICY "WhatsappMensagens: admin exclui qualquer registro"
      ON public.whatsapp_mensagens FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Assembleias
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='assembleias') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their assembleias" ON public.assembleias;
    DROP POLICY IF EXISTS "Authenticated users can insert their assembleias" ON public.assembleias;
    DROP POLICY IF EXISTS "Authenticated users can update their assembleias" ON public.assembleias;
    DROP POLICY IF EXISTS "Authenticated users can delete their assembleias" ON public.assembleias;

    CREATE POLICY "Assembleias: usuario pode ver seus proprios registros"
      ON public.assembleias FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Assembleias: gestor ve registros da equipe"
      ON public.assembleias FOR SELECT
      USING (public.is_gestor_da_equipe(assembleias.usuario_id));
    CREATE POLICY "Assembleias: admin ve todos"
      ON public.assembleias FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "Assembleias: usuario pode inserir para si"
      ON public.assembleias FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Assembleias: admin pode inserir para terceiro"
      ON public.assembleias FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = assembleias.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "Assembleias: usuario pode atualizar seus proprios registros"
      ON public.assembleias FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Assembleias: gestor atualiza registros da equipe"
      ON public.assembleias FOR UPDATE
      USING (public.is_gestor_da_equipe(assembleias.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(assembleias.usuario_id));
    CREATE POLICY "Assembleias: admin atualiza qualquer registro"
      ON public.assembleias FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "Assembleias: usuario pode excluir seus proprios registros"
      ON public.assembleias FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Assembleias: gestor exclui registros da equipe"
      ON public.assembleias FOR DELETE
      USING (public.is_gestor_da_equipe(assembleias.usuario_id));
    CREATE POLICY "Assembleias: admin exclui qualquer registro"
      ON public.assembleias FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Assembleia Avisos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='assembleia_avisos') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their assembleia avisos" ON public.assembleia_avisos;
    DROP POLICY IF EXISTS "Authenticated users can insert their assembleia avisos" ON public.assembleia_avisos;
    DROP POLICY IF EXISTS "Authenticated users can update their assembleia avisos" ON public.assembleia_avisos;
    DROP POLICY IF EXISTS "Authenticated users can delete their assembleia avisos" ON public.assembleia_avisos;

    CREATE POLICY "AssembleiaAvisos: usuario pode ver seus proprios registros"
      ON public.assembleia_avisos FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "AssembleiaAvisos: gestor ve registros da equipe"
      ON public.assembleia_avisos FOR SELECT
      USING (public.is_gestor_da_equipe(assembleia_avisos.usuario_id));
    CREATE POLICY "AssembleiaAvisos: admin ve todos"
      ON public.assembleia_avisos FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "AssembleiaAvisos: usuario pode inserir para si"
      ON public.assembleia_avisos FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "AssembleiaAvisos: admin pode inserir para terceiro"
      ON public.assembleia_avisos FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = assembleia_avisos.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "AssembleiaAvisos: usuario pode atualizar seus proprios registros"
      ON public.assembleia_avisos FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "AssembleiaAvisos: gestor atualiza registros da equipe"
      ON public.assembleia_avisos FOR UPDATE
      USING (public.is_gestor_da_equipe(assembleia_avisos.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(assembleia_avisos.usuario_id));
    CREATE POLICY "AssembleiaAvisos: admin atualiza qualquer registro"
      ON public.assembleia_avisos FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "AssembleiaAvisos: usuario pode excluir seus proprios registros"
      ON public.assembleia_avisos FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "AssembleiaAvisos: gestor exclui registros da equipe"
      ON public.assembleia_avisos FOR DELETE
      USING (public.is_gestor_da_equipe(assembleia_avisos.usuario_id));
    CREATE POLICY "AssembleiaAvisos: admin exclui qualquer registro"
      ON public.assembleia_avisos FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Assembleia Historico
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='assembleia_historico') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their assembleia historico" ON public.assembleia_historico;
    DROP POLICY IF EXISTS "Authenticated users can insert their assembleia historico" ON public.assembleia_historico;
    DROP POLICY IF EXISTS "Authenticated users can delete their assembleia historico" ON public.assembleia_historico;

    CREATE POLICY "AssembleiaHistorico: usuario pode ver seus proprios registros"
      ON public.assembleia_historico FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "AssembleiaHistorico: gestor ve registros da equipe"
      ON public.assembleia_historico FOR SELECT
      USING (public.is_gestor_da_equipe(assembleia_historico.usuario_id));
    CREATE POLICY "AssembleiaHistorico: admin ve todos"
      ON public.assembleia_historico FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "AssembleiaHistorico: usuario pode inserir para si"
      ON public.assembleia_historico FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "AssembleiaHistorico: admin pode inserir para terceiro"
      ON public.assembleia_historico FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = assembleia_historico.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "AssembleiaHistorico: usuario pode atualizar seus proprios registros"
      ON public.assembleia_historico FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "AssembleiaHistorico: gestor atualiza registros da equipe"
      ON public.assembleia_historico FOR UPDATE
      USING (public.is_gestor_da_equipe(assembleia_historico.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(assembleia_historico.usuario_id));
    CREATE POLICY "AssembleiaHistorico: admin atualiza qualquer registro"
      ON public.assembleia_historico FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "AssembleiaHistorico: usuario pode excluir seus proprios registros"
      ON public.assembleia_historico FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "AssembleiaHistorico: gestor exclui registros da equipe"
      ON public.assembleia_historico FOR DELETE
      USING (public.is_gestor_da_equipe(assembleia_historico.usuario_id));
    CREATE POLICY "AssembleiaHistorico: admin exclui qualquer registro"
      ON public.assembleia_historico FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Loteria Federal
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='loteria_federal') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their loteria_federal" ON public.loteria_federal;
    DROP POLICY IF EXISTS "Authenticated users can insert their loteria_federal" ON public.loteria_federal;
    DROP POLICY IF EXISTS "Authenticated users can update their loteria_federal" ON public.loteria_federal;
    DROP POLICY IF EXISTS "Authenticated users can delete their loteria_federal" ON public.loteria_federal;

    CREATE POLICY "LoteriaFederal: usuario pode ver seus proprios registros"
      ON public.loteria_federal FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "LoteriaFederal: gestor ve registros da equipe"
      ON public.loteria_federal FOR SELECT
      USING (public.is_gestor_da_equipe(loteria_federal.usuario_id));
    CREATE POLICY "LoteriaFederal: admin ve todos"
      ON public.loteria_federal FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "LoteriaFederal: usuario pode inserir para si"
      ON public.loteria_federal FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "LoteriaFederal: admin pode inserir para terceiro"
      ON public.loteria_federal FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = loteria_federal.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "LoteriaFederal: usuario pode atualizar seus proprios registros"
      ON public.loteria_federal FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "LoteriaFederal: gestor atualiza registros da equipe"
      ON public.loteria_federal FOR UPDATE
      USING (public.is_gestor_da_equipe(loteria_federal.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(loteria_federal.usuario_id));
    CREATE POLICY "LoteriaFederal: admin atualiza qualquer registro"
      ON public.loteria_federal FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "LoteriaFederal: usuario pode excluir seus proprios registros"
      ON public.loteria_federal FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "LoteriaFederal: gestor exclui registros da equipe"
      ON public.loteria_federal FOR DELETE
      USING (public.is_gestor_da_equipe(loteria_federal.usuario_id));
    CREATE POLICY "LoteriaFederal: admin exclui qualquer registro"
      ON public.loteria_federal FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Lances
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='lances') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their lances" ON public.lances;
    DROP POLICY IF EXISTS "Authenticated users can insert their lances" ON public.lances;
    DROP POLICY IF EXISTS "Authenticated users can update their lances" ON public.lances;
    DROP POLICY IF EXISTS "Authenticated users can delete their lances" ON public.lances;

    CREATE POLICY "Lances: usuario pode ver seus proprios registros"
      ON public.lances FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Lances: gestor ve registros da equipe"
      ON public.lances FOR SELECT
      USING (public.is_gestor_da_equipe(lances.usuario_id));
    CREATE POLICY "Lances: admin ve todos"
      ON public.lances FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "Lances: usuario pode inserir para si"
      ON public.lances FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Lances: admin pode inserir para terceiro"
      ON public.lances FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = lances.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "Lances: usuario pode atualizar seus proprios registros"
      ON public.lances FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Lances: gestor atualiza registros da equipe"
      ON public.lances FOR UPDATE
      USING (public.is_gestor_da_equipe(lances.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(lances.usuario_id));
    CREATE POLICY "Lances: admin atualiza qualquer registro"
      ON public.lances FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "Lances: usuario pode excluir seus proprios registros"
      ON public.lances FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Lances: gestor exclui registros da equipe"
      ON public.lances FOR DELETE
      USING (public.is_gestor_da_equipe(lances.usuario_id));
    CREATE POLICY "Lances: admin exclui qualquer registro"
      ON public.lances FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Contemplacoes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='contemplacoes') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their contemplacoes" ON public.contemplacoes;
    DROP POLICY IF EXISTS "Authenticated users can insert their contemplacoes" ON public.contemplacoes;
    DROP POLICY IF EXISTS "Authenticated users can update their contemplacoes" ON public.contemplacoes;
    DROP POLICY IF EXISTS "Authenticated users can delete their contemplacoes" ON public.contemplacoes;

    CREATE POLICY "Contemplacoes: usuario pode ver seus proprios registros"
      ON public.contemplacoes FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Contemplacoes: gestor ve registros da equipe"
      ON public.contemplacoes FOR SELECT
      USING (public.is_gestor_da_equipe(contemplacoes.usuario_id));
    CREATE POLICY "Contemplacoes: admin ve todos"
      ON public.contemplacoes FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "Contemplacoes: usuario pode inserir para si"
      ON public.contemplacoes FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Contemplacoes: admin pode inserir para terceiro"
      ON public.contemplacoes FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = contemplacoes.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "Contemplacoes: usuario pode atualizar seus proprios registros"
      ON public.contemplacoes FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Contemplacoes: gestor atualiza registros da equipe"
      ON public.contemplacoes FOR UPDATE
      USING (public.is_gestor_da_equipe(contemplacoes.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(contemplacoes.usuario_id));
    CREATE POLICY "Contemplacoes: admin atualiza qualquer registro"
      ON public.contemplacoes FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "Contemplacoes: usuario pode excluir seus proprios registros"
      ON public.contemplacoes FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Contemplacoes: gestor exclui registros da equipe"
      ON public.contemplacoes FOR DELETE
      USING (public.is_gestor_da_equipe(contemplacoes.usuario_id));
    CREATE POLICY "Contemplacoes: admin exclui qualquer registro"
      ON public.contemplacoes FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Contemplacao Historico
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='contemplacao_historico') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their contemplacao historico" ON public.contemplacao_historico;
    DROP POLICY IF EXISTS "Authenticated users can insert their contemplacao historico" ON public.contemplacao_historico;
    DROP POLICY IF EXISTS "Authenticated users can delete their contemplacao historico" ON public.contemplacao_historico;

    CREATE POLICY "ContemplacaoHistorico: usuario pode ver seus proprios registros"
      ON public.contemplacao_historico FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ContemplacaoHistorico: gestor ve registros da equipe"
      ON public.contemplacao_historico FOR SELECT
      USING (public.is_gestor_da_equipe(contemplacao_historico.usuario_id));
    CREATE POLICY "ContemplacaoHistorico: admin ve todos"
      ON public.contemplacao_historico FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "ContemplacaoHistorico: usuario pode inserir para si"
      ON public.contemplacao_historico FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ContemplacaoHistorico: admin pode inserir para terceiro"
      ON public.contemplacao_historico FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = contemplacao_historico.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "ContemplacaoHistorico: usuario pode atualizar seus proprios registros"
      ON public.contemplacao_historico FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ContemplacaoHistorico: gestor atualiza registros da equipe"
      ON public.contemplacao_historico FOR UPDATE
      USING (public.is_gestor_da_equipe(contemplacao_historico.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(contemplacao_historico.usuario_id));
    CREATE POLICY "ContemplacaoHistorico: admin atualiza qualquer registro"
      ON public.contemplacao_historico FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "ContemplacaoHistorico: usuario pode excluir seus proprios registros"
      ON public.contemplacao_historico FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ContemplacaoHistorico: gestor exclui registros da equipe"
      ON public.contemplacao_historico FOR DELETE
      USING (public.is_gestor_da_equipe(contemplacao_historico.usuario_id));
    CREATE POLICY "ContemplacaoHistorico: admin exclui qualquer registro"
      ON public.contemplacao_historico FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Materiais Consultores
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='materiais_consultores') THEN
    DROP POLICY IF EXISTS "Authenticated users can view active materiais_consultores" ON public.materiais_consultores;
    DROP POLICY IF EXISTS "Authenticated users with admin/gestor can insert materiais_consultores" ON public.materiais_consultores;
    DROP POLICY IF EXISTS "Authenticated users with admin/gestor can update their materiais_consultores" ON public.materiais_consultores;
    DROP POLICY IF EXISTS "Authenticated users with admin/gestor can delete their materiais_consultores" ON public.materiais_consultores;

    CREATE POLICY "MateriaisConsultores: usuario pode ver seus proprios registros"
      ON public.materiais_consultores FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "MateriaisConsultores: gestor ve registros da equipe"
      ON public.materiais_consultores FOR SELECT
      USING (public.is_gestor_da_equipe(materiais_consultores.usuario_id));
    CREATE POLICY "MateriaisConsultores: admin ve todos"
      ON public.materiais_consultores FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "MateriaisConsultores: usuario pode inserir para si"
      ON public.materiais_consultores FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "MateriaisConsultores: admin pode inserir para terceiro"
      ON public.materiais_consultores FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = materiais_consultores.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "MateriaisConsultores: usuario pode atualizar seus proprios registros"
      ON public.materiais_consultores FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "MateriaisConsultores: gestor atualiza registros da equipe"
      ON public.materiais_consultores FOR UPDATE
      USING (public.is_gestor_da_equipe(materiais_consultores.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(materiais_consultores.usuario_id));
    CREATE POLICY "MateriaisConsultores: admin atualiza qualquer registro"
      ON public.materiais_consultores FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "MateriaisConsultores: usuario pode excluir seus proprios registros"
      ON public.materiais_consultores FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "MateriaisConsultores: gestor exclui registros da equipe"
      ON public.materiais_consultores FOR DELETE
      USING (public.is_gestor_da_equipe(materiais_consultores.usuario_id));
    CREATE POLICY "MateriaisConsultores: admin exclui qualquer registro"
      ON public.materiais_consultores FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Treinamentos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='treinamentos') THEN
    DROP POLICY IF EXISTS "Authenticated users can view active treinamentos" ON public.treinamentos;
    DROP POLICY IF EXISTS "Authenticated users with admin/gestor can insert treinamentos" ON public.treinamentos;
    DROP POLICY IF EXISTS "Authenticated users with admin/gestor can update their treinamentos" ON public.treinamentos;
    DROP POLICY IF EXISTS "Authenticated users with admin/gestor can delete their treinamentos" ON public.treinamentos;

    CREATE POLICY "Treinamentos: usuario pode ver seus proprios registros"
      ON public.treinamentos FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Treinamentos: gestor ve registros da equipe"
      ON public.treinamentos FOR SELECT
      USING (public.is_gestor_da_equipe(treinamentos.usuario_id));
    CREATE POLICY "Treinamentos: admin ve todos"
      ON public.treinamentos FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "Treinamentos: usuario pode inserir para si"
      ON public.treinamentos FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Treinamentos: admin pode inserir para terceiro"
      ON public.treinamentos FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = treinamentos.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "Treinamentos: usuario pode atualizar seus proprios registros"
      ON public.treinamentos FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Treinamentos: gestor atualiza registros da equipe"
      ON public.treinamentos FOR UPDATE
      USING (public.is_gestor_da_equipe(treinamentos.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(treinamentos.usuario_id));
    CREATE POLICY "Treinamentos: admin atualiza qualquer registro"
      ON public.treinamentos FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "Treinamentos: usuario pode excluir seus proprios registros"
      ON public.treinamentos FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Treinamentos: gestor exclui registros da equipe"
      ON public.treinamentos FOR DELETE
      USING (public.is_gestor_da_equipe(treinamentos.usuario_id));
    CREATE POLICY "Treinamentos: admin exclui qualquer registro"
      ON public.treinamentos FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Links Uteis
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='links_uteis') THEN
    DROP POLICY IF EXISTS "Authenticated users can view active links_uteis" ON public.links_uteis;
    DROP POLICY IF EXISTS "Authenticated users with admin/gestor can insert links_uteis" ON public.links_uteis;
    DROP POLICY IF EXISTS "Authenticated users with admin/gestor can update their links_uteis" ON public.links_uteis;
    DROP POLICY IF EXISTS "Authenticated users with admin/gestor can delete their links_uteis" ON public.links_uteis;

    CREATE POLICY "LinksUteis: usuario pode ver seus proprios registros"
      ON public.links_uteis FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "LinksUteis: gestor ve registros da equipe"
      ON public.links_uteis FOR SELECT
      USING (public.is_gestor_da_equipe(links_uteis.usuario_id));
    CREATE POLICY "LinksUteis: admin ve todos"
      ON public.links_uteis FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "LinksUteis: usuario pode inserir para si"
      ON public.links_uteis FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "LinksUteis: admin pode inserir para terceiro"
      ON public.links_uteis FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = links_uteis.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "LinksUteis: usuario pode atualizar seus proprios registros"
      ON public.links_uteis FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "LinksUteis: gestor atualiza registros da equipe"
      ON public.links_uteis FOR UPDATE
      USING (public.is_gestor_da_equipe(links_uteis.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(links_uteis.usuario_id));
    CREATE POLICY "LinksUteis: admin atualiza qualquer registro"
      ON public.links_uteis FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "LinksUteis: usuario pode excluir seus proprios registros"
      ON public.links_uteis FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "LinksUteis: gestor exclui registros da equipe"
      ON public.links_uteis FOR DELETE
      USING (public.is_gestor_da_equipe(links_uteis.usuario_id));
    CREATE POLICY "LinksUteis: admin exclui qualquer registro"
      ON public.links_uteis FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Comunicacoes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='comunicacoes') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their comunicacoes" ON public.comunicacoes;
    DROP POLICY IF EXISTS "Authenticated users can insert their comunicacoes" ON public.comunicacoes;
    DROP POLICY IF EXISTS "Authenticated users can update their comunicacoes" ON public.comunicacoes;
    DROP POLICY IF EXISTS "Authenticated users can delete their comunicacoes" ON public.comunicacoes;

    CREATE POLICY "Comunicacoes: usuario pode ver seus proprios registros"
      ON public.comunicacoes FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Comunicacoes: gestor ve registros da equipe"
      ON public.comunicacoes FOR SELECT
      USING (public.is_gestor_da_equipe(comunicacoes.usuario_id));
    CREATE POLICY "Comunicacoes: admin ve todos"
      ON public.comunicacoes FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "Comunicacoes: usuario pode inserir para si"
      ON public.comunicacoes FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Comunicacoes: admin pode inserir para terceiro"
      ON public.comunicacoes FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = comunicacoes.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "Comunicacoes: usuario pode atualizar seus proprios registros"
      ON public.comunicacoes FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Comunicacoes: gestor atualiza registros da equipe"
      ON public.comunicacoes FOR UPDATE
      USING (public.is_gestor_da_equipe(comunicacoes.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(comunicacoes.usuario_id));
    CREATE POLICY "Comunicacoes: admin atualiza qualquer registro"
      ON public.comunicacoes FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "Comunicacoes: usuario pode excluir seus proprios registros"
      ON public.comunicacoes FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Comunicacoes: gestor exclui registros da equipe"
      ON public.comunicacoes FOR DELETE
      USING (public.is_gestor_da_equipe(comunicacoes.usuario_id));
    CREATE POLICY "Comunicacoes: admin exclui qualquer registro"
      ON public.comunicacoes FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Comunicacao Templates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='comunicacao_templates') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their comunicacao templates" ON public.comunicacao_templates;
    DROP POLICY IF EXISTS "Authenticated users can insert their comunicacao templates" ON public.comunicacao_templates;
    DROP POLICY IF EXISTS "Authenticated users can update their comunicacao templates" ON public.comunicacao_templates;
    DROP POLICY IF EXISTS "Authenticated users can delete their comunicacao templates" ON public.comunicacao_templates;

    CREATE POLICY "ComunicacaoTemplates: usuario pode ver seus proprios registros"
      ON public.comunicacao_templates FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ComunicacaoTemplates: gestor ve registros da equipe"
      ON public.comunicacao_templates FOR SELECT
      USING (public.is_gestor_da_equipe(comunicacao_templates.usuario_id));
    CREATE POLICY "ComunicacaoTemplates: admin ve todos"
      ON public.comunicacao_templates FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "ComunicacaoTemplates: usuario pode inserir para si"
      ON public.comunicacao_templates FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ComunicacaoTemplates: admin pode inserir para terceiro"
      ON public.comunicacao_templates FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = comunicacao_templates.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "ComunicacaoTemplates: usuario pode atualizar seus proprios registros"
      ON public.comunicacao_templates FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ComunicacaoTemplates: gestor atualiza registros da equipe"
      ON public.comunicacao_templates FOR UPDATE
      USING (public.is_gestor_da_equipe(comunicacao_templates.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(comunicacao_templates.usuario_id));
    CREATE POLICY "ComunicacaoTemplates: admin atualiza qualquer registro"
      ON public.comunicacao_templates FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "ComunicacaoTemplates: usuario pode excluir seus proprios registros"
      ON public.comunicacao_templates FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ComunicacaoTemplates: gestor exclui registros da equipe"
      ON public.comunicacao_templates FOR DELETE
      USING (public.is_gestor_da_equipe(comunicacao_templates.usuario_id));
    CREATE POLICY "ComunicacaoTemplates: admin exclui qualquer registro"
      ON public.comunicacao_templates FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Indicador Historico
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='indicador_historico') THEN
    DROP POLICY IF EXISTS "Authenticated users can view indicator history" ON public.indicador_historico;
    DROP POLICY IF EXISTS "Authenticated users can insert indicator history" ON public.indicador_historico;

    CREATE POLICY "IndicadorHistorico: usuario pode ver seus proprios registros"
      ON public.indicador_historico FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "IndicadorHistorico: gestor ve registros da equipe"
      ON public.indicador_historico FOR SELECT
      USING (public.is_gestor_da_equipe(indicador_historico.usuario_id));
    CREATE POLICY "IndicadorHistorico: admin ve todos"
      ON public.indicador_historico FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "IndicadorHistorico: usuario pode inserir para si"
      ON public.indicador_historico FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "IndicadorHistorico: admin pode inserir para terceiro"
      ON public.indicador_historico FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = indicador_historico.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "IndicadorHistorico: usuario pode atualizar seus proprios registros"
      ON public.indicador_historico FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "IndicadorHistorico: gestor atualiza registros da equipe"
      ON public.indicador_historico FOR UPDATE
      USING (public.is_gestor_da_equipe(indicador_historico.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(indicador_historico.usuario_id));
    CREATE POLICY "IndicadorHistorico: admin atualiza qualquer registro"
      ON public.indicador_historico FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "IndicadorHistorico: usuario pode excluir seus proprios registros"
      ON public.indicador_historico FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "IndicadorHistorico: gestor exclui registros da equipe"
      ON public.indicador_historico FOR DELETE
      USING (public.is_gestor_da_equipe(indicador_historico.usuario_id));
    CREATE POLICY "IndicadorHistorico: admin exclui qualquer registro"
      ON public.indicador_historico FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Cobranca Historico
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cobranca_historico') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their cobranca historico" ON public.cobranca_historico;
    DROP POLICY IF EXISTS "Authenticated users can insert their cobranca historico" ON public.cobranca_historico;
    DROP POLICY IF EXISTS "Authenticated users can delete their cobranca historico" ON public.cobranca_historico;

    CREATE POLICY "CobrancaHistorico: usuario pode ver seus proprios registros"
      ON public.cobranca_historico FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "CobrancaHistorico: gestor ve registros da equipe"
      ON public.cobranca_historico FOR SELECT
      USING (public.is_gestor_da_equipe(cobranca_historico.usuario_id));
    CREATE POLICY "CobrancaHistorico: admin ve todos"
      ON public.cobranca_historico FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "CobrancaHistorico: usuario pode inserir para si"
      ON public.cobranca_historico FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "CobrancaHistorico: admin pode inserir para terceiro"
      ON public.cobranca_historico FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = cobranca_historico.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "CobrancaHistorico: usuario pode atualizar seus proprios registros"
      ON public.cobranca_historico FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "CobrancaHistorico: gestor atualiza registros da equipe"
      ON public.cobranca_historico FOR UPDATE
      USING (public.is_gestor_da_equipe(cobranca_historico.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(cobranca_historico.usuario_id));
    CREATE POLICY "CobrancaHistorico: admin atualiza qualquer registro"
      ON public.cobranca_historico FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "CobrancaHistorico: usuario pode excluir seus proprios registros"
      ON public.cobranca_historico FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "CobrancaHistorico: gestor exclui registros da equipe"
      ON public.cobranca_historico FOR DELETE
      USING (public.is_gestor_da_equipe(cobranca_historico.usuario_id));
    CREATE POLICY "CobrancaHistorico: admin exclui qualquer registro"
      ON public.cobranca_historico FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Lead Historico
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='lead_historico') THEN
    DROP POLICY IF EXISTS "Allow authenticated users to view lead historico" ON public.lead_historico;
    DROP POLICY IF EXISTS "Allow authenticated users to insert lead historico" ON public.lead_historico;
    DROP POLICY IF EXISTS "Authenticated users can view their lead historico" ON public.lead_historico;
    DROP POLICY IF EXISTS "Authenticated users can insert their lead historico" ON public.lead_historico;
    DROP POLICY IF EXISTS "Authenticated users can update their lead historico" ON public.lead_historico;
    DROP POLICY IF EXISTS "Authenticated users can delete their lead historico" ON public.lead_historico;

    CREATE POLICY "LeadHistorico: usuario pode ver seus proprios registros"
      ON public.lead_historico FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "LeadHistorico: gestor ve registros da equipe"
      ON public.lead_historico FOR SELECT
      USING (public.is_gestor_da_equipe(lead_historico.usuario_id));
    CREATE POLICY "LeadHistorico: admin ve todos"
      ON public.lead_historico FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "LeadHistorico: usuario pode inserir para si"
      ON public.lead_historico FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "LeadHistorico: admin pode inserir para terceiro"
      ON public.lead_historico FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = lead_historico.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "LeadHistorico: usuario pode atualizar seus proprios registros"
      ON public.lead_historico FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "LeadHistorico: gestor atualiza registros da equipe"
      ON public.lead_historico FOR UPDATE
      USING (public.is_gestor_da_equipe(lead_historico.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(lead_historico.usuario_id));
    CREATE POLICY "LeadHistorico: admin atualiza qualquer registro"
      ON public.lead_historico FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "LeadHistorico: usuario pode excluir seus proprios registros"
      ON public.lead_historico FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "LeadHistorico: gestor exclui registros da equipe"
      ON public.lead_historico FOR DELETE
      USING (public.is_gestor_da_equipe(lead_historico.usuario_id));
    CREATE POLICY "LeadHistorico: admin exclui qualquer registro"
      ON public.lead_historico FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Lead Anexos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='lead_anexos') THEN
    DROP POLICY IF EXISTS "Allow authenticated users to view lead anexos" ON public.lead_anexos;
    DROP POLICY IF EXISTS "Allow authenticated users to insert lead anexos" ON public.lead_anexos;
    DROP POLICY IF EXISTS "Allow authenticated users to delete lead anexos" ON public.lead_anexos;
    DROP POLICY IF EXISTS "Authenticated users can view their lead anexos" ON public.lead_anexos;
    DROP POLICY IF EXISTS "Authenticated users can insert their lead anexos" ON public.lead_anexos;
    DROP POLICY IF EXISTS "Authenticated users can update their lead anexos" ON public.lead_anexos;
    DROP POLICY IF EXISTS "Authenticated users can delete their lead anexos" ON public.lead_anexos;

    CREATE POLICY "LeadAnexos: usuario pode ver seus proprios registros"
      ON public.lead_anexos FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "LeadAnexos: gestor ve registros da equipe"
      ON public.lead_anexos FOR SELECT
      USING (public.is_gestor_da_equipe(lead_anexos.usuario_id));
    CREATE POLICY "LeadAnexos: admin ve todos"
      ON public.lead_anexos FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "LeadAnexos: usuario pode inserir para si"
      ON public.lead_anexos FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "LeadAnexos: admin pode inserir para terceiro"
      ON public.lead_anexos FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = lead_anexos.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "LeadAnexos: usuario pode atualizar seus proprios registros"
      ON public.lead_anexos FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "LeadAnexos: gestor atualiza registros da equipe"
      ON public.lead_anexos FOR UPDATE
      USING (public.is_gestor_da_equipe(lead_anexos.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(lead_anexos.usuario_id));
    CREATE POLICY "LeadAnexos: admin atualiza qualquer registro"
      ON public.lead_anexos FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "LeadAnexos: usuario pode excluir seus proprios registros"
      ON public.lead_anexos FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "LeadAnexos: gestor exclui registros da equipe"
      ON public.lead_anexos FOR DELETE
      USING (public.is_gestor_da_equipe(lead_anexos.usuario_id));
    CREATE POLICY "LeadAnexos: admin exclui qualquer registro"
      ON public.lead_anexos FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Agenda Tarefas
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='agenda_tarefas') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their agenda tarefas" ON public.agenda_tarefas;
    DROP POLICY IF EXISTS "Authenticated users can insert their agenda tarefas" ON public.agenda_tarefas;
    DROP POLICY IF EXISTS "Authenticated users can update their agenda tarefas" ON public.agenda_tarefas;
    DROP POLICY IF EXISTS "Authenticated users can delete their agenda tarefas" ON public.agenda_tarefas;

    CREATE POLICY "AgendaTarefas: usuario pode ver seus proprios registros"
      ON public.agenda_tarefas FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "AgendaTarefas: gestor ve registros da equipe"
      ON public.agenda_tarefas FOR SELECT
      USING (public.is_gestor_da_equipe(agenda_tarefas.usuario_id));
    CREATE POLICY "AgendaTarefas: admin ve todos"
      ON public.agenda_tarefas FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "AgendaTarefas: usuario pode inserir para si"
      ON public.agenda_tarefas FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "AgendaTarefas: admin pode inserir para terceiro"
      ON public.agenda_tarefas FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = agenda_tarefas.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "AgendaTarefas: usuario pode atualizar seus proprios registros"
      ON public.agenda_tarefas FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "AgendaTarefas: gestor atualiza registros da equipe"
      ON public.agenda_tarefas FOR UPDATE
      USING (public.is_gestor_da_equipe(agenda_tarefas.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(agenda_tarefas.usuario_id));
    CREATE POLICY "AgendaTarefas: admin atualiza qualquer registro"
      ON public.agenda_tarefas FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "AgendaTarefas: usuario pode excluir seus proprios registros"
      ON public.agenda_tarefas FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "AgendaTarefas: gestor exclui registros da equipe"
      ON public.agenda_tarefas FOR DELETE
      USING (public.is_gestor_da_equipe(agenda_tarefas.usuario_id));
    CREATE POLICY "AgendaTarefas: admin exclui qualquer registro"
      ON public.agenda_tarefas FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Agenda Followups
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='agenda_followups') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their agenda followups" ON public.agenda_followups;
    DROP POLICY IF EXISTS "Authenticated users can insert their agenda followups" ON public.agenda_followups;
    DROP POLICY IF EXISTS "Authenticated users can update their agenda followups" ON public.agenda_followups;
    DROP POLICY IF EXISTS "Authenticated users can delete their agenda followups" ON public.agenda_followups;

    CREATE POLICY "AgendaFollowups: usuario pode ver seus proprios registros"
      ON public.agenda_followups FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "AgendaFollowups: gestor ve registros da equipe"
      ON public.agenda_followups FOR SELECT
      USING (public.is_gestor_da_equipe(agenda_followups.usuario_id));
    CREATE POLICY "AgendaFollowups: admin ve todos"
      ON public.agenda_followups FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "AgendaFollowups: usuario pode inserir para si"
      ON public.agenda_followups FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "AgendaFollowups: admin pode inserir para terceiro"
      ON public.agenda_followups FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = agenda_followups.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "AgendaFollowups: usuario pode atualizar seus proprios registros"
      ON public.agenda_followups FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "AgendaFollowups: gestor atualiza registros da equipe"
      ON public.agenda_followups FOR UPDATE
      USING (public.is_gestor_da_equipe(agenda_followups.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(agenda_followups.usuario_id));
    CREATE POLICY "AgendaFollowups: admin atualiza qualquer registro"
      ON public.agenda_followups FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "AgendaFollowups: usuario pode excluir seus proprios registros"
      ON public.agenda_followups FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "AgendaFollowups: gestor exclui registros da equipe"
      ON public.agenda_followups FOR DELETE
      USING (public.is_gestor_da_equipe(agenda_followups.usuario_id));
    CREATE POLICY "AgendaFollowups: admin exclui qualquer registro"
      ON public.agenda_followups FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Pos Venda Historico
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pos_venda_historico') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their pos_venda_historico" ON public.pos_venda_historico;
    DROP POLICY IF EXISTS "Authenticated users can insert their pos_venda_historico" ON public.pos_venda_historico;
    DROP POLICY IF EXISTS "Authenticated users can delete their pos_venda_historico" ON public.pos_venda_historico;

    CREATE POLICY "PosVendaHistorico: usuario pode ver seus proprios registros"
      ON public.pos_venda_historico FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaHistorico: gestor ve registros da equipe"
      ON public.pos_venda_historico FOR SELECT
      USING (public.is_gestor_da_equipe(pos_venda_historico.usuario_id));
    CREATE POLICY "PosVendaHistorico: admin ve todos"
      ON public.pos_venda_historico FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "PosVendaHistorico: usuario pode inserir para si"
      ON public.pos_venda_historico FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaHistorico: admin pode inserir para terceiro"
      ON public.pos_venda_historico FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = pos_venda_historico.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "PosVendaHistorico: usuario pode atualizar seus proprios registros"
      ON public.pos_venda_historico FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaHistorico: gestor atualiza registros da equipe"
      ON public.pos_venda_historico FOR UPDATE
      USING (public.is_gestor_da_equipe(pos_venda_historico.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(pos_venda_historico.usuario_id));
    CREATE POLICY "PosVendaHistorico: admin atualiza qualquer registro"
      ON public.pos_venda_historico FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "PosVendaHistorico: usuario pode excluir seus proprios registros"
      ON public.pos_venda_historico FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaHistorico: gestor exclui registros da equipe"
      ON public.pos_venda_historico FOR DELETE
      USING (public.is_gestor_da_equipe(pos_venda_historico.usuario_id));
    CREATE POLICY "PosVendaHistorico: admin exclui qualquer registro"
      ON public.pos_venda_historico FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Pos Venda Tarefas
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pos_venda_tarefas') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their pos_venda_tarefas" ON public.pos_venda_tarefas;
    DROP POLICY IF EXISTS "Authenticated users can insert their pos_venda_tarefas" ON public.pos_venda_tarefas;
    DROP POLICY IF EXISTS "Authenticated users can update their pos_venda_tarefas" ON public.pos_venda_tarefas;
    DROP POLICY IF EXISTS "Authenticated users can delete their pos_venda_tarefas" ON public.pos_venda_tarefas;

    CREATE POLICY "PosVendaTarefas: usuario pode ver seus proprios registros"
      ON public.pos_venda_tarefas FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaTarefas: gestor ve registros da equipe"
      ON public.pos_venda_tarefas FOR SELECT
      USING (public.is_gestor_da_equipe(pos_venda_tarefas.usuario_id));
    CREATE POLICY "PosVendaTarefas: admin ve todos"
      ON public.pos_venda_tarefas FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "PosVendaTarefas: usuario pode inserir para si"
      ON public.pos_venda_tarefas FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaTarefas: admin pode inserir para terceiro"
      ON public.pos_venda_tarefas FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = pos_venda_tarefas.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "PosVendaTarefas: usuario pode atualizar seus proprios registros"
      ON public.pos_venda_tarefas FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaTarefas: gestor atualiza registros da equipe"
      ON public.pos_venda_tarefas FOR UPDATE
      USING (public.is_gestor_da_equipe(pos_venda_tarefas.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(pos_venda_tarefas.usuario_id));
    CREATE POLICY "PosVendaTarefas: admin atualiza qualquer registro"
      ON public.pos_venda_tarefas FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "PosVendaTarefas: usuario pode excluir seus proprios registros"
      ON public.pos_venda_tarefas FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaTarefas: gestor exclui registros da equipe"
      ON public.pos_venda_tarefas FOR DELETE
      USING (public.is_gestor_da_equipe(pos_venda_tarefas.usuario_id));
    CREATE POLICY "PosVendaTarefas: admin exclui qualquer registro"
      ON public.pos_venda_tarefas FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Pos Venda Comunicacoes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pos_venda_comunicacoes') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their pos_venda_comunicacoes" ON public.pos_venda_comunicacoes;
    DROP POLICY IF EXISTS "Authenticated users can insert their pos_venda_comunicacoes" ON public.pos_venda_comunicacoes;
    DROP POLICY IF EXISTS "Authenticated users can update their pos_venda_comunicacoes" ON public.pos_venda_comunicacoes;
    DROP POLICY IF EXISTS "Authenticated users can delete their pos_venda_comunicacoes" ON public.pos_venda_comunicacoes;

    CREATE POLICY "PosVendaComunicacoes: usuario pode ver seus proprios registros"
      ON public.pos_venda_comunicacoes FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaComunicacoes: gestor ve registros da equipe"
      ON public.pos_venda_comunicacoes FOR SELECT
      USING (public.is_gestor_da_equipe(pos_venda_comunicacoes.usuario_id));
    CREATE POLICY "PosVendaComunicacoes: admin ve todos"
      ON public.pos_venda_comunicacoes FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "PosVendaComunicacoes: usuario pode inserir para si"
      ON public.pos_venda_comunicacoes FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaComunicacoes: admin pode inserir para terceiro"
      ON public.pos_venda_comunicacoes FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = pos_venda_comunicacoes.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "PosVendaComunicacoes: usuario pode atualizar seus proprios registros"
      ON public.pos_venda_comunicacoes FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaComunicacoes: gestor atualiza registros da equipe"
      ON public.pos_venda_comunicacoes FOR UPDATE
      USING (public.is_gestor_da_equipe(pos_venda_comunicacoes.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(pos_venda_comunicacoes.usuario_id));
    CREATE POLICY "PosVendaComunicacoes: admin atualiza qualquer registro"
      ON public.pos_venda_comunicacoes FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "PosVendaComunicacoes: usuario pode excluir seus proprios registros"
      ON public.pos_venda_comunicacoes FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaComunicacoes: gestor exclui registros da equipe"
      ON public.pos_venda_comunicacoes FOR DELETE
      USING (public.is_gestor_da_equipe(pos_venda_comunicacoes.usuario_id));
    CREATE POLICY "PosVendaComunicacoes: admin exclui qualquer registro"
      ON public.pos_venda_comunicacoes FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

-- ============================================================
-- 2. PROPOSTAS - REMOVER POLÃCIA PÃšBLICA E CORRIGIR
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='propostas') THEN
    DROP POLICY IF EXISTS "Users can view their proposals" ON public.propostas;
    DROP POLICY IF EXISTS "Public can view proposals by token" ON public.propostas;

    CREATE POLICY "Propostas: usuario pode ver suas proprias propostas"
      ON public.propostas FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Propostas: gestor ve propostas da equipe"
      ON public.propostas FOR SELECT
      USING (public.is_gestor_da_equipe(propostas.usuario_id));
    CREATE POLICY "Propostas: admin ve todas"
      ON public.propostas FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "Propostas: usuario pode inserir para si"
      ON public.propostas FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Propostas: admin pode inserir para terceiro"
      ON public.propostas FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = propostas.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "Propostas: usuario pode atualizar suas proprias propostas"
      ON public.propostas FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Propostas: gestor atualiza propostas da equipe"
      ON public.propostas FOR UPDATE
      USING (public.is_gestor_da_equipe(propostas.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(propostas.usuario_id));
    CREATE POLICY "Propostas: admin atualiza qualquer proposta"
      ON public.propostas FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "Propostas: usuario pode excluir suas proprias propostas"
      ON public.propostas FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Propostas: gestor exclui propostas da equipe"
      ON public.propostas FOR DELETE
      USING (public.is_gestor_da_equipe(propostas.usuario_id));
    CREATE POLICY "Propostas: admin exclui qualquer proposta"
      ON public.propostas FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

-- ============================================================
-- 3. PROPOSTA_EVENTOS - REMOVER INSERT PÃšBLICO
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='proposta_eventos') THEN
    DROP POLICY IF EXISTS "Users can view events for their proposals" ON public.proposta_eventos;
    DROP POLICY IF EXISTS "System can insert proposal events" ON public.proposta_eventos;
    DROP POLICY IF EXISTS "Public can insert proposal events" ON public.proposta_eventos;

    CREATE POLICY "PropostaEventos: usuario pode ver eventos de suas propostas"
      ON public.proposta_eventos FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.propostas p
          WHERE p.id = proposta_eventos.proposta_id AND p.usuario_id = auth.uid()
        )
        OR public.is_admin_safe()
      );
    CREATE POLICY "PropostaEventos: admin pode inserir eventos"
      ON public.proposta_eventos FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (
          SELECT 1 FROM public.propostas p
          WHERE p.id = proposta_eventos.proposta_id
        )
      );
  END IF;
END $$;

-- ============================================================
-- 4. PROPOSTA_FOLLOWUPS
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='proposta_followups') THEN
    DROP POLICY IF EXISTS "Users can view their proposal followups" ON public.proposta_followups;
    DROP POLICY IF EXISTS "Users can insert their proposal followups" ON public.proposta_followups;

    CREATE POLICY "PropostaFollowups: usuario pode ver seus proprios registros"
      ON public.proposta_followups FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "PropostaFollowups: gestor ve registros da equipe"
      ON public.proposta_followups FOR SELECT
      USING (public.is_gestor_da_equipe(proposta_followups.usuario_id));
    CREATE POLICY "PropostaFollowups: admin ve todos"
      ON public.proposta_followups FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "PropostaFollowups: usuario pode inserir para si"
      ON public.proposta_followups FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "PropostaFollowups: admin pode inserir para terceiro"
      ON public.proposta_followups FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = proposta_followups.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "PropostaFollowups: usuario pode atualizar seus proprios registros"
      ON public.proposta_followups FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "PropostaFollowups: gestor atualiza registros da equipe"
      ON public.proposta_followups FOR UPDATE
      USING (public.is_gestor_da_equipe(proposta_followups.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(proposta_followups.usuario_id));
    CREATE POLICY "PropostaFollowups: admin atualiza qualquer registro"
      ON public.proposta_followups FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "PropostaFollowups: usuario pode excluir seus proprios registros"
      ON public.proposta_followups FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "PropostaFollowups: gestor exclui registros da equipe"
      ON public.proposta_followups FOR DELETE
      USING (public.is_gestor_da_equipe(proposta_followups.usuario_id));
    CREATE POLICY "PropostaFollowups: admin exclui qualquer registro"
      ON public.proposta_followups FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

-- ============================================================
-- 5. CREDITOS INVESTIMENTO E TABELAS RELACIONADAS
-- (usuario_id referencia public.profiles, nÃ£o auth.users)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='creditos_investimento') THEN
    DROP POLICY IF EXISTS "Consultor ve seus creditos" ON public.creditos_investimento;
    DROP POLICY IF EXISTS "Consultor cria seus creditos" ON public.creditos_investimento;
    DROP POLICY IF EXISTS "Consultor atualiza seus creditos" ON public.creditos_investimento;

    CREATE POLICY "CreditosInvestimento: usuario pode ver seus proprios registros"
      ON public.creditos_investimento FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "CreditosInvestimento: gestor ve registros da equipe"
      ON public.creditos_investimento FOR SELECT
      USING (public.is_gestor_da_equipe(creditos_investimento.usuario_id));
    CREATE POLICY "CreditosInvestimento: admin ve todos"
      ON public.creditos_investimento FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "CreditosInvestimento: usuario pode inserir para si"
      ON public.creditos_investimento FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "CreditosInvestimento: admin pode inserir para terceiro"
      ON public.creditos_investimento FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = creditos_investimento.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "CreditosInvestimento: usuario pode atualizar seus proprios registros"
      ON public.creditos_investimento FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "CreditosInvestimento: gestor atualiza registros da equipe"
      ON public.creditos_investimento FOR UPDATE
      USING (public.is_gestor_da_equipe(creditos_investimento.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(creditos_investimento.usuario_id));
    CREATE POLICY "CreditosInvestimento: admin atualiza qualquer registro"
      ON public.creditos_investimento FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "CreditosInvestimento: usuario pode excluir seus proprios registros"
      ON public.creditos_investimento FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "CreditosInvestimento: gestor exclui registros da equipe"
      ON public.creditos_investimento FOR DELETE
      USING (public.is_gestor_da_equipe(creditos_investimento.usuario_id));
    CREATE POLICY "CreditosInvestimento: admin exclui qualquer registro"
      ON public.creditos_investimento FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='credito_historico') THEN
    DROP POLICY IF EXISTS "Leio historico dos meus creditos" ON public.credito_historico;

    CREATE POLICY "CreditoHistorico: usuario pode ver historico de seus creditos"
      ON public.credito_historico FOR SELECT
      USING (
        auth.uid() = usuario_id
        OR public.is_gestor_da_equipe(usuario_id)
        OR public.is_admin_safe()
      );
    CREATE POLICY "CreditoHistorico: usuario pode inserir historico"
      ON public.credito_historico FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "CreditoHistorico: admin pode atualizar qualquer registro"
      ON public.credito_historico FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "CreditoHistorico: admin pode excluir qualquer registro"
      ON public.credito_historico FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='credito_tarefas') THEN
    DROP POLICY IF EXISTS "Gerencio minhas tarefas" ON public.credito_tarefas;

    CREATE POLICY "CreditoTarefas: usuario pode gerenciar suas proprias tarefas"
      ON public.credito_tarefas FOR ALL
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "CreditoTarefas: gestor ve tarefas da equipe"
      ON public.credito_tarefas FOR SELECT
      USING (public.is_gestor_da_equipe(credito_tarefas.usuario_id));
    CREATE POLICY "CreditoTarefas: admin ve todas"
      ON public.credito_tarefas FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "CreditoTarefas: admin pode atualizar qualquer tarefa"
      ON public.credito_tarefas FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "CreditoTarefas: admin pode excluir qualquer tarefa"
      ON public.credito_tarefas FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='credito_reunioes') THEN
    DROP POLICY IF EXISTS "Gerencio minhas reunioes" ON public.credito_reunioes;

    CREATE POLICY "CreditoReunioes: usuario pode gerenciar suas proprias reunioes"
      ON public.credito_reunioes FOR ALL
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "CreditoReunioes: gestor ve reunioes da equipe"
      ON public.credito_reunioes FOR SELECT
      USING (public.is_gestor_da_equipe(credito_reunioes.usuario_id));
    CREATE POLICY "CreditoReunioes: admin ve todas"
      ON public.credito_reunioes FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "CreditoReunioes: admin pode atualizar qualquer reuniao"
      ON public.credito_reunioes FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "CreditoReunioes: admin pode excluir qualquer reuniao"
      ON public.credito_reunioes FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='credito_mensagens_registradas') THEN
    DROP POLICY IF EXISTS "Gerencio minhas mensagens" ON public.credito_mensagens_registradas;

    CREATE POLICY "CreditoMensagens: usuario pode gerenciar suas proprias mensagens"
      ON public.credito_mensagens_registradas FOR ALL
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "CreditoMensagens: gestor ve mensagens da equipe"
      ON public.credito_mensagens_registradas FOR SELECT
      USING (public.is_gestor_da_equipe(credito_mensagens_registradas.usuario_id));
    CREATE POLICY "CreditoMensagens: admin ve todas"
      ON public.credito_mensagens_registradas FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "CreditoMensagens: admin pode atualizar qualquer mensagem"
      ON public.credito_mensagens_registradas FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "CreditoMensagens: admin pode excluir qualquer mensagem"
      ON public.credito_mensagens_registradas FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='creditos_simulacoes') THEN
    DROP POLICY IF EXISTS "Gerencio minhas simulacoes" ON public.creditos_simulacoes;

    CREATE POLICY "CreditosSimulacoes: usuario pode gerenciar suas proprias simulacoes"
      ON public.creditos_simulacoes FOR ALL
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "CreditosSimulacoes: gestor ve simulacoes da equipe"
      ON public.creditos_simulacoes FOR SELECT
      USING (public.is_gestor_da_equipe(creditos_simulacoes.usuario_id));
    CREATE POLICY "CreditosSimulacoes: admin ve todas"
      ON public.creditos_simulacoes FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "CreditosSimulacoes: admin pode atualizar qualquer simulacao"
      ON public.creditos_simulacoes FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "CreditosSimulacoes: admin pode excluir qualquer simulacao"
      ON public.creditos_simulacoes FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

-- ============================================================
-- 6. PLAYBOOKS - DADOS DE REFERÃŠNCIA (leitura pÃºblica autenticada)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='playbooks_atendimento') THEN
    DROP POLICY IF EXISTS "Leio playbooks" ON public.playbooks_atendimento;
    CREATE POLICY "Playbooks: usuario autenticado pode ver"
      ON public.playbooks_atendimento FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='playbook_mensagens') THEN
    DROP POLICY IF EXISTS "Leio mensagens do playbook" ON public.playbook_mensagens;
    CREATE POLICY "PlaybookMensagens: usuario autenticado pode ver ativas"
      ON public.playbook_mensagens FOR SELECT
      USING (auth.role() = 'authenticated' AND ativo = true);
  END IF;
END $$;

-- ============================================================
-- 7. TABELAS LIVE - CORRIGIR public.is_admin() â†’ public.is_admin_safe()
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='live_presentes_categorias') THEN
    DROP POLICY IF EXISTS "Autenticados veem categorias ativas" ON public.live_presentes_categorias;
    DROP POLICY IF EXISTS "Somente admin gerencia categorias" ON public.live_presentes_categorias;

    CREATE POLICY "LivePresentesCategorias: autenticados veem ativas"
      ON public.live_presentes_categorias FOR SELECT
      USING (auth.role() = 'authenticated' AND (ativo = TRUE OR public.is_admin_safe()));
    CREATE POLICY "LivePresentesCategorias: somente admin gerencia"
      ON public.live_presentes_categorias FOR ALL
      USING (auth.role() = 'authenticated' AND public.is_admin_safe())
      WITH CHECK (auth.role() = 'authenticated' AND public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='live_presentes_subcategorias') THEN
    DROP POLICY IF EXISTS "Autenticados veem subcategorias ativas" ON public.live_presentes_subcategorias;
    DROP POLICY IF EXISTS "Somente admin gerencia subcategorias" ON public.live_presentes_subcategorias;

    CREATE POLICY "LivePresentesSubcategorias: autenticados veem ativas"
      ON public.live_presentes_subcategorias FOR SELECT
      USING (auth.role() = 'authenticated' AND (ativo = TRUE OR public.is_admin_safe()));
    CREATE POLICY "LivePresentesSubcategorias: somente admin gerencia"
      ON public.live_presentes_subcategorias FOR ALL
      USING (auth.role() = 'authenticated' AND public.is_admin_safe())
      WITH CHECK (auth.role() = 'authenticated' AND public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='live_presentes') THEN
    DROP POLICY IF EXISTS "Autenticados veem presentes ativos" ON public.live_presentes;
    DROP POLICY IF EXISTS "Somente admin gerencia presentes" ON public.live_presentes;

    CREATE POLICY "LivePresentes: autenticados veem ativos"
      ON public.live_presentes FOR SELECT
      USING (auth.role() = 'authenticated' AND (ativo = TRUE OR public.is_admin_safe()));
    CREATE POLICY "LivePresentes: somente admin gerencia"
      ON public.live_presentes FOR ALL
      USING (auth.role() = 'authenticated' AND public.is_admin_safe())
      WITH CHECK (auth.role() = 'authenticated' AND public.is_admin_safe());
  END IF;
END $$;

-- ============================================================
-- 8. TICKER_MESSAGES - REMOVER GRANTS P/ ANON
-- ============================================================
-- A tabela ticker_messages e usada apenas por usuarios autenticados
-- (dashboard, negociacoes, mensagens-dinamicas). O frontend acessa via
-- createClient() (autenticado), nunca via anon. Os grants SQL a 'anon'
-- concedidos pela migration 20260913000004 sao um risco residual e
-- sao revogados aqui. As policies RLS ja restringem o acesso.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ticker_messages') THEN
    REVOKE ALL ON public.ticker_messages FROM anon;
  END IF;
END $$;

-- ============================================================
-- 9. TRIGGERS PARA TABELAS RESTANTES (usuario_id NOT NULL)
-- ============================================================
DO $$
BEGIN
  -- Clientes (jÃ¡ pode ter triggers da migration anterior, mas garante idempotÃªncia)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clientes') THEN
    DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.clientes;
    CREATE TRIGGER trg_prohibit_usuario_id_change
      BEFORE UPDATE ON public.clientes
      FOR EACH ROW
      EXECUTE FUNCTION public.prohibit_usuario_id_change();

    DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.clientes;
    CREATE TRIGGER trg_validate_admin_insert
      BEFORE INSERT ON public.clientes
      FOR EACH ROW
      EXECUTE FUNCTION public.validate_admin_insert();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='leads') THEN
    -- Leads pode nÃ£o ter usuario_id; o trigger validate_admin_insert referencia NEW.usuario_id
    -- que causaria erro se a coluna nÃ£o existir. Apenas adiciona se a coluna existir.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='leads' AND column_name='usuario_id'
    ) THEN
      DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.leads;
      CREATE TRIGGER trg_prohibit_usuario_id_change
        BEFORE UPDATE ON public.leads
        FOR EACH ROW
        EXECUTE FUNCTION public.prohibit_usuario_id_change();

      DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.leads;
      CREATE TRIGGER trg_validate_admin_insert
        BEFORE INSERT ON public.leads
        FOR EACH ROW
        EXECUTE FUNCTION public.validate_admin_insert();
    END IF;
  END IF;
END $$;

-- Aplicar triggers nas demais tabelas com usuario_id que ainda nÃ£o tÃªm
-- Verifica existÃªncia da tabela e da coluna usuario_id antes de criar triggers
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN (
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public'
      AND table_name IN (
        'indicadores','agenda_eventos','negociacoes','cobrancas','pos_venda',
        'recrutamento','parceiros','comissoes_indicadores','contatos_indicados',
        'cliente_contatos','cliente_historico','negociacao_historico','anexos',
        'whatsapp_mensagens','assembleias','assembleia_avisos','assembleia_historico',
        'loteria_federal','lances','contemplacoes','contemplacao_historico',
        'materiais_consultores','treinamentos','links_uteis','comunicacoes',
        'comunicacao_templates','indicador_historico','cobranca_historico',
        'lead_historico','lead_anexos','agenda_tarefas','agenda_followups',
        'pos_venda_historico','pos_venda_tarefas','pos_venda_comunicacoes',
        'propostas','proposta_followups','creditos_investimento','credito_historico',
        'credito_tarefas','credito_reunioes','credito_mensagens_registradas',
        'creditos_simulacoes','pastas','pasta_itens','prospeccao_historico',
        'user_permission_grants','user_evolution_history','metas'
      )
  ) LOOP
    -- Criar trigger prohibit_usuario_id_change apenas se a coluna usuario_id existir
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name = tbl.table_name
        AND column_name = 'usuario_id'
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.%I', tbl.table_name);
      EXECUTE format('CREATE TRIGGER trg_prohibit_usuario_id_change
        BEFORE UPDATE ON public.%I
        FOR EACH ROW
        EXECUTE FUNCTION public.prohibit_usuario_id_change()', tbl.table_name);
    END IF;

    -- Criar trigger validate_admin_insert apenas se a coluna usuario_id existir
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name = tbl.table_name
        AND column_name = 'usuario_id'
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.%I', tbl.table_name);
      EXECUTE format('CREATE TRIGGER trg_validate_admin_insert
        BEFORE INSERT ON public.%I
        FOR EACH ROW
        EXECUTE FUNCTION public.validate_admin_insert()', tbl.table_name);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 9. PASTAS, PASTA_ITENS, PROSPECCAO_HISTORICO - POLÃTICAS RLS
-- Tabelas com usuario_id, sem seÃ§Ã£o individual na migration anterior.
-- Seguem o padrÃ£o proprietÃ¡rio + gestor da equipe + admin.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pastas') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their pastas" ON public.pastas;
    DROP POLICY IF EXISTS "Authenticated users can insert their pastas" ON public.pastas;
    DROP POLICY IF EXISTS "Authenticated users can update their pastas" ON public.pastas;
    DROP POLICY IF EXISTS "Authenticated users can delete their pastas" ON public.pastas;

    CREATE POLICY "Pastas: usuario pode ver suas proprias pastas"
      ON public.pastas FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Pastas: gestor ve pastas da equipe"
      ON public.pastas FOR SELECT
      USING (public.is_gestor_da_equipe(pastas.usuario_id));
    CREATE POLICY "Pastas: admin ve todas as pastas"
      ON public.pastas FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "Pastas: usuario pode inserir sua propria pasta"
      ON public.pastas FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Pastas: admin pode inserir pasta para terceiro"
      ON public.pastas FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = pastas.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "Pastas: usuario pode atualizar suas proprias pastas"
      ON public.pastas FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Pastas: gestor atualiza pastas da equipe"
      ON public.pastas FOR UPDATE
      USING (public.is_gestor_da_equipe(pastas.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(pastas.usuario_id));
    CREATE POLICY "Pastas: admin atualiza qualquer pasta"
      ON public.pastas FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "Pastas: usuario pode excluir suas proprias pastas"
      ON public.pastas FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Pastas: gestor exclui pastas da equipe"
      ON public.pastas FOR DELETE
      USING (public.is_gestor_da_equipe(pastas.usuario_id));
    CREATE POLICY "Pastas: admin exclui qualquer pasta"
      ON public.pastas FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pasta_itens') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their pasta itens" ON public.pasta_itens;
    DROP POLICY IF EXISTS "Authenticated users can insert their pasta itens" ON public.pasta_itens;
    DROP POLICY IF EXISTS "Authenticated users can update their pasta itens" ON public.pasta_itens;
    DROP POLICY IF EXISTS "Authenticated users can delete their pasta itens" ON public.pasta_itens;

    CREATE POLICY "PastaItens: usuario pode ver seus proprios itens"
      ON public.pasta_itens FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "PastaItens: gestor ve itens da equipe"
      ON public.pasta_itens FOR SELECT
      USING (public.is_gestor_da_equipe(pasta_itens.usuario_id));
    CREATE POLICY "PastaItens: admin ve todos os itens"
      ON public.pasta_itens FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "PastaItens: usuario pode inserir seu proprio item"
      ON public.pasta_itens FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "PastaItens: admin pode inserir item para terceiro"
      ON public.pasta_itens FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = pasta_itens.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "PastaItens: usuario pode atualizar seus proprios itens"
      ON public.pasta_itens FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "PastaItens: gestor atualiza itens da equipe"
      ON public.pasta_itens FOR UPDATE
      USING (public.is_gestor_da_equipe(pasta_itens.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(pasta_itens.usuario_id));
    CREATE POLICY "PastaItens: admin atualiza qualquer item"
      ON public.pasta_itens FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "PastaItens: usuario pode excluir seus proprios itens"
      ON public.pasta_itens FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "PastaItens: gestor exclui itens da equipe"
      ON public.pasta_itens FOR DELETE
      USING (public.is_gestor_da_equipe(pasta_itens.usuario_id));
    CREATE POLICY "PastaItens: admin exclui qualquer item"
      ON public.pasta_itens FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='prospeccao_historico') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their prospeccao historico" ON public.prospeccao_historico;
    DROP POLICY IF EXISTS "Authenticated users can insert their prospeccao historico" ON public.prospeccao_historico;
    DROP POLICY IF EXISTS "Authenticated users can update their prospeccao historico" ON public.prospeccao_historico;
    DROP POLICY IF EXISTS "Authenticated users can delete their prospeccao historico" ON public.prospeccao_historico;

    CREATE POLICY "ProspeccaoHistorico: usuario pode ver seu proprio historico"
      ON public.prospeccao_historico FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ProspeccaoHistorico: gestor ve historico da equipe"
      ON public.prospeccao_historico FOR SELECT
      USING (public.is_gestor_da_equipe(prospeccao_historico.usuario_id));
    CREATE POLICY "ProspeccaoHistorico: admin ve todo o historico"
      ON public.prospeccao_historico FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "ProspeccaoHistorico: usuario pode inserir seu proprio historico"
      ON public.prospeccao_historico FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ProspeccaoHistorico: admin pode inserir historico para terceiro"
      ON public.prospeccao_historico FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = prospeccao_historico.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "ProspeccaoHistorico: usuario pode atualizar seu proprio historico"
      ON public.prospeccao_historico FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ProspeccaoHistorico: gestor atualiza historico da equipe"
      ON public.prospeccao_historico FOR UPDATE
      USING (public.is_gestor_da_equipe(prospeccao_historico.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(prospeccao_historico.usuario_id));
    CREATE POLICY "ProspeccaoHistorico: admin atualiza qualquer historico"
      ON public.prospeccao_historico FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "ProspeccaoHistorico: usuario pode excluir seu proprio historico"
      ON public.prospeccao_historico FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ProspeccaoHistorico: gestor exclui historico da equipe"
      ON public.prospeccao_historico FOR DELETE
      USING (public.is_gestor_da_equipe(prospeccao_historico.usuario_id));
    CREATE POLICY "ProspeccaoHistorico: admin exclui qualquer historico"
      ON public.prospeccao_historico FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

-- ============================================================
-- 10. PERMISSION_PRESETS / PRESET_ITEMS - USAR is_admin_safe()
-- As policies da Migration 1 usam profiles.perfil = 'Administrador'
-- sem checar ativo. Substituir por is_admin_safe() (jÃ¡ existe na Migration 3).
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='permission_presets') THEN
    DROP POLICY IF EXISTS "Only admins can insert permission presets" ON public.permission_presets;
    CREATE POLICY "Only admins can insert permission presets"
      ON public.permission_presets FOR INSERT
      WITH CHECK (
        auth.role() = 'authenticated'
        AND public.is_admin_safe()
      );

    DROP POLICY IF EXISTS "Only admins can update permission presets" ON public.permission_presets;
    CREATE POLICY "Only admins can update permission presets"
      ON public.permission_presets FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());

    DROP POLICY IF EXISTS "Only admins can delete permission presets" ON public.permission_presets;
    CREATE POLICY "Only admins can delete permission presets"
      ON public.permission_presets FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='permission_preset_items') THEN
    DROP POLICY IF EXISTS "Only admins can insert permission preset items" ON public.permission_preset_items;
    CREATE POLICY "Only admins can insert permission preset items"
      ON public.permission_preset_items FOR INSERT
      WITH CHECK (
        auth.role() = 'authenticated'
        AND public.is_admin_safe()
      );

    DROP POLICY IF EXISTS "Only admins can update permission preset items" ON public.permission_preset_items;
    CREATE POLICY "Only admins can update permission preset items"
      ON public.permission_preset_items FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());

    DROP POLICY IF EXISTS "Only admins can delete permission preset items" ON public.permission_preset_items;
    CREATE POLICY "Only admins can delete permission preset items"
      ON public.permission_preset_items FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

COMMIT;

-- ============================================================

-- 20261118000001  (20261118000001_create_pessoas_identidade.sql)
-- ============================================================
-- Migration: 20261118000001_create_pessoas_identidade.sql
-- Objetivo: Criar estrutura central de identidade (pessoas) e vinculos (pessoa_vinculos).
-- Principio: UUID central, integridade referencial, prevencao de duplicatas, RLS por cargo.
--           Nao alterar migrations historicas. Nao DROP CASCADE. Preservar dados existentes.
-- Compatibilidade: 10 perfis oficiais. Nao mesclar pessoas automaticamente.

BEGIN;

-- ============================================================
-- 1. TABELA pessoas â€” identidade central da pessoa
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pessoas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cpf_cnpj TEXT,
  cidade TEXT,
  estado TEXT,
  observacoes TEXT,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pessoas_usuario_id ON public.pessoas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pessoas_email ON public.pessoas(email);

-- ============================================================
-- 2. TABELA pessoa_vinculos â€” vinculos com entidades existentes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pessoa_vinculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  tipo_entidade TEXT NOT NULL CHECK (tipo_entidade IN ('cliente', 'lead', 'indicador', 'recrutamento')),
  entidade_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pessoa_id, tipo_entidade, entidade_id)
);

CREATE INDEX IF NOT EXISTS idx_pessoa_vinculos_pessoa_id ON public.pessoa_vinculos(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_pessoa_vinculos_entidade ON public.pessoa_vinculos(tipo_entidade, entidade_id);

-- ============================================================
-- 3. RLS â€” pessoas
-- ============================================================

ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;

-- SELECT: usuario ve proprias pessoas ou admin/gestor ve equipe
CREATE POLICY "Pessoas: usuario ve proprias" ON public.pessoas FOR SELECT
  USING (usuario_id = auth.uid() OR public.is_admin_safe());

CREATE POLICY "Pessoas: gestor ve equipe" ON public.pessoas FOR SELECT
  USING (public.is_gestor_da_equipe(usuario_id));

-- INSERT: usuario cria para si, admin para terceiro
CREATE POLICY "Pessoas: usuario insere para si" ON public.pessoas FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Pessoas: admin insere para terceiro" ON public.pessoas FOR INSERT
  WITH CHECK (public.is_admin_safe());

-- UPDATE: usuario atualiza proprias, admin atualiza qualquer
CREATE POLICY "Pessoas: usuario atualiza proprias" ON public.pessoas FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Pessoas: admin atualiza qualquer" ON public.pessoas FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

-- DELETE: admin exclui
CREATE POLICY "Pessoas: admin exclui" ON public.pessoas FOR DELETE
  USING (public.is_admin_safe());

-- ============================================================
-- 4. RLS â€” pessoa_vinculos
-- ============================================================

ALTER TABLE public.pessoa_vinculos ENABLE ROW LEVEL SECURITY;

-- SELECT: via pessoa (usuario da pessoa ou admin/gestor)
CREATE POLICY "Vinculos: usuario ve proprios" ON public.pessoa_vinculos FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.pessoas p WHERE p.id = pessoa_vinculos.pessoa_id AND p.usuario_id = auth.uid())
    OR public.is_admin_safe()
  );

CREATE POLICY "Vinculos: gestor ve equipe" ON public.pessoa_vinculos FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.pessoas p WHERE p.id = pessoa_vinculos.pessoa_id AND public.is_gestor_da_equipe(p.usuario_id))
  );

-- INSERT: usuario cria vinculo para pessoa propria, admin para terceiro
CREATE POLICY "Vinculos: usuario insere" ON public.pessoa_vinculos FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pessoas p WHERE p.id = pessoa_vinculos.pessoa_id AND p.usuario_id = auth.uid())
  );

CREATE POLICY "Vinculos: admin insere" ON public.pessoa_vinculos FOR INSERT
  WITH CHECK (public.is_admin_safe());

-- DELETE: admin exclui
CREATE POLICY "Vinculos: admin exclui" ON public.pessoa_vinculos FOR DELETE
  USING (public.is_admin_safe());

COMMIT;

-- ============================================================

-- 20261118000002  (20261118000002_create_jornadas.sql)
-- ============================================================
-- Migration: 20261118000002_create_jornadas.sql
-- Objetivo: Criar tabelas para as tres jornadas independentes (comercial, indicador, recrutamento).
-- Principio: FK para pessoas (identidade central) e vÃ­nculos. RLS por cargo. Historico e reunioes.
-- Compatibilidade: 10 perfis oficiais. Nao alterar migrations historicas.

BEGIN;

-- ============================================================
-- 1. TABELA jornadas
-- ============================================================

CREATE TABLE IF NOT EXISTS public.jornadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID REFERENCES public.pessoas(id) ON DELETE SET NULL,
  contato_id TEXT NOT NULL,
  contato_tipo TEXT NOT NULL CHECK (contato_tipo IN ('cliente', 'lead')),
  jornada_tipo TEXT NOT NULL CHECK (jornada_tipo IN ('cliente', 'indicador', 'recrutamento')),
  ativa BOOLEAN NOT NULL DEFAULT FALSE,
  etapa TEXT,
  iniciada_em TIMESTAMPTZ,
  encerrada_em TIMESTAMPTZ,
  responsavel TEXT,
  observacoes TEXT,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pessoa_id, jornada_tipo)
);

CREATE INDEX IF NOT EXISTS idx_jornadas_pessoa_id ON public.jornadas(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_jornadas_contato ON public.jornadas(contato_tipo, contato_id);
CREATE INDEX IF NOT EXISTS idx_jornadas_usuario_id ON public.jornadas(usuario_id);

-- ============================================================
-- 2. TABELA jornada_historico
-- ============================================================

CREATE TABLE IF NOT EXISTS public.jornada_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id UUID NOT NULL REFERENCES public.jornadas(id) ON DELETE CASCADE,
  etapa TEXT NOT NULL,
  data TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responsavel TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jornada_historico_jornada_id ON public.jornada_historico(jornada_id);

-- ============================================================
-- 3. TABELA jornada_reunioes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.jornada_reunioes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id UUID NOT NULL REFERENCES public.jornadas(id) ON DELETE CASCADE,
  data TIMESTAMPTZ NOT NULL,
  resultado TEXT NOT NULL CHECK (resultado IN ('positivo', 'neutro', 'negativo')),
  oportunidades TEXT[],
  observacoes TEXT,
  responsavel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jornada_reunioes_jornada_id ON public.jornada_reunioes(jornada_id);

-- ============================================================
-- 4. RLS â€” jornadas
-- ============================================================

ALTER TABLE public.jornadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jornadas: usuario ve proprias" ON public.jornadas FOR SELECT
  USING (usuario_id = auth.uid() OR public.is_admin_safe());

CREATE POLICY "Jornadas: gestor ve equipe" ON public.jornadas FOR SELECT
  USING (public.is_gestor_da_equipe(usuario_id));

CREATE POLICY "Jornadas: usuario insere para si" ON public.jornadas FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Jornadas: admin insere para terceiro" ON public.jornadas FOR INSERT
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Jornadas: usuario atualiza proprias" ON public.jornadas FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Jornadas: admin atualiza qualquer" ON public.jornadas FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Jornadas: admin exclui" ON public.jornadas FOR DELETE
  USING (public.is_admin_safe());

-- ============================================================
-- 5. RLS â€” jornada_historico
-- ============================================================

ALTER TABLE public.jornada_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "JornadaHistorico: usuario ve proprios" ON public.jornada_historico FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_historico.jornada_id AND j.usuario_id = auth.uid())
    OR public.is_admin_safe()
  );

CREATE POLICY "JornadaHistorico: gestor ve equipe" ON public.jornada_historico FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_historico.jornada_id AND public.is_gestor_da_equipe(j.usuario_id))
  );

CREATE POLICY "JornadaHistorico: usuario insere" ON public.jornada_historico FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_historico.jornada_id AND j.usuario_id = auth.uid())
  );

CREATE POLICY "JornadaHistorico: admin insere" ON public.jornada_historico FOR INSERT
  WITH CHECK (public.is_admin_safe());

-- ============================================================
-- 6. RLS â€” jornada_reunioes
-- ============================================================

ALTER TABLE public.jornada_reunioes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "JornadaReunioes: usuario ve proprias" ON public.jornada_reunioes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_reunioes.jornada_id AND j.usuario_id = auth.uid())
    OR public.is_admin_safe()
  );

CREATE POLICY "JornadaReunioes: gestor ve equipe" ON public.jornada_reunioes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_reunioes.jornada_id AND public.is_gestor_da_equipe(j.usuario_id))
  );

CREATE POLICY "JornadaReunioes: usuario insere" ON public.jornada_reunioes FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_reunioes.jornada_id AND j.usuario_id = auth.uid())
  );

CREATE POLICY "JornadaReunioes: admin insere" ON public.jornada_reunioes FOR INSERT
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "JornadaReunioes: usuario atualiza proprias" ON public.jornada_reunioes FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_reunioes.jornada_id AND j.usuario_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_reunioes.jornada_id AND j.usuario_id = auth.uid())
  );

CREATE POLICY "JornadaReunioes: admin atualiza qualquer" ON public.jornada_reunioes FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

COMMIT;

-- ============================================================

-- 20261121000002  (20261121000002_fix_rls_recursao_policies.sql)
-- ============================================================
-- Migration: 20261121000002_fix_rls_recursao_policies.sql
-- Corrige recursÃ£o RLS (42P17) causada por policies duplicadas que consultam
-- profiles diretamente via EXISTS, criando referÃªncia circular.
-- MantÃ©m apenas as policies que usam funÃ§Ãµes SECURITY DEFINER (is_admin_safe,
-- is_gestor_da_equipe) que bypassam RLS e nÃ£o geram recursÃ£o.

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
-- que causava recursÃ£o. is_gestor_da_equipe jÃ¡ Ã© SECURITY DEFINER e cobre a lÃ³gica.
DROP POLICY IF EXISTS "Profiles: gestor ve perfis da equipe" ON public.profiles;
CREATE POLICY "Profiles: gestor ve perfis da equipe" ON public.profiles
  FOR SELECT USING (is_gestor_da_equipe(id));

-- === PROFILES: remover policy antiga "Profiles: usuario pode ver o proprio perfil"
-- que mistura uid() = id com is_admin_safe() (ambos OK, mas redundante com as novas).
-- Mantida pois Ã© necessÃ¡ria para o usuÃ¡rio ver o prÃ³prio perfil.

COMMIT;

-- ============================================================

-- 20261121000003  (20261121000003_fix_policies_inline_profiles_funcoes.sql)
-- ============================================================
-- Migration: 20261121000003_fix_policies_inline_profiles_funcoes.sql
-- Objetivo: corrigir a CAUSA ESTRUTURAL das policies que consultam `profiles`
-- diretamente (subquery inline). Essas subqueries, embora hoje nÃ£o gerem
-- recursÃ£o (as policies de profiles usam apenas funÃ§Ãµes SECURITY DEFINER),
-- representam risco estrutural de recursÃ£o 42P17 e avaliam RLS aninhada.
--
-- Esta migration substitui, ONDE A EQUIVALÃŠNCIA ESTÃ COMPROVADA, as subqueries
-- inline por funÃ§Ãµes auxiliares SECURITY DEFINER (bypassam RLS):
--   * (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
--             AND profiles.perfil = 'Administrador'))
--       => public.is_admin_perfil()
--   * (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
--             AND profiles.perfil IN ('Administrador','Gestor')))
--       => public.is_gestor_ou_admin_perfil()
--
-- Prova de equivalÃªncia: a Ãºnica linha de `profiles` pertinente/visÃ­vel ao
-- chamador Ã© a prÃ³pria linha (profiles.id = auth.uid()), pois a condiÃ§Ã£o do
-- sub-select exige profiles.id = auth.uid(). Logo, o valor booleano Ã© idÃªntico
-- ao de SELECT ... FROM profiles WHERE id = auth.uid() [AND perfil ...].
-- Nenhuma permissÃ£o Ã© ampliada ou reduzida; o comportamento Ã© preservado.
--
-- SÃ£o preservadas intactas as policies de semÃ¢ntica DIFERENTE:
--   * "X: admin pode inserir para terceiro" (WITH CHECK is_admin_safe() AND
--     EXISTS(SELECT 1 FROM profiles p WHERE p.id = X.usuario_id AND p.ativo))
--   * "Gestors can view team metas" (hierarchy via metas.usuario_id/gestor_id)
--   * Demais policies que jÃ¡ usam is_admin_safe()/is_gestor_da_equipe().

BEGIN;

-- Garante que pg_get_expr qualifique auth.uid() como "auth.uid()" (e nÃ£o "uid()")
-- durante o deparse, independentemente do search_path do papel executor.
SET LOCAL search_path TO "$user", public;

CREATE OR REPLACE FUNCTION public.is_admin_perfil()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND perfil = 'Administrador'
  );
$fn$;

CREATE OR REPLACE FUNCTION public.is_gestor_ou_admin_perfil()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND perfil IN ('Administrador','Gestor')
  );
$fn$;

REVOKE ALL ON FUNCTION public.is_admin_perfil() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_gestor_ou_admin_perfil() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_perfil() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_gestor_ou_admin_perfil() TO anon, authenticated, service_role;

DO $do$
DECLARE
  pat_a CONSTANT TEXT := '(EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.perfil = ''Administrador''::text))))';
  pat_b CONSTANT TEXT := '(EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.perfil = ANY (ARRAY[''Administrador''::text, ''Gestor''::text])))))';
  r RECORD;
  v_noq TEXT; v_nowc TEXT; v_nq TEXT; v_nwc TEXT;
  v_cmd TEXT; v_using TEXT; v_check TEXT; v_sql TEXT;
  v_changed BOOLEAN;
  n INT := 0;
BEGIN
  FOR r IN
    SELECT p.polrelid, p.polname, p.polcmd,
           nsp.nspname, c.relname,
           pg_get_expr(p.polqual, p.polrelid)      AS oq,
           pg_get_expr(p.polwithcheck, p.polrelid) AS owc
    FROM pg_policy p
    JOIN pg_class c    ON c.oid = p.polrelid
    JOIN pg_namespace nsp ON nsp.oid = c.relnamespace
    WHERE nsp.nspname = 'public'
  LOOP
    v_noq  := CASE WHEN r.oq  IS NULL THEN NULL ELSE regexp_replace(r.oq,  '\s+', ' ', 'g') END;
    v_nowc := CASE WHEN r.owc IS NULL THEN NULL ELSE regexp_replace(r.owc, '\s+', ' ', 'g') END;

    v_changed :=
         (v_noq  IS NOT NULL AND (position(pat_a in v_noq)  > 0 OR position(pat_b in v_noq)  > 0))
      OR (v_nowc IS NOT NULL AND (position(pat_a in v_nowc) > 0 OR position(pat_b in v_nowc) > 0));

    IF NOT v_changed THEN
      CONTINUE;
    END IF;

    v_nq  := CASE WHEN v_noq  IS NULL THEN NULL
                  ELSE replace(replace(v_noq,  pat_a, 'is_admin_perfil()'), pat_b, 'is_gestor_ou_admin_perfil()') END;
    v_nwc := CASE WHEN v_nowc IS NULL THEN NULL
                  ELSE replace(replace(v_nowc, pat_a, 'is_admin_perfil()'), pat_b, 'is_gestor_ou_admin_perfil()') END;

    v_cmd := CASE r.polcmd
               WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
               WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE'
               WHEN '*' THEN 'ALL' END;
    v_using := CASE WHEN v_nq  IS NULL THEN '' ELSE ' USING (' || v_nq  || ')' END;
    v_check := CASE WHEN v_nwc IS NULL THEN '' ELSE ' WITH CHECK (' || v_nwc || ')' END;

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.polname, r.nspname, r.relname);
    v_sql := format('CREATE POLICY %I ON %I.%I FOR %s%s%s',
                    r.polname, r.nspname, r.relname, v_cmd, v_using, v_check);
    EXECUTE v_sql;
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'Policies reescritas com funcoes auxiliares: %', n;
END
$do$;

COMMIT;

-- ============================================================

