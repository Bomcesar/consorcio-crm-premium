-- Script definitivo: remove recursão em profiles de TODAS as tabelas

-- ==========================================
-- 1. CORRIGE PROFILES
-- ==========================================

-- Remove TODAS as policies de profiles
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins and gestors can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins and gestors can update all profiles" ON public.profiles;

-- Recria policies BÁSICAS sem recursão
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = id);

-- ==========================================
-- 2. REMOVE POLICIES DE ADMIN/GESTOR DE TODAS AS TABELAS
-- ==========================================

-- Leads
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can update any lead" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete any lead" ON public.leads;
DROP POLICY IF EXISTS "Gestors can view team leads" ON public.leads;
DROP POLICY IF EXISTS "Gestors can update team leads" ON public.leads;
DROP POLICY IF EXISTS "Gestors can delete team leads" ON public.leads;

-- Clientes
DROP POLICY IF EXISTS "Admins can view all clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can update any cliente" ON public.clientes;
DROP POLICY IF EXISTS "Admins can delete any cliente" ON public.clientes;
DROP POLICY IF EXISTS "Gestors can view team clientes" ON public.clientes;
DROP POLICY IF EXISTS "Gestors can update team clientes" ON public.clientes;
DROP POLICY IF EXISTS "Gestors can delete team clientes" ON public.clientes;

-- Negociacoes
DROP POLICY IF EXISTS "Admins can view all negociacoes" ON public.negociacoes;
DROP POLICY IF EXISTS "Admins can update any negociacao" ON public.negociacoes;
DROP POLICY IF EXISTS "Admins can delete any negociacao" ON public.negociacoes;
DROP POLICY IF EXISTS "Gestors can view team negociacoes" ON public.negociacoes;
DROP POLICY IF EXISTS "Gestors can update team negociacoes" ON public.negociacoes;
DROP POLICY IF EXISTS "Gestors can delete team negociacoes" ON public.negociacoes;

-- Cobrancas
DROP POLICY IF EXISTS "Admins can view all cobrancas" ON public.cobrancas;
DROP POLICY IF EXISTS "Admins can update any cobranca" ON public.cobrancas;
DROP POLICY IF EXISTS "Admins can delete any cobranca" ON public.cobrancas;
DROP POLICY IF EXISTS "Gestors can view team cobrancas" ON public.cobrancas;
DROP POLICY IF EXISTS "Gestors can update team cobrancas" ON public.cobrancas;
DROP POLICY IF EXISTS "Gestors can delete team cobrancas" ON public.cobrancas;

-- Agenda eventos
DROP POLICY IF EXISTS "Admins can view all agenda_eventos" ON public.agenda_eventos;
DROP POLICY IF EXISTS "Admins can update any agenda_evento" ON public.agenda_eventos;
DROP POLICY IF EXISTS "Admins can delete any agenda_evento" ON public.agenda_eventos;
DROP POLICY IF EXISTS "Gestors can view team agenda_eventos" ON public.agenda_eventos;
DROP POLICY IF EXISTS "Gestors can update team agenda_eventos" ON public.agenda_eventos;
DROP POLICY IF EXISTS "Gestors can delete team agenda_eventos" ON public.agenda_eventos;

-- Pos venda
DROP POLICY IF EXISTS "Admins can view all pos_venda" ON public.pos_venda;
DROP POLICY IF EXISTS "Admins can update any pos_venda" ON public.pos_venda;
DROP POLICY IF EXISTS "Admins can delete any pos_venda" ON public.pos_venda;
DROP POLICY IF EXISTS "Gestors can view team pos_venda" ON public.pos_venda;
DROP POLICY IF EXISTS "Gestors can update team pos_venda" ON public.pos_venda;
DROP POLICY IF EXISTS "Gestors can delete team pos_venda" ON public.pos_venda;

-- Recrutamento
DROP POLICY IF EXISTS "Admins can view all recrutamento" ON public.recrutamento;
DROP POLICY IF EXISTS "Admins can update any recrutamento" ON public.recrutamento;
DROP POLICY IF EXISTS "Admins can delete any recrutamento" ON public.recrutamento;
DROP POLICY IF EXISTS "Gestors can view team recrutamento" ON public.recrutamento;
DROP POLICY IF EXISTS "Gestors can update team recrutamento" ON public.recrutamento;
DROP POLICY IF EXISTS "Gestors can delete team recrutamento" ON public.recrutamento;

-- Parceiros
DROP POLICY IF EXISTS "Admins can view all parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "Admins can update any parceiro" ON public.parceiros;
DROP POLICY IF EXISTS "Admins can delete any parceiro" ON public.parceiros;
DROP POLICY IF EXISTS "Gestors can view team parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "Gestors can update team parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "Gestors can delete team parceiros" ON public.parceiros;

-- Indicadores
DROP POLICY IF EXISTS "Admins can view all indicadores" ON public.indicadores;
DROP POLICY IF EXISTS "Admins can update any indicador" ON public.indicadores;
DROP POLICY IF EXISTS "Admins can delete any indicador" ON public.indicadores;
DROP POLICY IF EXISTS "Gestors can view team indicadores" ON public.indicadores;
DROP POLICY IF EXISTS "Gestors can update team indicadores" ON public.indicadores;
DROP POLICY IF EXISTS "Gestors can delete team indicadores" ON public.indicadores;

-- Comissoes indicadores
DROP POLICY IF EXISTS "Admins can view all comissoes" ON public.comissoes_indicadores;
DROP POLICY IF EXISTS "Only admins can delete comissoes" ON public.comissoes_indicadores;
DROP POLICY IF EXISTS "Only admins can insert comissoes" ON public.comissoes_indicadores;
DROP POLICY IF EXISTS "Only admins can update comissoes" ON public.comissoes_indicadores;
DROP POLICY IF EXISTS "Gestors can view team comissoes" ON public.comissoes_indicadores;

-- Metas
DROP POLICY IF EXISTS "Authenticated users can view relevant metas" ON public.metas;
DROP POLICY IF EXISTS "Only admins can delete metas" ON public.metas;
DROP POLICY IF EXISTS "Only admins can insert metas" ON public.metas;
DROP POLICY IF EXISTS "Only admins can update metas" ON public.metas;

-- Links uteis
DROP POLICY IF EXISTS "Authenticated users with admin/gestor can delete their links_uteis" ON public.links_uteis;
DROP POLICY IF EXISTS "Authenticated users with admin/gestor can insert links_uteis" ON public.links_uteis;
DROP POLICY IF EXISTS "Authenticated users with admin/gestor can update their links_uteis" ON public.links_uteis;

-- Materiais consultores
DROP POLICY IF EXISTS "Authenticated users with admin/gestor can delete their materiais_consultores" ON public.materiais_consultores;
DROP POLICY IF EXISTS "Authenticated users with admin/gestor can insert materiais_consultores" ON public.materiais_consultores;
DROP POLICY IF EXISTS "Authenticated users with admin/gestor can update their materiais_consultores" ON public.materiais_consultores;

-- Treinamentos
DROP POLICY IF EXISTS "Authenticated users with admin/gestor can delete their treinamentos" ON public.treinamentos;
DROP POLICY IF EXISTS "Authenticated users with admin/gestor can insert treinamentos" ON public.treinamentos;
DROP POLICY IF EXISTS "Authenticated users with admin/gestor can update their treinamentos" ON public.treinamentos;

-- User permission grants
DROP POLICY IF EXISTS "Only admins can delete permission grants" ON public.user_permission_grants;
DROP POLICY IF EXISTS "Only admins can insert permission grants" ON public.user_permission_grants;
DROP POLICY IF EXISTS "Only admins can update permission grants" ON public.user_permission_grants;
DROP POLICY IF EXISTS "Users can view their own permission grants" ON public.user_permission_grants;

-- User permissions
DROP POLICY IF EXISTS "Only admins can delete permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Only admins can insert permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Only admins can update permissions" ON public.user_permissions;

-- ==========================================
-- 3. GARANTE QUE USUARIO_ID EXISTE NAS TABELAS PRINCIPAIS
-- ==========================================

-- LEADS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'usuario_id'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN usuario_id UUID;
    UPDATE public.leads SET usuario_id = '00000000-0000-0000-0000-000000000000' WHERE usuario_id IS NULL;
    ALTER TABLE public.leads ALTER COLUMN usuario_id SET NOT NULL;
  END IF;
END $$;

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

-- ==========================================
-- 4. CRIA ÍNDICES PARA PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS leads_usuario_id_idx ON public.leads (usuario_id);
CREATE INDEX IF NOT EXISTS clientes_usuario_id_idx ON public.clientes (usuario_id);

-- ==========================================
-- 5. RECRIA POLICIES SIMPLES PARA links_uteis
-- ==========================================

CREATE POLICY "Authenticated users can view own links_uteis"
  ON public.links_uteis FOR SELECT
  USING (auth.role() = 'authenticated' AND usuario_id = auth.uid());

CREATE POLICY "Authenticated users can insert own links_uteis"
  ON public.links_uteis FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND usuario_id = auth.uid());

CREATE POLICY "Authenticated users can update own links_uteis"
  ON public.links_uteis FOR UPDATE
  USING (auth.role() = 'authenticated' AND usuario_id = auth.uid());

CREATE POLICY "Authenticated users can delete own links_uteis"
  ON public.links_uteis FOR DELETE
  USING (auth.role() = 'authenticated' AND usuario_id = auth.uid());

-- ==========================================
-- 6. RECRIA POLICIES SIMPLES PARA materiais_consultores
-- ==========================================

CREATE POLICY "Authenticated users can view own materiais_consultores"
  ON public.materiais_consultores FOR SELECT
  USING (auth.role() = 'authenticated' AND usuario_id = auth.uid());

CREATE POLICY "Authenticated users can insert own materiais_consultores"
  ON public.materiais_consultores FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND usuario_id = auth.uid());

CREATE POLICY "Authenticated users can update own materiais_consultores"
  ON public.materiais_consultores FOR UPDATE
  USING (auth.role() = 'authenticated' AND usuario_id = auth.uid());

CREATE POLICY "Authenticated users can delete own materiais_consultores"
  ON public.materiais_consultores FOR DELETE
  USING (auth.role() = 'authenticated' AND usuario_id = auth.uid());
