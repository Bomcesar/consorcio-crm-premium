-- ============================================================
-- PRE-VOO: conferencias de leitura ANTES de aplicar qualquer
-- migration em producao. Nao altera dados.
-- Execute no SQL Editor do Supabase, como dono do projeto.
-- ============================================================

-- 1. Valores de perfil existentes.
--    20261110000000 revalida profiles_perfil_check contra exatamente
--    estes dez valores: Administrador, Gestor Pleno, Gestor,
--    Consultor Pleno, Consultor, Consultores em previa, Lider em
--    treinamento, Indicador, Trainee, Secretaria.
--    Qualquer linha fora da lista faz o VALIDATE CONSTRAINT falhar.
SELECT perfil, count(*) AS total
FROM public.profiles
GROUP BY perfil
ORDER BY total DESC;

-- 2. Restrição de cargo já existente (será substituída).
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
  AND contype = 'c';

-- 3. Funções auxiliares que as novas policies utilizam.
--    Devem passar a existir após 20261108000012/000013/20261110000000.
SELECT proname
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'is_admin_safe', 'is_gestor_da_equipe', 'is_admin_perfil',
    'is_gestor_ou_admin_perfil', 'can_assign_profile', 'can_promote_to',
    'get_team_members', 'is_gestor_of_direct'
  )
ORDER BY proname;

-- 4. Objetos que algumas migrations criam com IF NOT EXISTS.
--    Serve para saber o que já existe e evitar surpresa.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'pessoas', 'jornadas', 'jornada_historico', 'jornada_reunioes',
    'creditos_investimento', 'playbooks_atendimento'
  )
ORDER BY table_name;

-- 5. Coluna leads.tags (adicionada pelo pacote 1).
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'leads'
  AND column_name = 'tags';

-- 6. Contagens de linhas antes da aplicacao, para comparar depois.
SELECT 'clientes' AS tabela, count(*) FROM public.clientes
UNION ALL SELECT 'leads', count(*) FROM public.leads
UNION ALL SELECT 'profiles', count(*) FROM public.profiles
UNION ALL SELECT 'negociacoes', count(*) FROM public.negociacoes
UNION ALL SELECT 'comissoes_indicadores', count(*) FROM public.comissoes_indicadores;

-- 7. RLS habilitado (deve ser true em todas as linhas retornadas).
SELECT relname, relrowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
  AND relrowsecurity = false
ORDER BY relname;