-- ============================================================================
-- ROTEIRO DE TESTES DE SEGURANÇA RLS E ISOLAMENTO DE USUÁRIOS
-- Projeto: consorcio-crm-premium (Sistema Operacional do Consultor)
-- Data: 2026-11-10
--
-- PARTE A: Consultas de catálogo (não exigem autenticação de usuário específico)
--          Executáveis diretamente no SQL Editor do Supabase Studio.
--
-- PARTE B: Testes de isolamento reais (exigem autenticação como usuário de teste)
--          Substitua os UUIDs por usuários de teste reais em auth.users/profiles.
--          Cada teste assume sessão autenticada como o usuário indicado.
--
-- Não modifica dados reais. Usa transações controladas (ROLLBACK).
-- ============================================================================

\set admin_id '00000000-0000-0000-0000-000000000001'
\set gestor_pleno_id '00000000-0000-0000-0000-000000000002'
\set gestor_id '00000000-0000-0000-0000-000000000003'
\set consultor_a_id '00000000-0000-0000-0000-000000000010'
\set consultor_b_id '00000000-0000-0000-0000-000000000011'
\set consultor_pleno_id '00000000-0000-0000-0000-000000000020'
\set indicador_id '00000000-0000-0000-0000-000000000030'
\set secretaria_id '00000000-0000-0000-0000-000000000040'

-- ============================================================================
-- PARTE A — CONSULTAS DE CATÁLOGO
-- ============================================================================

-- --------------------------------------------------------------------------
-- A1. Inventário de tabelas tratadas pelas migrations
-- --------------------------------------------------------------------------
SELECT
  t.table_name,
  c.relrowsecurity AS rls_ativo,
  c.relforcerowsecurity AS force_rls
FROM information_schema.tables t
LEFT JOIN pg_class c ON c.relname = t.table_name AND c.relnamespace = 'public'::regnamespace
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'profiles', 'clientes', 'leads', 'indicadores', 'agenda_eventos', 'negociacoes',
    'cobrancas', 'pos_venda', 'recrutamento', 'parceiros', 'comissoes_indicadores',
    'metas', 'user_permission_grants', 'user_evolution_history',
    'contatos_indicados', 'cliente_contatos', 'cliente_historico',
    'negociacao_historico', 'anexos', 'whatsapp_mensagens', 'assembleias',
    'assembleia_avisos', 'assembleia_historico', 'loteria_federal', 'lances',
    'contemplacoes', 'contemplacao_historico', 'materiais_consultores',
    'treinamentos', 'links_uteis', 'comunicacoes', 'comunicacao_templates',
    'indicador_historico', 'cobranca_historico', 'lead_historico', 'lead_anexos',
    'agenda_tarefas', 'agenda_followups', 'pos_venda_historico',
    'pos_venda_tarefas', 'pos_venda_comunicacoes', 'propostas', 'proposta_eventos',
    'proposta_followups', 'creditos_investimento', 'credito_historico',
    'credito_tarefas', 'credito_reunioes', 'credito_mensagens_registradas',
    'creditos_simulacoes', 'pastas', 'pasta_itens', 'prospeccao_historico',
    'ticker_messages', 'playbooks_atendimento', 'playbook_mensagens',
    'permission_presets', 'permission_preset_items', 'audit_log',
    'usuario_status'
  )
ORDER BY t.table_name;

-- --------------------------------------------------------------------------
-- A2. Policies existentes por tabela (identificar permissivas perigosas)
-- --------------------------------------------------------------------------
SELECT
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- --------------------------------------------------------------------------
-- A3. Verificar políticas perigosas restantes (USING (true) ou WITH CHECK (true))
-- --------------------------------------------------------------------------
SELECT
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual ILIKE '%true%' OR
    with_check ILIKE '%true%'
  )
ORDER BY tablename, policyname;

-- --------------------------------------------------------------------------
-- A4. Privilégios concedidos ao role 'anon' (risco residual)
-- --------------------------------------------------------------------------
SELECT
  grantee,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee = 'anon'
ORDER BY table_name, privilege_type;

-- --------------------------------------------------------------------------
-- A5. Funções SECURITY DEFINER e search_path
-- --------------------------------------------------------------------------
SELECT
  routine_name,
  routine_type,
  security_definer
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_admin_safe', 'is_gestor_da_equipe', 'can_assign_profile',
    'can_promote_to', 'get_team_members', 'is_gestor_of_direct',
    'handle_new_user', 'profiles_protect_role_change',
    'prohibit_usuario_id_change', 'validate_admin_insert'
  )
ORDER BY routine_name;

-- --------------------------------------------------------------------------
-- A6. Triggers aplicados em tabelas comerciais
-- --------------------------------------------------------------------------
SELECT
  tgname AS trigger_name,
  tgrelid::regclass AS tabela,
  tgenabled AS habilitado
FROM pg_trigger
WHERE tgname IN ('trg_prohibit_usuario_id_change', 'trg_validate_admin_insert')
  AND NOT tgisinternal
ORDER BY tgrelid::regclass::text, tgname;

-- --------------------------------------------------------------------------
-- A7. CHECK constraint de profiles (10 cargos oficiais)
-- --------------------------------------------------------------------------
SELECT
  conname,
  pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
  AND contype = 'c';

-- --------------------------------------------------------------------------
-- A8. Tabela audit_log (existência e RLS)
-- --------------------------------------------------------------------------
SELECT
  to_regclass('public.audit_log') AS tabela_existe,
  c.relrowsecurity AS rls_ativo
FROM pg_class c
WHERE c.relname = 'audit_log'
  AND c.relnamespace = 'public'::regnamespace;

-- --------------------------------------------------------------------------
-- A9. Policies de audit_log (imutabilidade)
-- --------------------------------------------------------------------------
SELECT
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'audit_log'
ORDER BY policyname;

-- ============================================================================
-- PARTE B — TESTES DE ISOLAMENTO REAL
-- Exigem sessão autenticada como o usuário de teste indicado.
-- Substitua os \set acima por UUIDs reais antes de executar.
-- ============================================================================

-- --------------------------------------------------------------------------
-- B1. Consultor A não acessa registros privados do Consultor B
-- Sessão: consultor_a_id | Esperado: 0 linhas
-- --------------------------------------------------------------------------
BEGIN;
SELECT count(*) AS creditos_visiveis_consultor_b
FROM public.creditos_investimento
WHERE usuario_id = :'consultor_b_id';
ROLLBACK;

-- --------------------------------------------------------------------------
-- B2. Consultor não altera registros de outro consultor
-- Sessão: consultor_a_id | Esperado: erro RLS / 0 linhas afetadas
-- --------------------------------------------------------------------------
BEGIN;
UPDATE public.creditos_investimento
SET observacoes = 'tentativa de adulteracao'
WHERE usuario_id = :'consultor_b_id';
ROLLBACK;

-- --------------------------------------------------------------------------
-- B3. Consultor não exclui registros de outro consultor
-- Sessão: consultor_a_id | Esperado: erro RLS / 0 linhas afetadas
-- --------------------------------------------------------------------------
BEGIN;
DELETE FROM public.creditos_investimento
WHERE usuario_id = :'consultor_b_id';
ROLLBACK;

-- --------------------------------------------------------------------------
-- B4. Gestor acessa apenas equipe autorizada
-- Sessão: gestor_id | Esperado: vê equipe, não vê fora da equipe
-- --------------------------------------------------------------------------
BEGIN;
SELECT count(*) AS creditos_da_equipe
FROM public.creditos_investimento ci
JOIN public.profiles p ON ci.usuario_id = p.id
WHERE p.gestor_id = :'gestor_id';

SELECT count(*) AS creditos_fora_equipe
FROM public.creditos_investimento
WHERE usuario_id NOT IN (
  SELECT id FROM public.profiles WHERE gestor_id = :'gestor_id'
);
ROLLBACK;

-- --------------------------------------------------------------------------
-- B5. Gestor Pleno não pode excluir usuários nem promover para admin
-- Sessão: gestor_pleno_id | Esperado: erro RLS
-- --------------------------------------------------------------------------
BEGIN;
DELETE FROM public.user_permission_grants
WHERE usuario_id = :'consultor_a_id';

UPDATE public.profiles
SET perfil = 'Administrador'
WHERE id = :'consultor_a_id';
ROLLBACK;

-- --------------------------------------------------------------------------
-- B6. Consultor Pleno não acessa carteiras de outros consultores
-- Sessão: consultor_pleno_id | Esperado: 0 linhas
-- --------------------------------------------------------------------------
BEGIN;
SELECT count(*) AS creditos_outros_consultores
FROM public.creditos_investimento
WHERE usuario_id <> :'consultor_pleno_id';
ROLLBACK;

-- --------------------------------------------------------------------------
-- B7. Indicador não acessa informações financeiras restritas
-- Sessão: indicador_id | Esperado: 0 linhas / erro RLS
-- --------------------------------------------------------------------------
BEGIN;
SELECT count(*) AS creditos_acessiveis
FROM public.creditos_investimento;

SELECT count(*) AS simulacoes_acessiveis
FROM public.creditos_simulacoes;
ROLLBACK;

-- --------------------------------------------------------------------------
-- B8. Secretaria vê apenas seus próprios registros
-- Sessão: secretaria_id | Esperado: apenas próprios; 0 de outros
-- --------------------------------------------------------------------------
BEGIN;
SELECT count(*) AS creditos_visiveis
FROM public.creditos_investimento
WHERE usuario_id = :'secretaria_id';

SELECT count(*) AS creditos_outros
FROM public.creditos_investimento
WHERE usuario_id <> :'secretaria_id';
ROLLBACK;

-- --------------------------------------------------------------------------
-- B9. Usuário comum não altera próprio cargo para Administrador
-- Sessão: consultor_a_id | Esperado: erro RLS
-- --------------------------------------------------------------------------
BEGIN;
UPDATE public.profiles
SET perfil = 'Administrador'
WHERE id = :'consultor_a_id';
ROLLBACK;

-- --------------------------------------------------------------------------
-- B10. Usuário comum não altera próprio gestor_id
-- Sessão: consultor_a_id | Esperado: erro RLS
-- --------------------------------------------------------------------------
BEGIN;
UPDATE public.profiles
SET gestor_id = :'gestor_id'
WHERE id = :'consultor_a_id';
ROLLBACK;

-- --------------------------------------------------------------------------
-- B11. Usuário sem autoridade não cria permissões indevidas
-- Sessão: consultor_a_id | Esperado: erro RLS
-- --------------------------------------------------------------------------
BEGIN;
INSERT INTO public.user_permission_grants (usuario_id, permissao_id, concedido_por)
SELECT :'consultor_a_id', id, :'consultor_a_id'
FROM public.user_permissions
WHERE codigo = 'usuarios.excluir'
LIMIT 1;
ROLLBACK;

-- --------------------------------------------------------------------------
-- B12. Administrador tem acesso total
-- Sessão: admin_id | Esperado: > 0 linhas
-- --------------------------------------------------------------------------
BEGIN;
SELECT count(*) AS todos_perfis FROM public.profiles;
SELECT count(*) AS todos_creditos FROM public.creditos_investimento;
ROLLBACK;

-- --------------------------------------------------------------------------
-- B13. Verificar funções auxiliares de hierarquia
-- Sessão: admin_id | Esperado: true/false conforme comentário
-- --------------------------------------------------------------------------
SELECT public.can_assign_profile(:'admin_id', 'Consultor') AS admin_pode_criar_consultor;
-- Esperado: true

SELECT public.can_assign_profile(:'consultor_a_id', 'Gestor') AS consultor_nao_pode_criar_gestor;
-- Esperado: false

SELECT public.can_promote_to(:'admin_id', :'consultor_a_id', 'Gestor') AS admin_pode_promover;
-- Esperado: true

SELECT public.can_promote_to(:'consultor_a_id', :'consultor_a_id', 'Gestor') AS nao_pode_auto_promover;
-- Esperado: false

SELECT public.can_promote_to(:'consultor_a_id', :'consultor_b_id', 'Gestor') AS consultor_nao_pode_promover_outro;
-- Esperado: false

-- --------------------------------------------------------------------------
-- B14. Usuário inativo não executa operações administrativas
-- Sessão: (usuário inativo) | Esperado: is_admin_safe() = false
-- --------------------------------------------------------------------------
SELECT public.is_admin_safe() AS admin_inativo_pode_operar;
-- Esperado: false (se o usuário de teste for inativo)

-- --------------------------------------------------------------------------
-- B15. Itens de pastas respeitam autorização da pasta (usuario_id)
-- Sessão: consultor_a_id | Esperado: 0 itens de outros consultores
-- --------------------------------------------------------------------------
BEGIN;
SELECT count(*) AS itens_outros_consultores
FROM public.pasta_itens
WHERE usuario_id <> :'consultor_a_id';
ROLLBACK;

-- --------------------------------------------------------------------------
-- B16. Histórico de prospecção respeita proprietário do registro
-- Sessão: consultor_a_id | Esperado: 0 históricos de outros consultores
-- --------------------------------------------------------------------------
BEGIN;
SELECT count(*) AS historico_outros_consultores
FROM public.prospeccao_historico
WHERE usuario_id <> :'consultor_a_id';
ROLLBACK;

-- --------------------------------------------------------------------------
-- B17. audit_log não permite alterações indevidas
-- Sessão: qualquer usuário autenticado | Esperado: erro RLS
-- --------------------------------------------------------------------------
BEGIN;
UPDATE public.audit_log
SET motivo = 'tentativa de adulteracao'
WHERE id = (SELECT id FROM public.audit_log LIMIT 1);

DELETE FROM public.audit_log
WHERE id = (SELECT id FROM public.audit_log LIMIT 1);
ROLLBACK;

-- --------------------------------------------------------------------------
-- B18. ticker_messages não acessível por anon (privilégios revogados)
-- Esta consulta deve ser executada como role anon (sem JWT) ou
-- verificar que não existem grants para anon na tabela.
-- Verificação de catálogo (PARTE A, A4) já cobre isso.
-- --------------------------------------------------------------------------

-- ============================================================================
-- FIM DO ROTEIRO
-- ============================================================================
