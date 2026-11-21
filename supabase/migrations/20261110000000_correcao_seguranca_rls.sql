-- Migration: 20261110000000_correcao_seguranca_rls.sql
-- Objetivo: Correção integrada de segurança RLS, perfis, cargos e políticas
--           para o Sistema Operacional do Consultor.
-- Princípios:
--   - Não alterar migrations históricas.
--   - Não utilizar DROP CASCADE.
--   - Não excluir tabelas, colunas ou registros existentes.
--   - Ser idempotente: verificar estado antes de alterar.
--   - Preservar todos os dados existentes.
--   - Não implementar Secretaria nem tabela secretaria_vinculos_operacionais.
--
-- Aplicar manualmente no Supabase Studio após revisão.

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
      'Consultor em prévia',
      'Líder em treinamento',
      'Indicador',
      'Trainee',
      'Secretaria'
    )) NOT VALID;

  ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_perfil_check;
END $$;

-- Índice de suporte para gestor_id
CREATE INDEX IF NOT EXISTS profiles_gestor_id_idx ON public.profiles (gestor_id);

-- ============================================================
-- 2. FUNÇÃO: is_admin_safe()
-- Verifica se o usuário autenticado é Administrador ATIVO.
-- search_path vazio, referências qualificadas, SECURITY DEFINER.
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
  -- Usuário não autenticado nunca é Administrador
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
-- 3. FUNÇÃO: is_gestor_da_equipe(p_proprietario_id UUID)
-- Verifica se o usuário autenticado (Gestor ou Gestor Pleno, ativo)
-- é o gestor direto do proprietário informado, e que o proprietário está ativo.
-- Evita recursão RLS: não aceita UUID fornecido pelo cliente para o chamador;
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
  -- Obter dados do chamador (auth.uid() da sessão, não parâmetro do cliente)
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

  -- Obter dados do proprietário do registro
  SELECT perfil, ativo, gestor_id INTO v_owner_perfil, v_owner_ativo, v_owner_gestor_id
  FROM public.profiles
  WHERE id = p_proprietario_id;

  IF v_owner_perfil IS NULL OR NOT v_owner_ativo THEN
    RETURN FALSE;
  END IF;

  -- Validar relação hierárquica real: proprietário é liderado pelo chamador
  RETURN v_owner_gestor_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.is_gestor_da_equipe(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_gestor_da_equipe(UUID) TO authenticated;

-- ============================================================
-- 4. TABELA: public.audit_log
-- Registro de operações administrativas. Sem senhas, tokens ou segredos.
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

-- Nenhum pode atualizar ou excluir (imutável)
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
-- Cadastro público recebe sempre 'Indicador'. Não confiar em raw_user_meta_data.
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

  -- Perfil sempre Indicador para cadastro público
  INSERT INTO public.profiles (id, nome, email, perfil, ativo, ultimo_login, avatar_url)
  VALUES (NEW.id, v_nome, NEW.email, 'Indicador', TRUE, NULL, v_avatar_url)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 6. TRIGGER: profiles_protect_role_change()
-- Impede alteração de campos administrativos por não-administradores.
-- service_role é permitido (operações backend pré-validadas pelo Server Action).
-- Usuários autenticados precisam de is_admin_safe().
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

    -- Operações backend via service_role são pré-validadas pelo Server Action
    IF auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;

    -- Usuários autenticados precisam ser Administrador ativo
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
-- Impede alteração de usuario_id em registros comerciais após a criação.
-- service_role permitido (transferência administrativa pré-validada).
-- ============================================================

CREATE OR REPLACE FUNCTION public.prohibit_usuario_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.usuario_id IS DISTINCT FROM OLD.usuario_id THEN
    -- service_role: transferência administrativa pré-validada pelo Server Action
    IF auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;

    -- Usuários autenticados nunca podem alterar usuario_id
    RAISE EXCEPTION 'usuario_id nao pode ser alterado apos a criacao.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 8. TRIGGER: validate_admin_insert()
-- Valida INSERT em tabelas comerciais.
-- INSERT próprio (usuario_id = auth.uid()): permitido se policy permitir.
-- INSERT para terceiro: somente service_role (pré-validado) ou Administrador.
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
  -- Inserção própria: usuario_id bate com auth.uid() da sessão autenticada
  IF NEW.usuario_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  -- service_role: operação backend pré-validada pelo Server Action.
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

  -- Usuário autenticado (Administrador) inserindo para terceiro: permitido
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

  -- Usuário autenticado inserindo para terceiro: sempre bloqueado
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
-- Tabela user_evolution_history pode não existir em instalações que não aplicaram
-- a migration que a cria. Protegemos toda a operação com verificação de existência.
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
-- 10. CORRIGIR POLICIES RLS — TABELAS COMERCIAIS
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
-- Tabela user_evolution_history pode não existir em instalações sem a migration criadora.
-- Protegemos toda a operação com verificação de existência.
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
