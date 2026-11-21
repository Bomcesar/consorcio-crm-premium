-- Migration: 20261121000003_fix_policies_inline_profiles_funcoes.sql
-- Objetivo: corrigir a CAUSA ESTRUTURAL das policies que consultam `profiles`
-- diretamente (subquery inline). Essas subqueries, embora hoje não gerem
-- recursão (as policies de profiles usam apenas funções SECURITY DEFINER),
-- representam risco estrutural de recursão 42P17 e avaliam RLS aninhada.
--
-- Esta migration substitui, ONDE A EQUIVALÊNCIA ESTÁ COMPROVADA, as subqueries
-- inline por funções auxiliares SECURITY DEFINER (bypassam RLS):
--   * (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
--             AND profiles.perfil = 'Administrador'))
--       => public.is_admin_perfil()
--   * (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
--             AND profiles.perfil IN ('Administrador','Gestor')))
--       => public.is_gestor_ou_admin_perfil()
--
-- Prova de equivalência: a única linha de `profiles` pertinente/visível ao
-- chamador é a própria linha (profiles.id = auth.uid()), pois a condição do
-- sub-select exige profiles.id = auth.uid(). Logo, o valor booleano é idêntico
-- ao de SELECT ... FROM profiles WHERE id = auth.uid() [AND perfil ...].
-- Nenhuma permissão é ampliada ou reduzida; o comportamento é preservado.
--
-- São preservadas intactas as policies de semântica DIFERENTE:
--   * "X: admin pode inserir para terceiro" (WITH CHECK is_admin_safe() AND
--     EXISTS(SELECT 1 FROM profiles p WHERE p.id = X.usuario_id AND p.ativo))
--   * "Gestors can view team metas" (hierarchy via metas.usuario_id/gestor_id)
--   * Demais policies que já usam is_admin_safe()/is_gestor_da_equipe().

BEGIN;

-- Garante que pg_get_expr qualifique auth.uid() como "auth.uid()" (e não "uid()")
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