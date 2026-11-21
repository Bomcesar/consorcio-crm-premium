-- ============================================================================
-- HARNESS EXECUTAVEL DE TESTES DE SEGURANCA RLS (B1-B18)
--
-- Diferente de TESTES_SEGURANCA_RLS.sql (documentacao com UUIDs placeholder),
-- este arquivo e EXECUTAVEL de ponta a ponta e reproduzivel:
--   * Pre-cleanup idempotente (remove usuarios de teste residuais);
--   * Cria 8 usuarios reais em auth.users (o gatilho handle_new_user cria o
--     profile como 'Indicador'; depois ajustados para os 10 cargos via service_role);
--   * Cada teste roda em uma transacao (BEGIN; DO $$...; ROLLBACK;) usando
--     sessao autenticada SIMULADA via request.jwt.claims + SET LOCAL ROLE,
--     de modo que as policies RLS sao exercitadas de verdade;
--   * Seeds e mudancas de estado sao desfeitos pelo ROLLBACK (nao altera dados reais);
--   * Cada teste emite um veredito autoexplicativo e independente de ordem:
--       NOTICE:  VERDICT|Bxx|... => PASS|FAIL
--   * Cleanup final remove os usuarios de teste (cascade), preservando o DB.
--
-- COMO EXECUTAR (PowerShell):
--   Get-Content -Raw supabase\TESTES_SEGURANCA_RLS_EXECUTAVEL.sql |
--     docker exec -i supabase_db_consorcio-crm-premium `
--       psql -U supabase_admin -d postgres -f -
--
-- Resultado esperado: todos os VERDICT|Bxx| => PASS e, ao final, apenas o(s)
-- usuario(s) real(is) permanecem em public.profiles.
--
-- IMPORTANTE: psql \set ON_ERROR_STOP 0 pois varios testes ESPERAM erros de
-- RLS/trigger (o erro e o resultado esperado). O veredito distingue
-- "bloqueado" (0 linhas ou excecao) de "permitido" (linhas alteradas).
-- ============================================================================
\set ON_ERROR_STOP 0
\pset pager off

\echo '=== PRECLEAN: removendo usuarios de teste residuais ==='
BEGIN;
SELECT set_config('request.jwt.claims','{"role":"service_role"}', true);
-- Excluir subordinados ANTES do gestor (evita SET NULL em perfil sendo excluido,
-- que dispararia trg_record_user_evolution -> validate_admin_insert sobre um
-- profile que esta sendo removido).
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000010';
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000011';
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000020';
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000030';
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000040';
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000003';
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000002';
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000001';
COMMIT;

\echo '=== SETUP: criando 8 usuarios de teste ==='
BEGIN;
INSERT INTO auth.users (id, email, instance_id, aud, role, created_at, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000001','rls_admin@local.test',      '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), now()),
 ('00000000-0000-0000-0000-000000000002','rls_gestorpleno@local.test','00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), now()),
 ('00000000-0000-0000-0000-000000000003','rls_gestor@local.test',     '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), now()),
 ('00000000-0000-0000-0000-000000000010','rls_consultor_a@local.test','00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), now()),
 ('00000000-0000-0000-0000-000000000011','rls_consultor_b@local.test','00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), now()),
 ('00000000-0000-0000-0000-000000000020','rls_consultorpleno@local.test','00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), now()),
 ('00000000-0000-0000-0000-000000000030','rls_indicador@local.test',  '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), now()),
 ('00000000-0000-0000-0000-000000000040','rls_secretaria@local.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), now());
SELECT set_config('request.jwt.claims','{"role":"service_role"}', true);
UPDATE public.profiles SET perfil='Administrador', nome='RLS Admin'        WHERE id='00000000-0000-0000-0000-000000000001';
UPDATE public.profiles SET perfil='Gestor Pleno',  nome='RLS Gestor Pleno' WHERE id='00000000-0000-0000-0000-000000000002';
UPDATE public.profiles SET perfil='Gestor',        nome='RLS Gestor'       WHERE id='00000000-0000-0000-0000-000000000003';
UPDATE public.profiles SET perfil='Consultor',       gestor_id='00000000-0000-0000-0000-000000000003', nome='RLS Consultor A' WHERE id='00000000-0000-0000-0000-000000000010';
UPDATE public.profiles SET perfil='Consultor',       gestor_id='00000000-0000-0000-0000-000000000003', nome='RLS Consultor B' WHERE id='00000000-0000-0000-0000-000000000011';
UPDATE public.profiles SET perfil='Consultor Pleno', gestor_id='00000000-0000-0000-0000-000000000003', nome='RLS Consultor Pleno' WHERE id='00000000-0000-0000-0000-000000000020';
UPDATE public.profiles SET perfil='Indicador',       gestor_id='00000000-0000-0000-0000-000000000003', nome='RLS Indicador' WHERE id='00000000-0000-0000-0000-000000000030';
UPDATE public.profiles SET perfil='Secretaria',      gestor_id='00000000-0000-0000-0000-000000000003', nome='RLS Secretaria' WHERE id='00000000-0000-0000-0000-000000000040';
COMMIT;

\echo ''
\echo '=== PARTE A: CATALOGO ==='
\echo '--- A1: tabelas com RLS (esperado com_rls = total) ---'
SELECT count(*) AS total, count(*) FILTER (WHERE c.relrowsecurity) AS com_rls
FROM information_schema.tables t JOIN pg_class c ON c.relname=t.table_name AND c.relnamespace='public'::regnamespace
WHERE t.table_schema='public' AND t.table_name IN ('profiles','clientes','leads','creditos_investimento','pasta_itens','prospeccao_historico','audit_log','user_permission_grants','user_permissions','creditos_simulacoes');
\echo '--- A3: policies perigosas com USING/WITH CHECK = true (esperado: 0) ---'
SELECT count(*) AS policies_true FROM pg_policies
WHERE schemaname='public' AND (qual ~ '^\s*true\s*$' OR with_check ~ '^\s*true\s*$');
\echo '--- A4: grants de anon em ticker_messages (esperado: 0) ---'
SELECT count(*) AS anon_ticker_grants FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name='ticker_messages' AND grantee='anon';
\echo '--- A7: CHECK de profiles ---'
SELECT pg_get_constraintdef(oid) AS definicao FROM pg_constraint WHERE conrelid='public.profiles'::regclass AND contype='c';
\echo '--- A9: policies de audit_log (UPDATE/DELETE devem ser false) ---'
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname='public' AND tablename='audit_log' ORDER BY policyname;

\echo ''
\echo '=== PARTE B: TESTES B1-B18 (veredito em NOTICE VERDICT|Bxx|) ==='

\echo '--- B1: consultor_a ve creditos de consultor_b (esp 0/0) ---'
BEGIN;
DO $t$ DECLARE v int; v2 int;
BEGIN
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}', true);
  INSERT INTO public.creditos_investimento (usuario_id,nome,telefone) VALUES ('00000000-0000-0000-0000-000000000011','Cliente B','1');
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000010","role":"authenticated"}', true);
  SELECT count(*) INTO v FROM public.creditos_investimento WHERE usuario_id='00000000-0000-0000-0000-000000000011';
  SELECT count(*) INTO v2 FROM public.creditos_investimento;
  EXECUTE 'RESET ROLE';
  RAISE NOTICE 'VERDICT|B1|de_b=% total=% => %', v, v2, CASE WHEN v=0 AND v2=0 THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN others THEN RAISE NOTICE 'VERDICT|B1|ERR %', SQLERRM; END $t$;
ROLLBACK;

\echo '--- B2: consultor_a adultera credito de consultor_b (esp UPDATE 0, intacto) ---'
BEGIN;
DO $t$ DECLARE r int:=0; e text:=null; ad int; tot int;
BEGIN
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}', true);
  INSERT INTO public.creditos_investimento (usuario_id,nome,telefone) VALUES ('00000000-0000-0000-0000-000000000011','Cliente B','1');
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000010","role":"authenticated"}', true);
  BEGIN
    UPDATE public.creditos_investimento SET observacoes='adulterado' WHERE usuario_id='00000000-0000-0000-0000-000000000011';
    GET DIAGNOSTICS r = ROW_COUNT;
  EXCEPTION WHEN others THEN e := SQLERRM; END;
  EXECUTE 'RESET ROLE';
  SELECT count(*) FILTER (WHERE observacoes='adulterado'), count(*) INTO ad, tot FROM public.creditos_investimento WHERE usuario_id='00000000-0000-0000-0000-000000000011';
  RAISE NOTICE 'VERDICT|B2|rows=% err=% adulterado=% total=% => %', r, coalesce(e,'nil'), ad, tot, CASE WHEN r=0 AND ad=0 AND tot=1 THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN others THEN RAISE NOTICE 'VERDICT|B2|ERR %', SQLERRM; END $t$;
ROLLBACK;

\echo '--- B3: consultor_a exclui credito de consultor_b (esp DELETE 0, remanescente) ---'
BEGIN;
DO $t$ DECLARE r int:=0; e text:=null; tot int;
BEGIN
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}', true);
  INSERT INTO public.creditos_investimento (usuario_id,nome,telefone) VALUES ('00000000-0000-0000-0000-000000000011','Cliente B','1');
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000010","role":"authenticated"}', true);
  BEGIN
    DELETE FROM public.creditos_investimento WHERE usuario_id='00000000-0000-0000-0000-000000000011';
    GET DIAGNOSTICS r = ROW_COUNT;
  EXCEPTION WHEN others THEN e := SQLERRM; END;
  EXECUTE 'RESET ROLE';
  SELECT count(*) INTO tot FROM public.creditos_investimento WHERE usuario_id='00000000-0000-0000-0000-000000000011';
  RAISE NOTICE 'VERDICT|B3|rows=% err=% remanescente=% => %', r, coalesce(e,'nil'), tot, CASE WHEN r=0 AND tot=1 THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN others THEN RAISE NOTICE 'VERDICT|B3|ERR %', SQLERRM; END $t$;
ROLLBACK;

\echo '--- B4: gestor ve equipe, nao ve fora (esp fora=0, total=equipe) ---'
BEGIN;
DO $t$ DECLARE eq int; fora int; tot int;
BEGIN
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}', true);
  INSERT INTO public.creditos_investimento (usuario_id,nome,telefone) VALUES
   ('00000000-0000-0000-0000-000000000011','Cliente B','1'),
   ('00000000-0000-0000-0000-000000000001','Cliente Admin','2');
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
  SELECT count(*) INTO eq FROM public.creditos_investimento ci JOIN public.profiles p ON ci.usuario_id=p.id WHERE p.gestor_id='00000000-0000-0000-0000-000000000003';
  SELECT count(*) INTO fora FROM public.creditos_investimento WHERE usuario_id NOT IN (SELECT id FROM public.profiles WHERE gestor_id='00000000-0000-0000-0000-000000000003');
  SELECT count(*) INTO tot FROM public.creditos_investimento;
  EXECUTE 'RESET ROLE';
  RAISE NOTICE 'VERDICT|B4|equipe=% fora=% total=% => %', eq, fora, tot, CASE WHEN eq=1 AND fora=0 AND tot=eq THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN others THEN RAISE NOTICE 'VERDICT|B4|ERR %', SQLERRM; END $t$;
ROLLBACK;

\echo '--- B5a: gestor_pleno exclui grant de consultor_a (esp 0, remanescente) ---'
BEGIN;
DO $t$ DECLARE r int:=0; e text:=null; tot int;
BEGIN
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}', true);
  INSERT INTO public.user_permission_grants (usuario_id,permissao_id,concedido_por,concedido_em) VALUES ('00000000-0000-0000-0000-000000000010','27fcaef3-a7f5-4ddf-ba98-c2eaf3f663a8','00000000-0000-0000-0000-000000000001', now());
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
  BEGIN
    DELETE FROM public.user_permission_grants WHERE usuario_id='00000000-0000-0000-0000-000000000010';
    GET DIAGNOSTICS r = ROW_COUNT;
  EXCEPTION WHEN others THEN e := SQLERRM; END;
  EXECUTE 'RESET ROLE';
  SELECT count(*) INTO tot FROM public.user_permission_grants WHERE usuario_id='00000000-0000-0000-0000-000000000010';
  RAISE NOTICE 'VERDICT|B5a|rows=% err=% remanescente=% => %', r, coalesce(e,'nil'), tot, CASE WHEN r=0 AND tot=1 THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN others THEN RAISE NOTICE 'VERDICT|B5a|ERR %', SQLERRM; END $t$;
ROLLBACK;

\echo '--- B5b: gestor_pleno promove consultor_a a Administrador (esp bloqueado) ---'
BEGIN;
DO $t$ DECLARE r int:=0; e text:=null; pf text;
BEGIN
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
  BEGIN
    UPDATE public.profiles SET perfil='Administrador' WHERE id='00000000-0000-0000-0000-000000000010';
    GET DIAGNOSTICS r = ROW_COUNT;
  EXCEPTION WHEN others THEN e := SQLERRM; END;
  EXECUTE 'RESET ROLE';
  SELECT perfil INTO pf FROM public.profiles WHERE id='00000000-0000-0000-0000-000000000010';
  RAISE NOTICE 'VERDICT|B5b|rows=% err=% perfil_consultor_a=% => %', r, coalesce(e,'nil'), pf, CASE WHEN r=0 AND pf='Consultor' THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN others THEN RAISE NOTICE 'VERDICT|B5b|ERR %', SQLERRM; END $t$;
ROLLBACK;

\echo '--- B6: consultor_pleno nao ve creditos de outros (esp 0) ---'
BEGIN;
DO $t$ DECLARE outros int; tot int;
BEGIN
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}', true);
  INSERT INTO public.creditos_investimento (usuario_id,nome,telefone) VALUES
   ('00000000-0000-0000-0000-000000000010','Cliente A','1'),
   ('00000000-0000-0000-0000-000000000020','Cliente CP','2');
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000020","role":"authenticated"}', true);
  SELECT count(*) INTO outros FROM public.creditos_investimento WHERE usuario_id<>'00000000-0000-0000-0000-000000000020';
  SELECT count(*) INTO tot FROM public.creditos_investimento;
  EXECUTE 'RESET ROLE';
  RAISE NOTICE 'VERDICT|B6|outros=% total=% => %', outros, tot, CASE WHEN outros=0 AND tot=1 THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN others THEN RAISE NOTICE 'VERDICT|B6|ERR %', SQLERRM; END $t$;
ROLLBACK;

\echo '--- B7: indicador nao ve creditos nem simulacoes (esp 0/0) ---'
BEGIN;
DO $t$ DECLARE cr int; si int;
BEGIN
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}', true);
  INSERT INTO public.creditos_investimento (id,usuario_id,nome,telefone) VALUES ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000010','Cliente A','1');
  INSERT INTO public.creditos_simulacoes (credito_id,usuario_id,valor) VALUES ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000010',1000);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000030","role":"authenticated"}', true);
  SELECT count(*) INTO cr FROM public.creditos_investimento;
  SELECT count(*) INTO si FROM public.creditos_simulacoes;
  EXECUTE 'RESET ROLE';
  RAISE NOTICE 'VERDICT|B7|creditos=% simulacoes=% => %', cr, si, CASE WHEN cr=0 AND si=0 THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN others THEN RAISE NOTICE 'VERDICT|B7|ERR %', SQLERRM; END $t$;
ROLLBACK;

\echo '--- B8: secretaria ve so proprios (esp proprio=1, outros=0) ---'
BEGIN;
DO $t$ DECLARE pr int; ou int; tot int;
BEGIN
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}', true);
  INSERT INTO public.creditos_investimento (usuario_id,nome,telefone) VALUES
   ('00000000-0000-0000-0000-000000000010','Cliente A','1'),
   ('00000000-0000-0000-0000-000000000040','Cliente SEC','2');
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000040","role":"authenticated"}', true);
  SELECT count(*) INTO pr FROM public.creditos_investimento WHERE usuario_id='00000000-0000-0000-0000-000000000040';
  SELECT count(*) INTO ou FROM public.creditos_investimento WHERE usuario_id<>'00000000-0000-0000-0000-000000000040';
  SELECT count(*) INTO tot FROM public.creditos_investimento;
  EXECUTE 'RESET ROLE';
  RAISE NOTICE 'VERDICT|B8|proprio=% outros=% total=% => %', pr, ou, tot, CASE WHEN pr=1 AND ou=0 AND tot=1 THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN others THEN RAISE NOTICE 'VERDICT|B8|ERR %', SQLERRM; END $t$;
ROLLBACK;

\echo '--- B9: consultor nao muda proprio perfil p/ Admin (esp bloqueado) ---'
BEGIN;
DO $t$ DECLARE r int:=0; e text:=null; pf text;
BEGIN
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000010","role":"authenticated"}', true);
  BEGIN
    UPDATE public.profiles SET perfil='Administrador' WHERE id='00000000-0000-0000-0000-000000000010';
    GET DIAGNOSTICS r = ROW_COUNT;
  EXCEPTION WHEN others THEN e := SQLERRM; END;
  EXECUTE 'RESET ROLE';
  SELECT perfil INTO pf FROM public.profiles WHERE id='00000000-0000-0000-0000-000000000010';
  RAISE NOTICE 'VERDICT|B9|rows=% err=% perfil=% => %', r, coalesce(e,'nil'), pf, CASE WHEN r=0 AND e IS NOT NULL AND pf='Consultor' THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN others THEN RAISE NOTICE 'VERDICT|B9|ERR %', SQLERRM; END $t$;
ROLLBACK;

\echo '--- B10: consultor nao muda proprio gestor_id (esp bloqueado) ---'
BEGIN;
DO $t$ DECLARE r int:=0; e text:=null; g uuid;
BEGIN
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000010","role":"authenticated"}', true);
  BEGIN
    UPDATE public.profiles SET gestor_id='00000000-0000-0000-0000-000000000002' WHERE id='00000000-0000-0000-0000-000000000010';
    GET DIAGNOSTICS r = ROW_COUNT;
  EXCEPTION WHEN others THEN e := SQLERRM; END;
  EXECUTE 'RESET ROLE';
  SELECT gestor_id INTO g FROM public.profiles WHERE id='00000000-0000-0000-0000-000000000010';
  RAISE NOTICE 'VERDICT|B10|rows=% err=% gestor_ainda_G=% => %', r, coalesce(e,'nil'), (g='00000000-0000-0000-0000-000000000003'), CASE WHEN r=0 AND e IS NOT NULL AND g='00000000-0000-0000-0000-000000000003' THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN others THEN RAISE NOTICE 'VERDICT|B10|ERR %', SQLERRM; END $t$;
ROLLBACK;

\echo '--- B11: consultor nao cria permissao indevida (esp bloqueado RLS) ---'
BEGIN;
DO $t$ DECLARE r int:=0; e text:=null; tot int;
BEGIN
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000010","role":"authenticated"}', true);
  BEGIN
    INSERT INTO public.user_permission_grants (usuario_id,permissao_id,concedido_por,concedido_em)
      SELECT '00000000-0000-0000-0000-000000000010', id, '00000000-0000-0000-0000-000000000010', now() FROM public.user_permissions WHERE codigo='usuarios.excluir' LIMIT 1;
    GET DIAGNOSTICS r = ROW_COUNT;
  EXCEPTION WHEN others THEN e := SQLERRM; END;
  EXECUTE 'RESET ROLE';
  SELECT count(*) INTO tot FROM public.user_permission_grants WHERE usuario_id='00000000-0000-0000-0000-000000000010';
  RAISE NOTICE 'VERDICT|B11|rows=% err=% grants_existentes=% => %', r, coalesce(e,'nil'), tot, CASE WHEN r=0 AND tot=0 THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN others THEN RAISE NOTICE 'VERDICT|B11|ERR %', SQLERRM; END $t$;
ROLLBACK;

\echo '--- B12: administrador ve tudo (esp perfis>0 e creditos>=1) ---'
BEGIN;
DO $t$ DECLARE pf int; cr int;
BEGIN
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}', true);
  INSERT INTO public.creditos_investimento (usuario_id,nome,telefone) VALUES ('00000000-0000-0000-0000-000000000011','Cliente B','1');
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  SELECT count(*) INTO pf FROM public.profiles;
  SELECT count(*) INTO cr FROM public.creditos_investimento;
  EXECUTE 'RESET ROLE';
  RAISE NOTICE 'VERDICT|B12|perfis=% creditos=% => %', pf, cr, CASE WHEN pf>0 AND cr>=1 THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN others THEN RAISE NOTICE 'VERDICT|B12|ERR %', SQLERRM; END $t$;
ROLLBACK;

\echo '--- B13: funcoes de hierarquia ---'
BEGIN;
DO $t$ DECLARE a1 bool; a2 bool; p1 bool; p2 bool; p3 bool;
BEGIN
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  a1 := public.can_assign_profile('00000000-0000-0000-0000-000000000001','Consultor');
  a2 := public.can_assign_profile('00000000-0000-0000-0000-000000000010','Gestor');
  p1 := public.can_promote_to('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','Gestor');
  p2 := public.can_promote_to('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000010','Gestor');
  p3 := public.can_promote_to('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000011','Gestor');
  EXECUTE 'RESET ROLE';
  RAISE NOTICE 'VERDICT|B13|admin_cria=% consultor_cria_gestor=% admin_promove=% nao_auto=% consultor_nao_promove=% => %', a1,a2,p1,p2,p3, CASE WHEN a1 AND NOT a2 AND p1 AND NOT p2 AND NOT p3 THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN others THEN RAISE NOTICE 'VERDICT|B13|ERR %', SQLERRM; END $t$;
ROLLBACK;

\echo '--- B14: admin inativo => is_admin_safe()=false ---'
BEGIN;
DO $t$ DECLARE safe bool;
BEGIN
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}', true);
  UPDATE public.profiles SET ativo=false WHERE id='00000000-0000-0000-0000-000000000001';
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  safe := public.is_admin_safe();
  EXECUTE 'RESET ROLE';
  RAISE NOTICE 'VERDICT|B14|is_admin_safe=% => %', safe, CASE WHEN safe=false THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN others THEN RAISE NOTICE 'VERDICT|B14|ERR %', SQLERRM; END $t$;
ROLLBACK;

\echo '--- B15: itens de pasta respeitam usuario_id (esp outros=0) ---'
BEGIN;
DO $t$ DECLARE ou int; tot int;
BEGIN
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}', true);
  INSERT INTO public.clientes (usuario_id,nome) VALUES ('00000000-0000-0000-0000-000000000010','Cliente A');
  INSERT INTO public.pastas (usuario_id,nome) VALUES ('00000000-0000-0000-0000-000000000011','Pasta B');
  INSERT INTO public.pasta_itens (pasta_id,cliente_id,usuario_id)
    SELECT p.id, cl.id, '00000000-0000-0000-0000-000000000011' FROM public.pastas p, public.clientes cl
    WHERE p.usuario_id='00000000-0000-0000-0000-000000000011' AND cl.usuario_id='00000000-0000-0000-0000-000000000010';
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000010","role":"authenticated"}', true);
  SELECT count(*) INTO ou FROM public.pasta_itens WHERE usuario_id<>'00000000-0000-0000-0000-000000000010';
  SELECT count(*) INTO tot FROM public.pasta_itens;
  EXECUTE 'RESET ROLE';
  RAISE NOTICE 'VERDICT|B15|outros=% total=% => %', ou, tot, CASE WHEN ou=0 THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN others THEN RAISE NOTICE 'VERDICT|B15|ERR %', SQLERRM; END $t$;
ROLLBACK;

\echo '--- B16: historico de prospeccao respeita usuario_id (esp outros=0) ---'
BEGIN;
DO $t$ DECLARE ou int; tot int;
BEGIN
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}', true);
  INSERT INTO public.clientes (usuario_id,nome) VALUES ('00000000-0000-0000-0000-000000000010','Cliente A');
  INSERT INTO public.pastas (usuario_id,nome) VALUES ('00000000-0000-0000-0000-000000000011','Pasta B');
  INSERT INTO public.pasta_itens (pasta_id,cliente_id,usuario_id)
    SELECT p.id, cl.id, '00000000-0000-0000-0000-000000000011' FROM public.pastas p, public.clientes cl
    WHERE p.usuario_id='00000000-0000-0000-0000-000000000011' AND cl.usuario_id='00000000-0000-0000-0000-000000000010';
  INSERT INTO public.prospeccao_historico (pasta_item_id,tipo,resultado,usuario_id)
    SELECT id,'contato','sem_interesse','00000000-0000-0000-0000-000000000011' FROM public.pasta_itens;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000010","role":"authenticated"}', true);
  SELECT count(*) INTO ou FROM public.prospeccao_historico WHERE usuario_id<>'00000000-0000-0000-0000-000000000010';
  SELECT count(*) INTO tot FROM public.prospeccao_historico;
  EXECUTE 'RESET ROLE';
  RAISE NOTICE 'VERDICT|B16|outros=% total=% => %', ou, tot, CASE WHEN ou=0 THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN others THEN RAISE NOTICE 'VERDICT|B16|ERR %', SQLERRM; END $t$;
ROLLBACK;

\echo '--- B17: audit_log imutavel (esp UPDATE 0, DELETE 0, remanescente=1) ---'
BEGIN;
DO $t$ DECLARE ru int:=0; rd int:=0; e1 text:=null; e2 text:=null; tot int;
BEGIN
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}', true);
  INSERT INTO public.audit_log (tabela,registro_id,acao) VALUES ('creditos_investimento', gen_random_uuid(), 'teste');
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000010","role":"authenticated"}', true);
  BEGIN
    UPDATE public.audit_log SET motivo='adulterado' WHERE id=(SELECT id FROM public.audit_log LIMIT 1);
    GET DIAGNOSTICS ru = ROW_COUNT;
  EXCEPTION WHEN others THEN e1 := SQLERRM; END;
  BEGIN
    DELETE FROM public.audit_log WHERE id=(SELECT id FROM public.audit_log LIMIT 1);
    GET DIAGNOSTICS rd = ROW_COUNT;
  EXCEPTION WHEN others THEN e2 := SQLERRM; END;
  EXECUTE 'RESET ROLE';
  SELECT count(*) INTO tot FROM public.audit_log;
  RAISE NOTICE 'VERDICT|B17|upd=% del=% err1=% err2=% remanescente=% => %', ru, rd, coalesce(e1,'nil'), coalesce(e2,'nil'), tot, CASE WHEN ru=0 AND rd=0 AND tot=1 THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN others THEN RAISE NOTICE 'VERDICT|B17|ERR %', SQLERRM; END $t$;
ROLLBACK;

\echo '--- B18: anon sem acesso a ticker_messages (esp permission denied) ---'
BEGIN;
DO $t$ DECLARE e text:=null; ok bool:=false;
BEGIN
  EXECUTE 'SET LOCAL ROLE anon';
  BEGIN
    PERFORM count(*) FROM public.ticker_messages;
    ok := true;
  EXCEPTION WHEN others THEN e := SQLERRM; END;
  EXECUTE 'RESET ROLE';
  RAISE NOTICE 'VERDICT|B18|anon % => %', coalesce(e,'ACESSOU'), CASE WHEN (not ok) AND e LIKE 'permission denied%' THEN 'PASS' ELSE 'FAIL' END;
EXCEPTION WHEN others THEN RAISE NOTICE 'VERDICT|B18|ERR %', SQLERRM; END $t$;
ROLLBACK;

\echo ''
\echo '=== CLEANUP: removendo usuarios de teste ==='
BEGIN;
SELECT set_config('request.jwt.claims','{"role":"service_role"}', true);
-- Excluir subordinados ANTES do gestor (evita SET NULL em perfil sendo excluido)
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000010';
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000011';
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000020';
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000030';
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000040';
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000003';
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000002';
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000001';
COMMIT;
\echo '--- Perfis restantes (esp apenas teste@local.com) ---'
SELECT id, email, perfil FROM public.profiles ORDER BY email;
\echo '=== FIM ==='